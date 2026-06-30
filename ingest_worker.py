# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import io
import json
import math
import os
import re
import sqlite3
import sys
import time
import unicodedata
import uuid
import zipfile
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator, Sequence
from urllib.parse import urljoin

import requests


EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIMENSIONS = 768
QDRANT_COLLECTION_NAME = "clinical_ground_truth"
QDRANT_UPLOAD_BATCH_SIZE = 100
QDRANT_UPLOAD_WORKERS = 4
QDRANT_UPLOAD_TIMEOUT_SECONDS = 60
QDRANT_UPLOAD_MAX_ATTEMPTS = 3
GEMINI_EMBEDDING_MAX_ATTEMPTS = 5
GEMINI_EMBEDDING_RETRY_BASE_SECONDS = 2.0
GEMINI_EMBEDDING_RETRY_MAX_SECONDS = 30.0
GEMINI_EMBEDDING_BATCH_SIZE = 16
GEMINI_EMBEDDING_REQUEST_DELAY_SECONDS = 1.0
GEMINI_PAID_RATE_LIMIT_WAIT_SECONDS = 75.0
GEMINI_MAX_PAID_RATE_LIMIT_WAITS = 0
REQUEST_TIMEOUT_SECONDS = 90
DEFAULT_CHUNK_SIZE_WORDS = 350
DEFAULT_OVERLAP_WORDS = 50
DEFAULT_MIN_CHUNK_WORDS = 25
GEMINI_EMBEDDING2_TEXT_STANDARD_USD_PER_MILLION_TOKENS = 0.20
DEFAULT_PAID_EMBEDDING_BUDGET_USD = 10.0
TOKEN_ESTIMATE_CHARS_PER_TOKEN = 4.0
INGEST_MANIFEST_FILENAME = ".ingest_manifest.jsonl"
HAS_DATASET_SLUG = "metadonnees-des-publications-de-la-has-1"
BDPM_DATASET_SLUG = "base-de-donnees-publique-des-medicaments-base-officielle"
BDPM_DOWNLOAD_PAGE_FALLBACK = "https://base-donnees-publique.medicaments.gouv.fr/telechargement"


FRENCH_MEDICAL_ACRONYM_MAP = {
    "HTA": "Hypertension Artérielle",
    "IDM": "Infarctus du Myocarde",
    "AVC": "Accident Vasculaire Cérébral",
    "BPCO": "Bronchopneumopathie Chronique Obstructive",
    "AOD": "Anticoagulant Oral Direct",
    "AVK": "Anti-Vitamine K",
    "HBPM": "Héparine de Bas Poids Moléculaire",
    "FeVG": "Fraction d'Éjection du Ventricule Gauche",
    "HAS": "Haute Autorité de Santé",
    "ANSM": "Agence Nationale de Sécurité du Médicament",
    "BDPM": "Base de Données Publique des Médicaments",
    "AINS": "Anti-Inflammatoire Non Stéroïdien",
    "IEC": "Inhibiteur de l'Enzyme de Conversion",
    "ARA2": "Antagoniste des Récepteurs de l'Angiotensine II",
    "ECG": "Électrocardiogramme",
}


WORD_BOUNDARY_LEFT = r"(?<![0-9A-Za-zÀ-ÖØ-öø-ÿ_])"
WORD_BOUNDARY_RIGHT = r"(?![0-9A-Za-zÀ-ÖØ-öø-ÿ_])"


@dataclass(frozen=True)
class SourceRecord:
    text: str
    origin_title: str
    category_silo: str
    source_identifier: str
    regulatory_date: str
    page_number: int


@dataclass(frozen=True)
class TextChunk:
    text_content: str
    origin_title: str
    category_silo: str
    source_identifier: str
    regulatory_date: str
    page_number: int
    chunk_index: int


@dataclass(frozen=True)
class EmbeddedPoint:
    id: str
    vector: list[float]
    payload: dict[str, Any]
    stable_content_key: str
    embedding_provider: str
    estimated_tokens: int
    estimated_paid_cost_usd: float


@dataclass(frozen=True)
class EmbeddingResult:
    vector: list[float]
    provider: str
    estimated_tokens: int
    estimated_paid_cost_usd: float


def log(message: str) -> None:
    print(f"[ingest_worker] {message}", file=sys.stderr, flush=True)


def warn(message: str) -> None:
    print(f"[ingest_worker] warning: {message}", file=sys.stderr, flush=True)


class FrenchMedicalNormalizer:
    def normalize_text(self, text: str) -> str:
        normalized = unicodedata.normalize("NFC", text or "")
        replacements = {
            "\ufb00": "ff",
            "\ufb01": "fi",
            "\ufb02": "fl",
            "\ufb03": "ffi",
            "\ufb04": "ffl",
            "œ": "oe",
            "Œ": "Oe",
            "æ": "ae",
            "Æ": "Ae",
            "\u00a0": " ",
            "\u202f": " ",
            "\u2007": " ",
            "\u2009": " ",
            "\u200b": "",
            "\ufeff": "",
        }
        for source, target in replacements.items():
            normalized = normalized.replace(source, target)

        normalized = normalized.replace("\r\n", "\n").replace("\r", "\n").replace("\f", "\n")
        normalized = re.sub(r"(?<=\w)-[ \t]*\n[ \t]*(?=\w)", "", normalized)
        normalized = re.sub(r"<\s*br\s*/?\s*>", "\n", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"</\s*p\s*>", "\n", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"<[^>]+>", " ", normalized)
        normalized = html.unescape(normalized)
        normalized = re.sub(r"[ \t]+", " ", normalized)
        normalized = re.sub(r" *\n+ *", "\n", normalized)
        normalized = re.sub(r"\n{3,}", "\n\n", normalized)
        normalized = re.sub(r"\s+([,.;:!?])", r"\1", normalized)
        normalized = re.sub(r"([,.;:!?])(?=[^\s)\]}»”])", r"\1 ", normalized)
        normalized = re.sub(r"[ \t]{2,}", " ", normalized)
        return normalized.strip()

    def resolve_acronyms(self, text: str) -> str:
        expanded = text or ""
        for acronym, expansion in FRENCH_MEDICAL_ACRONYM_MAP.items():
            pattern = re.compile(
                rf"{WORD_BOUNDARY_LEFT}{re.escape(acronym)}{WORD_BOUNDARY_RIGHT}(?!\s*\()"
            )
            expanded = pattern.sub(f"{acronym} ({expansion})", expanded)
        return expanded

    def clean(self, text: str) -> str:
        return self.resolve_acronyms(self.normalize_text(text))


class SlidingWindowChunker:
    def __init__(
        self,
        normalizer: FrenchMedicalNormalizer,
        chunk_size_words: int,
        overlap_words: int,
        min_chunk_words: int,
    ) -> None:
        if chunk_size_words <= 0:
            raise ValueError("chunk_size_words must be positive.")
        if overlap_words < 0:
            raise ValueError("overlap_words cannot be negative.")
        if overlap_words >= chunk_size_words:
            raise ValueError("overlap_words must be smaller than chunk_size_words.")
        if min_chunk_words < 0:
            raise ValueError("min_chunk_words cannot be negative.")
        self.normalizer = normalizer
        self.chunk_size_words = chunk_size_words
        self.overlap_words = overlap_words
        self.min_chunk_words = min_chunk_words

    def chunk_record(self, record: SourceRecord) -> Iterator[TextChunk]:
        clean_text = self.normalizer.clean(record.text)
        words = re.findall(r"\S+", clean_text)
        if len(words) < self.min_chunk_words:
            return

        step = self.chunk_size_words - self.overlap_words
        chunk_index = 0
        start = 0
        while start < len(words):
            window = words[start : start + self.chunk_size_words]
            if len(window) < self.min_chunk_words and chunk_index > 0:
                break
            yield TextChunk(
                text_content=" ".join(window),
                origin_title=record.origin_title,
                category_silo=record.category_silo,
                source_identifier=record.source_identifier,
                regulatory_date=record.regulatory_date,
                page_number=record.page_number,
                chunk_index=chunk_index,
            )
            chunk_index += 1
            if start + self.chunk_size_words >= len(words):
                break
            start += step


def dotenv_candidate_paths() -> list[Path]:
    cwd = Path.cwd().resolve()
    script_dir = Path(__file__).resolve().parent
    candidates = [cwd / ".env", script_dir / ".env"]
    unique: list[Path] = []
    seen: set[Path] = set()
    for candidate in candidates:
        if candidate not in seen:
            unique.append(candidate)
            seen.add(candidate)
    return unique


def parse_dotenv_value(raw_value: str) -> str:
    value = raw_value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]
    return value.replace("\\n", "\n").replace("\\r", "\r").replace("\\t", "\t")


def load_dotenv_values() -> dict[str, str]:
    values: dict[str, str] = {}
    for env_path in dotenv_candidate_paths():
        if not env_path.exists():
            continue
        lines = env_path.read_text(encoding="utf-8").splitlines()
        for line_number, raw_line in enumerate(lines, start=1):
            stripped = raw_line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if stripped.startswith("export "):
                stripped = stripped[len("export ") :].strip()
            if "=" not in stripped:
                raise ValueError(f"Invalid .env line {line_number} in {env_path}: missing '='.")
            key, raw_value = stripped.split("=", 1)
            key = key.strip()
            if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
                raise ValueError(f"Invalid .env key on line {line_number} in {env_path}: {key}")
            values[key] = parse_dotenv_value(raw_value)
    return values


def read_config_value(key: str, dotenv_values: dict[str, str], explicit_value: str | None) -> str:
    if explicit_value is not None and explicit_value.strip():
        return explicit_value.strip()
    environment_value = os.environ.get(key)
    if environment_value is not None and environment_value.strip():
        return environment_value.strip()
    dotenv_value = dotenv_values.get(key)
    if dotenv_value is not None and dotenv_value.strip():
        return dotenv_value.strip()
    raise ValueError(f"Missing required configuration value: {key}")


def read_optional_config_value(
    key: str,
    dotenv_values: dict[str, str],
    explicit_value: str | None,
) -> str | None:
    if explicit_value is not None and explicit_value.strip():
        return explicit_value.strip()
    environment_value = os.environ.get(key)
    if environment_value is not None and environment_value.strip():
        return environment_value.strip()
    dotenv_value = dotenv_values.get(key)
    if dotenv_value is not None and dotenv_value.strip():
        return dotenv_value.strip()
    return None


def read_float_config_value(
    key: str,
    dotenv_values: dict[str, str],
    explicit_value: float | None,
    default_value: float,
) -> float:
    if explicit_value is not None:
        return float(explicit_value)
    environment_value = os.environ.get(key)
    raw_value = environment_value if environment_value is not None else dotenv_values.get(key)
    if raw_value is None or not raw_value.strip():
        return default_value
    try:
        return float(raw_value)
    except ValueError as exc:
        raise ValueError(f"{key} must be a numeric dollar amount.") from exc


def normalize_cluster_url(cluster_url: str) -> str:
    normalized = cluster_url.strip().rstrip("/")
    if not normalized.startswith(("https://", "http://")):
        raise ValueError("QDRANT_CLUSTER_URL must start with https:// or http://.")
    return normalized


def harvest_date() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def compact_join(parts: Iterable[Any], separator: str = "\n") -> str:
    values: list[str] = []
    for part in parts:
        if part is None:
            continue
        if isinstance(part, list):
            nested = compact_join(part, ", ")
            if nested:
                values.append(nested)
            continue
        text = str(part).strip()
        if text:
            values.append(text)
    return separator.join(values)


def decode_french_bytes(content: bytes) -> str:
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def html_to_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value)
    text = re.sub(r"<\s*br\s*/?\s*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</\s*(p|div|li|tr|h[1-6])\s*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    return html.unescape(text)


class DataGouvClient:
    def __init__(self, session: requests.Session) -> None:
        self.session = session

    def dataset(self, slug: str) -> dict[str, Any]:
        url = f"https://www.data.gouv.fr/api/1/datasets/{slug}/"
        response = self.session.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
        if not response.ok:
            raise RuntimeError(
                f"data.gouv.fr rejected dataset metadata request for {slug}: "
                f"HTTP {response.status_code} {response.text}"
            )
        payload = response.json()
        if not isinstance(payload, dict):
            raise RuntimeError(f"data.gouv.fr metadata for {slug} was not a JSON object.")
        return payload

    def select_resource(
        self,
        dataset_payload: dict[str, Any],
        required_format: str | None,
        title_patterns: Sequence[str],
    ) -> dict[str, Any]:
        resources = dataset_payload.get("resources")
        if not isinstance(resources, list):
            raise RuntimeError("data.gouv.fr dataset metadata did not include resources.")

        normalized_patterns = [pattern.lower() for pattern in title_patterns]
        scored: list[tuple[int, dict[str, Any]]] = []
        for resource in resources:
            if not isinstance(resource, dict):
                continue
            resource_format = str(resource.get("format", "")).lower()
            title = str(resource.get("title", "")).lower()
            if required_format is not None and resource_format != required_format.lower():
                continue
            score = sum(1 for pattern in normalized_patterns if pattern in title)
            scored.append((score, resource))

        if not scored:
            raise RuntimeError("No matching data.gouv.fr resource was found.")
        scored.sort(key=lambda item: item[0], reverse=True)
        return scored[0][1]

    def resource_download_url(self, resource: dict[str, Any]) -> str:
        latest = resource.get("latest")
        url = resource.get("url")
        selected = latest if isinstance(latest, str) and latest.strip() else url
        if not isinstance(selected, str) or not selected.strip():
            raise RuntimeError("data.gouv.fr resource did not include a downloadable URL.")
        return selected.strip()


class HuggingFaceAcademicHarvester:
    def __init__(
        self,
        normalizer: FrenchMedicalNormalizer,
        chunker: SlidingWindowChunker,
        limit_per_source: int | None,
    ) -> None:
        self.normalizer = normalizer
        self.chunker = chunker
        self.limit_per_source = limit_per_source

    def iter_chunks(self) -> Iterator[TextChunk]:
        yield from self._iter_mediqal_chunks()
        yield from self._iter_caremedeval_chunks()

    def _load_datasets_module(self) -> Any:
        try:
            import datasets
        except ImportError as exc:
            raise RuntimeError(
                "The Hugging Face academic pipeline requires the 'datasets' library. "
                "Install it with: pip install datasets"
            ) from exc
        return datasets

    def _resolve_dataset_id(
        self,
        requested_dataset_id: str,
        fallback_dataset_ids: Sequence[str],
    ) -> tuple[str, list[str]]:
        datasets_module = self._load_datasets_module()
        errors: list[str] = []
        for dataset_id in (requested_dataset_id, *fallback_dataset_ids):
            try:
                configs = list(datasets_module.get_dataset_config_names(dataset_id))
                log(f"Hugging Face dataset resolved: requested={requested_dataset_id} active={dataset_id}")
                return dataset_id, configs
            except Exception as exc:
                errors.append(f"{dataset_id}: {exc}")
        joined_errors = " | ".join(errors)
        raise RuntimeError(f"Unable to resolve Hugging Face dataset {requested_dataset_id}: {joined_errors}")

    def _split_names(self, dataset_id: str, config_name: str | None) -> list[str]:
        datasets_module = self._load_datasets_module()
        try:
            if config_name is None:
                return list(datasets_module.get_dataset_split_names(dataset_id))
            return list(datasets_module.get_dataset_split_names(dataset_id, config_name=config_name))
        except Exception:
            return ["train"]

    def _iter_mediqal_chunks(self) -> Iterator[TextChunk]:
        datasets_module = self._load_datasets_module()
        dataset_id, configs = self._resolve_dataset_id(
            "almanach/MediQAl",
            ("ANR-MALADES/MediQAl",),
        )
        active_configs = configs if configs else [None]
        records_seen = 0
        source_limit = self.limit_per_source
        for config_name in active_configs:
            splits = self._split_names(dataset_id, config_name)
            for split in splits:
                if source_limit is not None and records_seen >= source_limit:
                    return
                dataset = datasets_module.load_dataset(
                    dataset_id,
                    name=config_name,
                    split=split,
                    streaming=True,
                )
                for row_index, row in enumerate(dataset, start=1):
                    if source_limit is not None and records_seen >= source_limit:
                        return
                    if not isinstance(row, dict):
                        continue
                    record = self._mediqal_row_to_record(
                        dataset_id=dataset_id,
                        config_name=config_name or "default",
                        split=split,
                        row_index=row_index,
                        row=row,
                    )
                    records_seen += 1
                    yield from self.chunker.chunk_record(record)

    def _mediqal_row_to_record(
        self,
        dataset_id: str,
        config_name: str,
        split: str,
        row_index: int,
        row: dict[str, Any],
    ) -> SourceRecord:
        answers = []
        for label in ("a", "b", "c", "d", "e"):
            value = row.get(f"answer_{label}")
            if value is not None and str(value).strip():
                answers.append(f"Réponse {label.upper()}: {value}")
        subject = str(row.get("medical_subject") or "Sujet médical").strip()
        question_type = str(row.get("question_type") or row.get("task") or "Question EDN").strip()
        row_id = str(row.get("id") or row_index).strip()
        text = compact_join(
            [
                f"Corpus: MediQAl",
                f"Spécialité: {subject}",
                f"Type: {question_type}",
                f"Cas clinique: {row.get('clinical_case')}",
                f"Question: {row.get('question')}",
                answers,
                f"Réponses correctes: {row.get('correct_answers')}",
            ]
        )
        return SourceRecord(
            text=text,
            origin_title=f"MediQAl - {subject} - {question_type}",
            category_silo="colles_enseignants_edn",
            source_identifier=f"hf://{dataset_id}/{config_name}/{split}/{row_id}",
            regulatory_date=harvest_date(),
            page_number=row_index,
        )

    def _iter_caremedeval_chunks(self) -> Iterator[TextChunk]:
        datasets_module = self._load_datasets_module()
        dataset_id, configs = self._resolve_dataset_id(
            "CareMedEval",
            ("doriab/CareMedEval",),
        )
        active_configs = configs if configs else [None]
        records_seen = 0
        source_limit = self.limit_per_source
        for config_name in active_configs:
            splits = self._split_names(dataset_id, config_name)
            for split in splits:
                if source_limit is not None and records_seen >= source_limit:
                    return
                dataset = datasets_module.load_dataset(
                    dataset_id,
                    name=config_name,
                    split=split,
                    streaming=True,
                )
                for row_index, row in enumerate(dataset, start=1):
                    if source_limit is not None and records_seen >= source_limit:
                        return
                    if not isinstance(row, dict):
                        continue
                    text = self._generic_row_text(row)
                    if not text:
                        continue
                    title = self._caremedeval_title(row, row_index)
                    records_seen += 1
                    yield from self.chunker.chunk_record(
                        SourceRecord(
                            text=compact_join(["Corpus: CareMedEval", text]),
                            origin_title=title,
                            category_silo="colles_enseignants_edn",
                            source_identifier=f"hf://{dataset_id}/{config_name or 'default'}/{split}/{row_index}",
                            regulatory_date=harvest_date(),
                            page_number=row_index,
                        )
                    )

    def _generic_row_text(self, row: dict[str, Any]) -> str:
        preferred_keys = (
            "text",
            "question",
            "answer",
            "context",
            "article",
            "abstract",
            "clinical_case",
            "explanation",
        )
        parts: list[str] = []
        for key in preferred_keys:
            value = row.get(key)
            if value is not None and str(value).strip():
                parts.append(f"{key}: {value}")
        if parts:
            return compact_join(parts)
        for key, value in row.items():
            if isinstance(value, (str, int, float, bool)) and str(value).strip():
                parts.append(f"{key}: {value}")
        return compact_join(parts)

    def _caremedeval_title(self, row: dict[str, Any], row_index: int) -> str:
        for key in ("title", "source", "task", "category"):
            value = row.get(key)
            if value is not None and str(value).strip():
                return f"CareMedEval - {str(value).strip()[:120]}"
        return f"CareMedEval - record {row_index}"


class HASHarvester:
    def __init__(
        self,
        session: requests.Session,
        data_gouv: DataGouvClient,
        chunker: SlidingWindowChunker,
        limit_per_source: int | None,
    ) -> None:
        self.session = session
        self.data_gouv = data_gouv
        self.chunker = chunker
        self.limit_per_source = limit_per_source

    def iter_chunks(self) -> Iterator[TextChunk]:
        dataset_payload = self.data_gouv.dataset(HAS_DATASET_SLUG)
        resource = self.data_gouv.select_resource(
            dataset_payload=dataset_payload,
            required_format="zip",
            title_patterns=("un seul fichier", "toutes les publications", "single"),
        )
        download_url = self.data_gouv.resource_download_url(resource)
        log(f"Downloading HAS publication export from data.gouv.fr resource: {download_url}")
        response = self.session.get(download_url, timeout=REQUEST_TIMEOUT_SECONDS)
        if not response.ok:
            raise RuntimeError(
                f"HAS data.gouv.fr zip download failed: HTTP {response.status_code} {response.text}"
            )
        yield from self._iter_zip_records(
            zip_bytes=response.content,
            resource_last_modified=str(resource.get("last_modified") or harvest_date()),
        )

    def _iter_zip_records(self, zip_bytes: bytes, resource_last_modified: str) -> Iterator[TextChunk]:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
            names = set(archive.namelist())
            if "json/AllPublications.json" in names:
                with archive.open("json/AllPublications.json") as stream:
                    publications = json.loads(stream.read().decode("utf-8"))
                if not isinstance(publications, list):
                    raise RuntimeError("HAS AllPublications.json did not contain a JSON array.")
                for record_index, publication in enumerate(publications, start=1):
                    if self.limit_per_source is not None and record_index > self.limit_per_source:
                        return
                    if isinstance(publication, dict):
                        yield from self.chunker.chunk_record(
                            self._publication_to_record(publication, record_index, resource_last_modified)
                        )
                return

            if "csv/AllPublications.csv" in names:
                with archive.open("csv/AllPublications.csv") as stream:
                    text = stream.read().decode("utf-8-sig")
                reader = csv.DictReader(io.StringIO(text))
                for record_index, publication in enumerate(reader, start=1):
                    if self.limit_per_source is not None and record_index > self.limit_per_source:
                        return
                    yield from self.chunker.chunk_record(
                        self._publication_to_record(dict(publication), record_index, resource_last_modified)
                    )
                return

        raise RuntimeError("HAS publication zip did not contain json/AllPublications.json or csv/AllPublications.csv.")

    def _publication_to_record(
        self,
        publication: dict[str, Any],
        record_index: int,
        resource_last_modified: str,
    ) -> SourceRecord:
        title = str(publication.get("title") or f"HAS publication {record_index}").strip()
        resume = publication.get("resumeSiteWeb")
        if isinstance(resume, dict):
            resume_text = resume.get("markdown") or resume.get("simple_html") or ""
        else:
            resume_text = resume or ""
        categories = publication.get("categoriesThematiques")
        document_links = publication.get("documentLinkSet")
        document_text_parts: list[str] = []
        if isinstance(document_links, list):
            for document in document_links:
                if isinstance(document, dict):
                    document_text_parts.append(
                        compact_join(
                            [
                                f"Document: {document.get('title')}",
                                f"Lien: {document.get('url')}",
                                f"Document résolu: {document.get('resolvedUrl')}",
                            ],
                            " | ",
                        )
                    )
        text = compact_join(
            [
                f"Autorité: Haute Autorité de Santé",
                f"Classe: {publication.get('class')}",
                f"Titre: {title}",
                f"Catégories: {compact_join(categories if isinstance(categories, list) else [], ', ')}",
                f"Résumé: {html_to_text(resume_text)}",
                document_text_parts,
                f"Page officielle: {publication.get('pageURL')}",
            ]
        )
        source_identifier = str(publication.get("pageURL") or publication.get("id") or f"HAS:{record_index}")
        regulatory_date = str(
            publication.get("publicationDate")
            or publication.get("creationDate")
            or publication.get("apiAccessDate")
            or resource_last_modified
        )
        return SourceRecord(
            text=text,
            origin_title=title,
            category_silo="has_recommandations",
            source_identifier=source_identifier,
            regulatory_date=regulatory_date,
            page_number=record_index,
        )


class BDPMHarvester:
    def __init__(
        self,
        session: requests.Session,
        data_gouv: DataGouvClient,
        chunker: SlidingWindowChunker,
        limit_per_source: int | None,
    ) -> None:
        self.session = session
        self.data_gouv = data_gouv
        self.chunker = chunker
        self.limit_per_source = limit_per_source

    def iter_chunks(self) -> Iterator[TextChunk]:
        download_page = self._download_page_url()
        file_links = self._discover_bdpm_file_links(download_page)
        required_files = (
            "CIS_bdpm.txt",
            "CIS_COMPO_bdpm.txt",
            "CIS_CPD_bdpm.txt",
            "CIS_HAS_SMR_bdpm.txt",
            "CIS_HAS_ASMR_bdpm.txt",
            "HAS_LiensPageCT_bdpm.txt",
            "CIS_GENER_bdpm.txt",
            "CIS_CIP_bdpm.txt",
            "CIS_MITM.txt",
        )
        raw_files = {
            filename: self._download_text_file(file_links[filename])
            for filename in required_files
            if filename in file_links
        }
        if "CIS_bdpm.txt" not in raw_files:
            raise RuntimeError("BDPM official download page did not expose CIS_bdpm.txt.")

        compositions = self._group_rows(raw_files.get("CIS_COMPO_bdpm.txt", ""), 0)
        prescription_conditions = self._group_rows(raw_files.get("CIS_CPD_bdpm.txt", ""), 0)
        smr_rows = self._group_rows(raw_files.get("CIS_HAS_SMR_bdpm.txt", ""), 0)
        asmr_rows = self._group_rows(raw_files.get("CIS_HAS_ASMR_bdpm.txt", ""), 0)
        cip_rows = self._group_rows(raw_files.get("CIS_CIP_bdpm.txt", ""), 0)
        mitm_rows = self._group_rows(raw_files.get("CIS_MITM.txt", ""), 0)
        ct_links = self._ct_links(raw_files.get("HAS_LiensPageCT_bdpm.txt", ""))
        generic_groups = self._generic_groups(raw_files.get("CIS_GENER_bdpm.txt", ""))

        cis_rows = self._parse_tsv(raw_files["CIS_bdpm.txt"])
        record_count = 0
        for row_index, fields in enumerate(cis_rows, start=1):
            if self.limit_per_source is not None and record_count >= self.limit_per_source:
                return
            if len(fields) < 2:
                continue
            cis = fields[0]
            record_count += 1
            yield from self.chunker.chunk_record(
                self._cis_to_record(
                    cis=cis,
                    fields=fields,
                    row_index=row_index,
                    compositions=compositions.get(cis, []),
                    prescription_conditions=prescription_conditions.get(cis, []),
                    smr_rows=smr_rows.get(cis, []),
                    asmr_rows=asmr_rows.get(cis, []),
                    cip_rows=cip_rows.get(cis, []),
                    mitm_rows=mitm_rows.get(cis, []),
                    ct_links=ct_links,
                    generic_groups=generic_groups.get(cis, []),
                )
            )

    def _download_page_url(self) -> str:
        try:
            dataset_payload = self.data_gouv.dataset(BDPM_DATASET_SLUG)
            resource = self.data_gouv.select_resource(
                dataset_payload=dataset_payload,
                required_format=None,
                title_patterns=("téléchargement", "donnees brutes", "données brutes"),
            )
            resource_url = resource.get("url")
            if isinstance(resource_url, str) and resource_url.strip():
                return resource_url.strip()
        except Exception as exc:
            warn(f"BDPM data.gouv.fr metadata lookup fell back to official download page: {exc}")
        return BDPM_DOWNLOAD_PAGE_FALLBACK

    def _discover_bdpm_file_links(self, download_page_url: str) -> dict[str, str]:
        log(f"Discovering BDPM official text exports from {download_page_url}")
        response = self.session.get(download_page_url, timeout=REQUEST_TIMEOUT_SECONDS)
        if not response.ok:
            raise RuntimeError(
                f"BDPM official download page failed: HTTP {response.status_code} {response.text}"
            )
        links: dict[str, str] = {}
        for href in re.findall(r'href=["\']([^"\']+)["\']', response.text):
            if not href.endswith(".txt"):
                continue
            filename = href.rstrip("/").split("/")[-1]
            links[filename] = urljoin(download_page_url, href)
        if not links:
            raise RuntimeError("No BDPM .txt exports were found on the official download page.")
        return links

    def _download_text_file(self, url: str) -> str:
        log(f"Downloading BDPM text export: {url}")
        response = self.session.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
        if not response.ok:
            raise RuntimeError(f"BDPM text export failed: HTTP {response.status_code} {response.text}")
        return decode_french_bytes(response.content)

    def _parse_tsv(self, text: str) -> list[list[str]]:
        rows: list[list[str]] = []
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            rows.append([field.strip() for field in line.split("\t")])
        return rows

    def _group_rows(self, text: str, key_index: int) -> dict[str, list[list[str]]]:
        grouped: dict[str, list[list[str]]] = {}
        for row in self._parse_tsv(text):
            if len(row) <= key_index:
                continue
            grouped.setdefault(row[key_index], []).append(row)
        return grouped

    def _ct_links(self, text: str) -> dict[str, str]:
        links: dict[str, str] = {}
        for row in self._parse_tsv(text):
            if len(row) >= 2:
                links[row[0]] = row[1]
        return links

    def _generic_groups(self, text: str) -> dict[str, list[str]]:
        grouped: dict[str, list[str]] = {}
        for row in self._parse_tsv(text):
            if len(row) >= 4:
                cis = row[2]
                grouped.setdefault(cis, []).append(compact_join([f"Groupe {row[0]}", row[1], f"Générique: {row[3]}"], " | "))
        return grouped

    def _cis_to_record(
        self,
        cis: str,
        fields: list[str],
        row_index: int,
        compositions: Sequence[list[str]],
        prescription_conditions: Sequence[list[str]],
        smr_rows: Sequence[list[str]],
        asmr_rows: Sequence[list[str]],
        cip_rows: Sequence[list[str]],
        mitm_rows: Sequence[list[str]],
        ct_links: dict[str, str],
        generic_groups: Sequence[str],
    ) -> SourceRecord:
        denomination = self._field(fields, 1, f"BDPM CIS {cis}")
        base_text = compact_join(
            [
                "Autorité: ANSM / Base de Données Publique des Médicaments",
                f"Code CIS: {cis}",
                f"Dénomination: {denomination}",
                f"Forme pharmaceutique: {self._field(fields, 2, '')}",
                f"Voies d'administration: {self._field(fields, 3, '')}",
                f"Statut administratif: {self._field(fields, 4, '')}",
                f"Type de procédure: {self._field(fields, 5, '')}",
                f"Etat de commercialisation: {self._field(fields, 6, '')}",
                f"Date d'autorisation de mise sur le marché: {self._field(fields, 7, '')}",
                f"Titulaire: {self._field(fields, 10, '')}",
                f"Surveillance renforcée: {self._field(fields, 11, '')}",
                self._composition_text(compositions),
                self._condition_text(prescription_conditions),
                self._cip_text(cip_rows),
                self._mitm_text(mitm_rows),
                self._smr_text("SMR", smr_rows, ct_links),
                self._smr_text("ASMR", asmr_rows, ct_links),
                compact_join(generic_groups),
            ]
        )
        regulatory_date = self._field(fields, 7, harvest_date())
        return SourceRecord(
            text=base_text,
            origin_title=denomination,
            category_silo="ansm_bdpm_vidal",
            source_identifier=f"https://base-donnees-publique.medicaments.gouv.fr/extrait.php?specid={cis}",
            regulatory_date=regulatory_date,
            page_number=row_index,
        )

    def _field(self, fields: Sequence[str], index: int, default: str) -> str:
        if index < len(fields) and fields[index].strip():
            return fields[index].strip()
        return default

    def _composition_text(self, rows: Sequence[list[str]]) -> str:
        parts = []
        for row in rows[:20]:
            parts.append(
                compact_join(
                    [
                        f"Élément: {self._field(row, 1, '')}",
                        f"Substance: {self._field(row, 3, '')}",
                        f"Dosage: {self._field(row, 4, '')}",
                        f"Référence dosage: {self._field(row, 5, '')}",
                        f"Nature: {self._field(row, 6, '')}",
                    ],
                    " | ",
                )
            )
        return "Composition:\n" + compact_join(parts) if parts else ""

    def _condition_text(self, rows: Sequence[list[str]]) -> str:
        conditions = [self._field(row, 1, "") for row in rows if len(row) >= 2]
        return "Conditions de prescription et délivrance:\n" + compact_join(conditions) if conditions else ""

    def _cip_text(self, rows: Sequence[list[str]]) -> str:
        parts = []
        for row in rows[:10]:
            parts.append(
                compact_join(
                    [
                        f"Code CIP: {self._field(row, 1, '')}",
                        f"Présentation: {self._field(row, 2, '')}",
                        f"Statut: {self._field(row, 3, '')}",
                        f"Agrément collectivités: {self._field(row, 7, '')}",
                        f"Taux remboursement: {self._field(row, 8, '')}",
                        f"Indications remboursement: {html_to_text(self._field(row, 12, ''))}",
                    ],
                    " | ",
                )
            )
        return "Présentations CIP:\n" + compact_join(parts) if parts else ""

    def _mitm_text(self, rows: Sequence[list[str]]) -> str:
        parts = []
        for row in rows[:5]:
            parts.append(
                compact_join(
                    [
                        f"ATC: {self._field(row, 1, '')}",
                        f"Spécialité: {self._field(row, 2, '')}",
                        f"Lien: {self._field(row, 3, '')}",
                    ],
                    " | ",
                )
            )
        return "Classification ATC:\n" + compact_join(parts) if parts else ""

    def _smr_text(self, label: str, rows: Sequence[list[str]], ct_links: dict[str, str]) -> str:
        parts = []
        for row in rows[:10]:
            ct_id = self._field(row, 1, "")
            parts.append(
                compact_join(
                    [
                        f"{label} dossier: {ct_id}",
                        f"Motif: {self._field(row, 2, '')}",
                        f"Date: {self._field(row, 3, '')}",
                        f"Niveau: {self._field(row, 4, '')}",
                        f"Libellé: {html_to_text(self._field(row, 5, ''))}",
                        f"Lien HAS: {ct_links.get(ct_id, '')}",
                    ],
                    " | ",
                )
            )
        return f"{label} HAS:\n" + compact_join(parts) if parts else ""


class GeminiQuotaExhaustedError(RuntimeError):
    pass


class GeminiTransientEmbeddingError(RuntimeError):
    pass


class GeminiEmbeddingBudgetExceededError(RuntimeError):
    pass


def build_embedding_payload(chunk: TextChunk) -> str:
    title = chunk.origin_title.strip() or "none"
    return f"title: {title} | text: {chunk.text_content}"


def estimate_embedding_tokens(payload: str) -> int:
    return max(1, int(math.ceil(len(payload) / TOKEN_ESTIMATE_CHARS_PER_TOKEN)))


def estimate_paid_embedding_cost_usd(estimated_tokens: int) -> float:
    return (
        estimated_tokens
        / 1_000_000
        * GEMINI_EMBEDDING2_TEXT_STANDARD_USD_PER_MILLION_TOKENS
    )


def is_gemini_quota_exception(exc: BaseException) -> bool:
    message = f"{type(exc).__name__}: {exc}".lower()
    return any(
        marker in message
        for marker in (
            "429",
            "resource_exhausted",
            "quota",
            "rate limit",
            "rate_limit",
            "too many requests",
        )
    )


def is_gemini_transient_exception(exc: BaseException) -> bool:
    message = f"{type(exc).__name__}: {exc}".lower()
    return any(
        marker in message
        for marker in (
            "500",
            "502",
            "503",
            "504",
            "internal",
            "bad gateway",
            "unavailable",
            "service unavailable",
            "deadline",
            "timeout",
            "temporarily unavailable",
        )
    )


def stable_point_identity(chunk: TextChunk) -> tuple[str, str]:
    identity = {
        "embedding_dimensions": EMBEDDING_DIMENSIONS,
        "embedding_model": EMBEDDING_MODEL,
        "category_silo": chunk.category_silo,
        "source_identifier": chunk.source_identifier,
        "origin_title": chunk.origin_title,
        "regulatory_date": chunk.regulatory_date,
        "page_number": int(chunk.page_number),
        "chunk_index": int(chunk.chunk_index),
        "text_content": chunk.text_content,
    }
    serialized = json.dumps(identity, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"ancre-med:{digest}")), digest


class IngestionManifest:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.uploaded_point_ids: set[str] = set()
        self._load_existing_entries()

    def _load_existing_entries(self) -> None:
        if not self.path.exists():
            log(f"Resume manifest initialized: {self.path}")
            return
        loaded = 0
        with self.path.open("r", encoding="utf-8") as handle:
            for line_number, raw_line in enumerate(handle, start=1):
                line = raw_line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    warn(f"Ignoring malformed manifest line {line_number}: {self.path}")
                    continue
                point_id = record.get("point_id")
                if isinstance(point_id, str) and point_id:
                    self.uploaded_point_ids.add(point_id)
                    loaded += 1
        log(f"Resume manifest loaded {loaded} uploaded point id(s).")

    def contains(self, point_id: str) -> bool:
        return point_id in self.uploaded_point_ids

    def mark_uploaded(self, point: EmbeddedPoint) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        record = {
            "point_id": point.id,
            "stable_content_key": point.stable_content_key,
            "embedding_model": EMBEDDING_MODEL,
            "embedding_dimensions": EMBEDDING_DIMENSIONS,
            "embedding_provider": point.embedding_provider,
            "estimated_tokens": point.estimated_tokens,
            "estimated_paid_cost_usd": round(point.estimated_paid_cost_usd, 10),
            "category_silo": point.payload.get("category_silo"),
            "source_identifier": point.payload.get("source_identifier"),
            "origin_title": point.payload.get("origin_title"),
            "page_number": point.payload.get("page_number"),
            "regulatory_date": point.payload.get("regulatory_date"),
            "uploaded_at_utc": datetime.now(timezone.utc).isoformat(),
        }
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")
        self.uploaded_point_ids.add(point.id)


class GeminiEmbeddingClient:
    def __init__(self, api_key: str, provider_name: str) -> None:
        if not api_key.strip():
            raise ValueError("A non-empty Gemini API key is required.")
        try:
            from google import genai
        except ImportError as exc:
            raise RuntimeError(
                "The Gemini embedding pipeline requires the Google Gen AI SDK. "
                "Install it with: pip install google-genai"
            ) from exc
        self.client = genai.Client(api_key=api_key)
        self.provider_name = provider_name

    def embed_payload(self, embedding_payload: str) -> list[float]:
        vectors = self.embed_payloads([embedding_payload])
        return vectors[0]

    def embed_payloads(self, embedding_payloads: Sequence[str]) -> list[list[float]]:
        if not embedding_payloads:
            return []
        contents: str | list[str]
        contents = embedding_payloads[0] if len(embedding_payloads) == 1 else list(embedding_payloads)
        response: Any | None = None
        for attempt in range(1, GEMINI_EMBEDDING_MAX_ATTEMPTS + 1):
            try:
                response = self.client.models.embed_content(
                    model=EMBEDDING_MODEL,
                    contents=contents,
                    config={"output_dimensionality": EMBEDDING_DIMENSIONS},
                )
                break
            except Exception as exc:
                if is_gemini_quota_exception(exc):
                    raise GeminiQuotaExhaustedError(
                        f"Gemini embedding quota exhausted for provider {self.provider_name}: {exc}"
                    ) from exc
                if is_gemini_transient_exception(exc):
                    if attempt >= GEMINI_EMBEDDING_MAX_ATTEMPTS:
                        raise GeminiTransientEmbeddingError(
                            "Gemini embedding service stayed unavailable for provider "
                            f"{self.provider_name} after {attempt} attempts: {exc}"
                        ) from exc
                    delay_seconds = min(
                        GEMINI_EMBEDDING_RETRY_BASE_SECONDS * (2 ** (attempt - 1)),
                        GEMINI_EMBEDDING_RETRY_MAX_SECONDS,
                    )
                    warn(
                        "Gemini embedding transient failure for provider "
                        f"{self.provider_name} on attempt {attempt}/"
                        f"{GEMINI_EMBEDDING_MAX_ATTEMPTS}: {exc}. "
                        f"Retrying in {delay_seconds:.1f}s."
                    )
                    time.sleep(delay_seconds)
                    continue
                raise RuntimeError(
                    f"Gemini embedding request failed closed for provider {self.provider_name}: {exc}"
                ) from exc
        if response is None:
            raise RuntimeError(f"Gemini embedding request returned no response for {self.provider_name}.")
        vectors = self._extract_vectors(response)
        if len(vectors) != len(embedding_payloads):
            raise ValueError(
                "Gemini embedding response count mismatch: "
                f"received {len(vectors)} vector(s), expected {len(embedding_payloads)}."
            )
        for vector_index, vector in enumerate(vectors, start=1):
            if len(vector) != EMBEDDING_DIMENSIONS:
                raise ValueError(
                    f"Gemini returned {len(vector)} dimensions for vector {vector_index}; "
                    f"expected {EMBEDDING_DIMENSIONS}."
                )
        return vectors

    def _extract_vector(self, response: Any) -> list[float]:
        vectors = self._extract_vectors(response)
        if not vectors:
            raise ValueError("Gemini embedding response did not contain vector values.")
        return vectors[0]

    def _extract_vectors(self, response: Any) -> list[list[float]]:
        embeddings = getattr(response, "embeddings", None)
        if isinstance(embeddings, list) and embeddings:
            vectors = [self._read_values(embedding) for embedding in embeddings]
            vectors = [vector for vector in vectors if vector]
            if vectors:
                return vectors

        embedding = getattr(response, "embedding", None)
        if embedding is not None:
            values = self._read_values(embedding)
            if values:
                return [values]

        if isinstance(response, dict):
            raw_embeddings = response.get("embeddings")
            if isinstance(raw_embeddings, list) and raw_embeddings:
                vectors = [self._read_values(embedding) for embedding in raw_embeddings]
                vectors = [vector for vector in vectors if vector]
                if vectors:
                    return vectors
            raw_embedding = response.get("embedding")
            values = self._read_values(raw_embedding)
            if values:
                return [values]

        raise ValueError("Gemini embedding response did not contain vector values.")

    def _read_values(self, embedding: Any) -> list[float]:
        if embedding is None:
            return []
        values = getattr(embedding, "values", None)
        if values is None and isinstance(embedding, dict):
            values = embedding.get("values")
        if not isinstance(values, list):
            return []
        vector: list[float] = []
        for value in values:
            if not isinstance(value, (int, float)):
                raise ValueError("Gemini embedding vector contained a non-numeric value.")
            vector.append(float(value))
        return vector


class BudgetedGeminiEmbeddingService:
    def __init__(
        self,
        free_api_key: str | None,
        paid_api_key: str | None,
        paid_budget_usd: float,
        request_delay_seconds: float,
        paid_rate_limit_wait_seconds: float,
        max_paid_rate_limit_waits: int,
    ) -> None:
        if paid_budget_usd < 0:
            raise ValueError("The paid embedding budget cannot be negative.")
        if request_delay_seconds < 0:
            raise ValueError("The Gemini embedding request delay cannot be negative.")
        if paid_rate_limit_wait_seconds < 0:
            raise ValueError("The paid Gemini rate-limit wait cannot be negative.")
        if max_paid_rate_limit_waits < 0:
            raise ValueError("The maximum paid Gemini rate-limit wait count cannot be negative.")
        if free_api_key is None and paid_api_key is None:
            raise ValueError(
                "Missing Gemini embedding credentials: set GEMINI_FREE_API_KEY or GEMINI_API_KEY."
            )
        self.free_client = (
            GeminiEmbeddingClient(free_api_key, "free")
            if free_api_key is not None and free_api_key.strip()
            else None
        )
        self.paid_client = (
            GeminiEmbeddingClient(paid_api_key, "paid")
            if paid_api_key is not None and paid_api_key.strip()
            else None
        )
        self.paid_budget_usd = paid_budget_usd
        self.paid_spend_estimate_usd = 0.0
        self.paid_tokens_estimate = 0
        self.request_delay_seconds = request_delay_seconds
        self.paid_rate_limit_wait_seconds = paid_rate_limit_wait_seconds
        self.max_paid_rate_limit_waits = max_paid_rate_limit_waits
        self.paid_rate_limit_waits_used = 0
        self.last_request_started_at = 0.0
        self.active_provider = "free" if self.free_client is not None else "paid"
        if self.active_provider == "free":
            log("Embedding mode: free Gemini key first; paid fallback is budget-capped.")
        else:
            log("Embedding mode: paid Gemini key only; budget cap is active.")

    def embed_chunk(self, chunk: TextChunk) -> EmbeddingResult:
        return self.embed_chunks([chunk])[0]

    def embed_chunks(self, chunks: Sequence[TextChunk]) -> list[EmbeddingResult]:
        if not chunks:
            return []
        payloads = [build_embedding_payload(chunk) for chunk in chunks]
        estimated_tokens_per_payload = [estimate_embedding_tokens(payload) for payload in payloads]
        total_estimated_tokens = sum(estimated_tokens_per_payload)

        if self.active_provider == "free" and self.free_client is not None:
            try:
                self._throttle_before_request()
                vectors = self.free_client.embed_payloads(payloads)
                return [
                    EmbeddingResult(
                        vector=vector,
                        provider="free",
                        estimated_tokens=estimated_tokens,
                        estimated_paid_cost_usd=0.0,
                    )
                    for vector, estimated_tokens in zip(vectors, estimated_tokens_per_payload)
                ]
            except GeminiQuotaExhaustedError as exc:
                warn(f"Free Gemini embedding key reached its quota/rate limit: {exc}")
                if self.paid_client is None:
                    raise RuntimeError(
                        "Free Gemini embedding quota is exhausted and no paid GEMINI_API_KEY is configured."
                    ) from exc
                self.active_provider = "paid"
                log(
                    "Switching embedding mode to paid Gemini key. "
                    f"Hard cap: ${self.paid_budget_usd:.2f}."
                )
            except GeminiTransientEmbeddingError as exc:
                warn(f"Free Gemini embedding provider stayed unavailable after retries: {exc}")
                if self.paid_client is None:
                    raise RuntimeError(
                        "Free Gemini embedding provider is unavailable and no paid GEMINI_API_KEY is configured."
                    ) from exc
                self.active_provider = "paid"
                log(
                    "Switching embedding mode to paid Gemini key after free-provider transient failures. "
                    f"Hard cap: ${self.paid_budget_usd:.2f}."
                )

        if self.paid_client is None:
            raise RuntimeError("Paid Gemini embedding client is not configured.")

        estimated_cost = estimate_paid_embedding_cost_usd(total_estimated_tokens)
        projected_spend = self.paid_spend_estimate_usd + estimated_cost
        if projected_spend > self.paid_budget_usd:
            raise GeminiEmbeddingBudgetExceededError(
                "Paid embedding budget would be exceeded before the next Gemini call: "
                f"current estimate ${self.paid_spend_estimate_usd:.4f}, "
                f"next batch estimate ${estimated_cost:.4f}, "
                f"cap ${self.paid_budget_usd:.2f}."
            )

        local_paid_waits = 0
        while True:
            try:
                self._throttle_before_request()
                vectors = self.paid_client.embed_payloads(payloads)
                self.paid_spend_estimate_usd = projected_spend
                self.paid_tokens_estimate += total_estimated_tokens
                return [
                    EmbeddingResult(
                        vector=vector,
                        provider="paid",
                        estimated_tokens=estimated_tokens,
                        estimated_paid_cost_usd=estimate_paid_embedding_cost_usd(estimated_tokens),
                    )
                    for vector, estimated_tokens in zip(vectors, estimated_tokens_per_payload)
                ]
            except (GeminiQuotaExhaustedError, GeminiTransientEmbeddingError) as exc:
                local_paid_waits += 1
                self.paid_rate_limit_waits_used += 1
                if (
                    self.max_paid_rate_limit_waits > 0
                    and self.paid_rate_limit_waits_used > self.max_paid_rate_limit_waits
                ):
                    raise RuntimeError(
                        "Paid Gemini embedding provider kept returning rate-limit/unavailable "
                        f"errors after {self.paid_rate_limit_waits_used} wait cycle(s): {exc}"
                    ) from exc
                warn(
                    "Paid Gemini embedding provider is rate-limited/unavailable. "
                    f"Waiting {self.paid_rate_limit_wait_seconds:.0f}s before retrying "
                    f"the same {len(payloads)}-chunk batch "
                    f"(local wait {local_paid_waits}, total wait {self.paid_rate_limit_waits_used}). "
                    f"{self.summary()}."
                )
                time.sleep(self.paid_rate_limit_wait_seconds)

    def _throttle_before_request(self) -> None:
        if self.request_delay_seconds <= 0:
            self.last_request_started_at = time.monotonic()
            return
        elapsed = time.monotonic() - self.last_request_started_at
        wait_seconds = self.request_delay_seconds - elapsed
        if wait_seconds > 0:
            time.sleep(wait_seconds)
        self.last_request_started_at = time.monotonic()

    def summary(self) -> str:
        return (
            f"paid tokens estimate={self.paid_tokens_estimate}, "
            f"paid spend estimate=${self.paid_spend_estimate_usd:.4f}/"
            f"${self.paid_budget_usd:.2f}"
        )


class SQLiteUploader:
    def __init__(self, db_path: str = "clinical_ground_truth.db") -> None:
        self.db_path = db_path
        self._init_db()

    def _init_db(self) -> None:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                text_content TEXT,
                origin_title TEXT,
                category_silo TEXT,
                source_identifier TEXT,
                regulatory_date TEXT,
                page_number INTEGER,
                chunk_index INTEGER
            );
        """)
        cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
                text_content,
                origin_title,
                category_silo,
                source_identifier,
                content='documents',
                content_rowid='rowid'
            );
        """)
        
        # Triggers to keep FTS5 virtual table in sync
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
              INSERT INTO documents_fts(rowid, text_content, origin_title, category_silo, source_identifier)
              VALUES (new.rowid, new.text_content, new.origin_title, new.category_silo, new.source_identifier);
            END;
        """)
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
              INSERT INTO documents_fts(documents_fts, rowid, text_content, origin_title, category_silo, source_identifier)
              VALUES('delete', old.rowid, old.text_content, old.origin_title, old.category_silo, old.source_identifier);
            END;
        """)
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
              INSERT INTO documents_fts(documents_fts, rowid, text_content, origin_title, category_silo, source_identifier)
              VALUES('delete', old.rowid, old.text_content, old.origin_title, old.category_silo, old.source_identifier);
              INSERT INTO documents_fts(rowid, text_content, origin_title, category_silo, source_identifier)
              VALUES (new.rowid, new.text_content, new.origin_title, new.category_silo, new.source_identifier);
            END;
        """)
        conn.commit()
        conn.close()

    def ensure_payload_indexes(self) -> None:
        pass

    def upload_points(
        self,
        points: Iterable[EmbeddedPoint],
        manifest: IngestionManifest | None = None,
    ) -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA synchronous = OFF;")
        cursor.execute("PRAGMA journal_mode = MEMORY;")
        
        uploaded = 0
        for point in points:
            cursor.execute("""
                INSERT OR REPLACE INTO documents (
                    id, text_content, origin_title, category_silo, source_identifier, regulatory_date, page_number, chunk_index
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                point.id,
                point.payload.get("text_content", ""),
                point.payload.get("origin_title", ""),
                point.payload.get("category_silo", ""),
                point.payload.get("source_identifier", ""),
                point.payload.get("regulatory_date", ""),
                point.payload.get("page_number", 0),
                point.payload.get("chunk_index", 0),
            ))
            uploaded += 1
            if manifest is not None:
                manifest.uploaded_point_ids.add(point.id)
                manifest.mark_uploaded(point)
                
        conn.commit()
        conn.close()
        return uploaded


class AutomatedDataHarvester:
    def __init__(
        self,
        gemini_free_api_key: str | None,
        gemini_paid_api_key: str | None,
        paid_embedding_budget_usd: float,
        qdrant_cluster_url: str,
        qdrant_api_key: str,
        selected_silos: set[str],
        limit_per_source: int | None,
        chunk_size_words: int,
        overlap_words: int,
        min_chunk_words: int,
        qdrant_collection: str,
        qdrant_batch_size: int,
        qdrant_upload_workers: int,
        ensure_indexes: bool,
        manifest_path: Path,
        force_reembed: bool,
        estimate_only: bool,
        embedding_batch_size: int,
        embedding_request_delay_seconds: float,
        paid_rate_limit_wait_seconds: float,
        max_paid_rate_limit_waits: int,
    ) -> None:
        if embedding_batch_size <= 0:
            raise ValueError("embedding_batch_size must be positive.")
        if max_paid_rate_limit_waits < 0:
            raise ValueError("max_paid_rate_limit_waits cannot be negative.")
        self.normalizer = FrenchMedicalNormalizer()
        self.chunker = SlidingWindowChunker(
            normalizer=self.normalizer,
            chunk_size_words=chunk_size_words,
            overlap_words=overlap_words,
            min_chunk_words=min_chunk_words,
        )
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "ancre-med-ingest-worker/1.0"})
        self.data_gouv = DataGouvClient(self.session)
        self.embedding_service = BudgetedGeminiEmbeddingService(
            free_api_key=gemini_free_api_key,
            paid_api_key=gemini_paid_api_key,
            paid_budget_usd=paid_embedding_budget_usd,
            request_delay_seconds=embedding_request_delay_seconds,
            paid_rate_limit_wait_seconds=paid_rate_limit_wait_seconds,
            max_paid_rate_limit_waits=max_paid_rate_limit_waits,
        )
        self.uploader = SQLiteUploader("clinical_ground_truth.db")
        self.selected_silos = selected_silos
        self.limit_per_source = limit_per_source
        self.ensure_indexes = ensure_indexes
        self.manifest = IngestionManifest(manifest_path)
        self.force_reembed = force_reembed
        self.estimate_only = estimate_only
        self.embedding_batch_size = embedding_batch_size

    def run(self) -> int:
        if self.estimate_only:
            return self._estimate_only()
        if self.ensure_indexes:
            self.uploader.ensure_payload_indexes()
        point_stream = self._embedded_points()
        uploaded = self.uploader.upload_points(point_stream, manifest=self.manifest)
        log(
            "Automated data harvest complete. "
            f"Uploaded {uploaded} vector point(s). {self.embedding_service.summary()}."
        )
        return uploaded

    def _estimate_only(self) -> int:
        total_chunks = 0
        skipped_chunks = 0
        total_estimated_tokens = 0
        for chunk in self._iter_all_chunks():
            point_id, _stable_key = stable_point_identity(chunk)
            if not self.force_reembed and self.manifest.contains(point_id):
                skipped_chunks += 1
                continue
            payload = build_embedding_payload(chunk)
            total_chunks += 1
            total_estimated_tokens += estimate_embedding_tokens(payload)
        all_paid_cost = estimate_paid_embedding_cost_usd(total_estimated_tokens)
        log(
            "Estimate complete. "
            f"new chunks={total_chunks}, already uploaded skipped={skipped_chunks}, "
            f"estimated tokens={total_estimated_tokens}, "
            f"worst-case paid cost if all paid=${all_paid_cost:.4f}."
        )
        return 0

    def _iter_all_chunks(self) -> Iterator[TextChunk]:
        if "colles_enseignants_edn" in self.selected_silos:
            log("Starting Silo A harvest: MediQAl and CareMedEval via Hugging Face datasets.")
            academic = HuggingFaceAcademicHarvester(
                normalizer=self.normalizer,
                chunker=self.chunker,
                limit_per_source=self.limit_per_source,
            )
            yield from academic.iter_chunks()

        if "has_recommandations" in self.selected_silos:
            log("Starting Silo B harvest: HAS publications via data.gouv.fr zip export.")
            has = HASHarvester(
                session=self.session,
                data_gouv=self.data_gouv,
                chunker=self.chunker,
                limit_per_source=self.limit_per_source,
            )
            yield from has.iter_chunks()

        if "ansm_bdpm_vidal" in self.selected_silos:
            log("Starting Silo C harvest: ANSM / BDPM official text exports.")
            bdpm = BDPMHarvester(
                session=self.session,
                data_gouv=self.data_gouv,
                chunker=self.chunker,
                limit_per_source=self.limit_per_source,
            )
            yield from bdpm.iter_chunks()

    def _embedded_points(self) -> Iterator[EmbeddedPoint]:
        processed = 0
        skipped = 0
        for chunk in self._iter_all_chunks():
            point_id, stable_key = stable_point_identity(chunk)
            if not self.force_reembed and self.manifest.contains(point_id):
                skipped += 1
                if skipped % 100 == 0:
                    log(f"Skipped {skipped} already-uploaded chunk(s) from the resume manifest.")
                continue

            processed += 1
            if processed % 100 == 0:
                log(f"Indexed {processed} new chunk(s) for SQLite.")

            yield EmbeddedPoint(
                id=point_id,
                vector=[],
                payload={
                    "text_content": chunk.text_content,
                    "origin_title": chunk.origin_title,
                    "category_silo": chunk.category_silo,
                    "page_number": int(chunk.page_number),
                    "regulatory_date": chunk.regulatory_date,
                    "source_identifier": chunk.source_identifier,
                },
                stable_content_key=stable_key,
                embedding_provider="sqlite",
                estimated_tokens=0,
                estimated_paid_cost_usd=0.0,
            )
        log(
            f"Index stream exhausted after {processed} new chunk(s); "
            f"skipped {skipped} already-uploaded chunk(s)."
        )


def parse_silos(raw_silos: Sequence[str]) -> set[str]:
    valid = {"colles_enseignants_edn", "has_recommandations", "ansm_bdpm_vidal"}
    if "all" in raw_silos:
        return set(valid)
    selected = set(raw_silos)
    invalid = selected - valid
    if invalid:
        raise ValueError(f"Invalid silo selection: {', '.join(sorted(invalid))}")
    return selected


def positive_int_or_none(value: int) -> int | None:
    if value < 0:
        raise ValueError("Limit values cannot be negative.")
    if value == 0:
        return None
    return value


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Automated cloud harvester for the ancre-med medical knowledge vault. "
            "The worker streams public French medical datasets, embeds chunks with "
            "gemini-embedding-2 at 768 dimensions, and upserts batched vectors to Qdrant Cloud."
        )
    )
    parser.add_argument(
        "--silos",
        nargs="+",
        default=["all"],
        choices=("all", "colles_enseignants_edn", "has_recommandations", "ansm_bdpm_vidal"),
        help="Silos to harvest. Defaults to all.",
    )
    parser.add_argument(
        "--limit-per-source",
        type=int,
        default=0,
        help="Maximum source records per upstream dataset/export. Use 0 for no limit.",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=DEFAULT_CHUNK_SIZE_WORDS,
        help=f"Target words per chunk. Defaults to {DEFAULT_CHUNK_SIZE_WORDS}.",
    )
    parser.add_argument(
        "--overlap",
        type=int,
        default=DEFAULT_OVERLAP_WORDS,
        help=f"Overlapping words between chunks. Defaults to {DEFAULT_OVERLAP_WORDS}.",
    )
    parser.add_argument(
        "--min-chunk-words",
        type=int,
        default=DEFAULT_MIN_CHUNK_WORDS,
        help=f"Minimum words required to embed a chunk. Defaults to {DEFAULT_MIN_CHUNK_WORDS}.",
    )
    parser.add_argument(
        "--qdrant-collection",
        default=QDRANT_COLLECTION_NAME,
        help=f"Qdrant collection name. Defaults to {QDRANT_COLLECTION_NAME}.",
    )
    parser.add_argument(
        "--qdrant-batch-size",
        type=int,
        default=QDRANT_UPLOAD_BATCH_SIZE,
        help=f"Qdrant upsert batch size. Defaults to {QDRANT_UPLOAD_BATCH_SIZE}.",
    )
    parser.add_argument(
        "--qdrant-upload-workers",
        type=int,
        default=QDRANT_UPLOAD_WORKERS,
        help=f"Parallel Qdrant upload workers. Defaults to {QDRANT_UPLOAD_WORKERS}.",
    )
    parser.add_argument(
        "--gemini-api-key",
        default=None,
        help="Paid/fallback Gemini API key. Defaults to GEMINI_API_KEY from environment or .env.",
    )
    parser.add_argument(
        "--gemini-free-api-key",
        default=None,
        help="Free-first Gemini API key. Defaults to GEMINI_FREE_API_KEY from environment or .env.",
    )
    parser.add_argument(
        "--paid-embedding-budget-usd",
        type=float,
        default=None,
        help=(
            "Maximum estimated paid Gemini embedding spend before failing closed. "
            f"Defaults to GEMINI_PAID_EMBEDDING_BUDGET_USD or {DEFAULT_PAID_EMBEDDING_BUDGET_USD}."
        ),
    )
    parser.add_argument(
        "--embedding-batch-size",
        type=int,
        default=GEMINI_EMBEDDING_BATCH_SIZE,
        help=(
            "Number of text chunks sent to Gemini per embedding request. "
            f"Defaults to {GEMINI_EMBEDDING_BATCH_SIZE}."
        ),
    )
    parser.add_argument(
        "--embedding-request-delay-seconds",
        type=float,
        default=GEMINI_EMBEDDING_REQUEST_DELAY_SECONDS,
        help=(
            "Minimum delay between Gemini embedding requests. "
            f"Defaults to {GEMINI_EMBEDDING_REQUEST_DELAY_SECONDS}."
        ),
    )
    parser.add_argument(
        "--paid-rate-limit-wait-seconds",
        type=float,
        default=GEMINI_PAID_RATE_LIMIT_WAIT_SECONDS,
        help=(
            "Seconds to wait before retrying the same paid Gemini embedding batch after 429/unavailable. "
            f"Defaults to {GEMINI_PAID_RATE_LIMIT_WAIT_SECONDS}."
        ),
    )
    parser.add_argument(
        "--max-paid-rate-limit-waits",
        type=int,
        default=GEMINI_MAX_PAID_RATE_LIMIT_WAITS,
        help=(
            "Maximum paid Gemini 429/unavailable wait cycles before stopping. "
            "Use 0 for unlimited waits. Defaults to 0."
        ),
    )
    parser.add_argument(
        "--qdrant-cluster-url",
        default=None,
        help="Qdrant cluster URL. Defaults to QDRANT_CLUSTER_URL from environment or .env.",
    )
    parser.add_argument(
        "--qdrant-api-key",
        default=None,
        help="Qdrant API key. Defaults to QDRANT_API_KEY from environment or .env.",
    )
    parser.add_argument(
        "--skip-index-creation",
        action="store_true",
        help="Skip idempotent Qdrant payload index creation for category_silo, source_identifier, and regulatory_date.",
    )
    parser.add_argument(
        "--manifest-path",
        default=INGEST_MANIFEST_FILENAME,
        help=(
            "Local JSONL resume manifest used to skip chunks already embedded and uploaded. "
            f"Defaults to {INGEST_MANIFEST_FILENAME}."
        ),
    )
    parser.add_argument(
        "--force-reembed",
        action="store_true",
        help="Ignore the resume manifest and re-embed matching chunks, overwriting deterministic Qdrant point ids.",
    )
    parser.add_argument(
        "--estimate-only",
        action="store_true",
        help="Fetch and chunk selected sources, then print a token/cost estimate without embedding or uploading.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    try:
        args = build_arg_parser().parse_args(argv)
        dotenv_values = load_dotenv_values()
        selected_silos = parse_silos(args.silos)
        harvester = AutomatedDataHarvester(
            gemini_free_api_key=read_optional_config_value(
                "GEMINI_FREE_API_KEY",
                dotenv_values,
                args.gemini_free_api_key,
            ),
            gemini_paid_api_key=read_optional_config_value(
                "GEMINI_API_KEY",
                dotenv_values,
                args.gemini_api_key,
            ),
            paid_embedding_budget_usd=read_float_config_value(
                "GEMINI_PAID_EMBEDDING_BUDGET_USD",
                dotenv_values,
                args.paid_embedding_budget_usd,
                DEFAULT_PAID_EMBEDDING_BUDGET_USD,
            ),
            qdrant_cluster_url=read_optional_config_value(
                "QDRANT_CLUSTER_URL",
                dotenv_values,
                args.qdrant_cluster_url,
            ) or "http://localhost:6333",
            qdrant_api_key=read_optional_config_value("QDRANT_API_KEY", dotenv_values, args.qdrant_api_key) or "mock_key",
            selected_silos=selected_silos,
            limit_per_source=positive_int_or_none(args.limit_per_source),
            chunk_size_words=args.chunk_size,
            overlap_words=args.overlap,
            min_chunk_words=args.min_chunk_words,
            qdrant_collection=args.qdrant_collection,
            qdrant_batch_size=args.qdrant_batch_size,
            qdrant_upload_workers=args.qdrant_upload_workers,
            ensure_indexes=not args.skip_index_creation,
            manifest_path=Path(args.manifest_path),
            force_reembed=args.force_reembed,
            estimate_only=args.estimate_only,
            embedding_batch_size=args.embedding_batch_size,
            embedding_request_delay_seconds=args.embedding_request_delay_seconds,
            paid_rate_limit_wait_seconds=args.paid_rate_limit_wait_seconds,
            max_paid_rate_limit_waits=args.max_paid_rate_limit_waits,
        )
        harvester.run()
    except KeyboardInterrupt:
        print("[ingest_worker] interrupted by user; upload halted fail-closed.", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"[ingest_worker] error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
