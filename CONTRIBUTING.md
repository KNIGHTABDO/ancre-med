# Contributing to AncreMed ⚓🩺

We are thrilled that you are interested in contributing to AncreMed! 
Whether you are a medical student, a clinician, or a software engineer, your contributions help make this project more reliable and beneficial for clinical education.

---

## How Can You Contribute?

### 1. Curating the Knowledge Corpus
As guidelines evolve (especially from the Haute Autorité de Santé), text chunks in our database may become outdated. You can:
*   Report obsolete guidelines or incorrect SMR drug scores.
*   Contribute parsing scripts for new medical associations or collège textbooks.

### 2. Refining the Agentic Prompting
If you find that the Query Reformulator fails to translate specific medical acronyms correctly (e.g., confusing "AAG" with something non-clinical), you can submit improvements to:
*   The system instructions in [src/app/api/router/route.ts](src/app/api/router/route.ts).

### 3. Core Software Engineering
Help us improve the RAG performance:
*   Optimize SQLite FTS5 index parameters or tokenizer configuration.
*   Support local LLM alternatives (e.g., Llama.cpp, Ollama) for 100% offline runtime.
*   Resolve UI bugs or improve accessibility.

---

## Submission Guidelines

1.  **Fork the Repository:** Create a feature branch from the main branch.
2.  **Verify Types:** Make sure TypeScript compiler builds successfully without warnings:
    ```bash
    npm run typecheck
    ```
3.  **Run Production Build:** Verify that Next.js static files compile cleanly:
    ```bash
    npm run build
    ```
4.  **Submit a Pull Request:** Explain the rationale behind your change, citing official clinical guidelines or technical reasons where applicable.
