# -*- coding: utf-8 -*-
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import json
import sqlite3
import re

def clean_fts_query(query):
    # Split query into words, removing punctuation
    words = re.findall(r'\w+', query)
    # Join with OR
    return " OR ".join(f'"{word}"' for word in words if word)

def main():
    if len(sys.argv) < 2:
        print(json.dumps([]))
        return

    query = sys.argv[1].strip()
    if not query:
        print(json.dumps([]))
        return

    db_path = "clinical_ground_truth.db"
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
    except Exception as e:
        sys.stderr.write(f"SQLite connection error: {e}\n")
        print(json.dumps([]))
        return

    results = []
    
    # Try FTS5 search
    fts_query = clean_fts_query(query)
    if fts_query:
        try:
            # Query FTS5 table
            cursor.execute("""
                SELECT d.id, d.text_content, d.origin_title, d.category_silo, d.source_identifier, d.regulatory_date, d.page_number, d.chunk_index, fts.rank
                FROM documents_fts fts
                JOIN documents d ON d.rowid = fts.rowid
                WHERE documents_fts MATCH ?
                ORDER BY fts.rank
                LIMIT 15;
            """, (fts_query,))
            rows = cursor.fetchall()
            for r in rows:
                results.append({
                    "id": r[0],
                    "text_content": r[1],
                    "origin_title": r[2],
                    "category_silo": r[3],
                    "source_identifier": r[4],
                    "regulatory_date": r[5],
                    "page_number": r[6],
                    "chunk_index": r[7],
                    "score": float(r[8]) if r[8] is not None else 0.0
                })
        except Exception as e:
            sys.stderr.write(f"FTS5 query failed: {e}. Falling back to LIKE.\n")

    # Fallback to LIKE if FTS5 yielded no results
    if not results:
        try:
            # Simple keyword search on the main table
            words = re.findall(r'\w+', query)
            like_clause = " OR ".join(["text_content LIKE ?" for _ in words])
            params = [f"%{w}%" for w in words]
            
            if like_clause:
                cursor.execute(f"""
                    SELECT id, text_content, origin_title, category_silo, source_identifier, regulatory_date, page_number, chunk_index
                    FROM documents
                    WHERE {like_clause}
                    LIMIT 15;
                """, params)
                rows = cursor.fetchall()
                for i, r in enumerate(rows):
                    results.append({
                        "id": r[0],
                        "text_content": r[1],
                        "origin_title": r[2],
                        "category_silo": r[3],
                        "source_identifier": r[4],
                        "regulatory_date": r[5],
                        "page_number": r[6],
                        "chunk_index": r[7],
                        "score": -1.0 * i
                    })
        except Exception as e:
            sys.stderr.write(f"LIKE fallback failed: {e}\n")

    conn.close()
    
    # Sort and print JSON
    print(json.dumps(results, ensure_ascii=False))

if __name__ == "__main__":
    main()
