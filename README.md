# Bill the Mallard - Full Stack Edition

Bill is a VS Code coding companion that combines a sidebar chat experience with a local Python RAG service. Ask questions about the current repository, generate a refactor plan for the active file, or turn recent Git work into a developer diary entry.

## Architecture
- **Frontend**: VS Code Extension (TypeScript)
- **Backend**: FastAPI (Python) running on `localhost:8000`
- **Brain**: OpenAI GPT-4o-mini + `text-embedding-3-small` + ChromaDB

## Setup Instructions

### 1. Requirements
- Python 3.10+
- Node.js (for extension)
- OpenAI API Key

### 2. Start the Backend
1. Open a terminal in the root workspace.
2. Create and activate a virtual environment:
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    ```
2. Install dependencies:
   ```bash
   python3 -m pip install -r backend/requirements.txt
   ```
3. Export your API key:
   ```bash
   export OPENAI_API_KEY="sk-..."
   ```
4. Run the server:
   ```bash
    python backend/main.py
   ```
   Verify it is running at [http://127.0.0.1:8000](http://127.0.0.1:8000). The backend needs `OPENAI_API_KEY` for indexing, chat, analysis, and diary generation.

### 3. Use the Extension
1. Run `npm install` and `npm run compile`.
2. Press `F5` to launch the Extension Host.
3. Open the "Bill" view in the Activity Bar.
4. Run `Bill: Index Repository` before asking repository questions.
5. **Chat**: Type "How does this app work?" to chat with Bill.
6. **Commands** (`Cmd+Shift+P`):
   - `Bill: Index Repository 🧠`: Scans your files and builds the "brain" (Vector DB). **Run this first!**
   - `Bill: Analyze & Refactor File 🔨`: Generates a refactor plan for the active file.
   - `Bill: Generate Dev Diary 📝`: Reads your git log and writes a LinkedIn post.

## Features Implemented
- **RAG Chat**: Semantic retrieval over supported source files, with active-editor context included in the prompt.
- **Refactor Agent**: Line-count and heuristic function metrics plus three concise LLM recommendations, shown in a Markdown editor beside the active file.
- **Dev Diary**: The latest five commit subjects are summarized into a LinkedIn-ready Markdown post.
- **Repository filtering**: Indexing skips `.git`, `node_modules`, and the local ChromaDB data directory.

## Development

Run `npm run watch` while editing the extension. Run `python3 -m py_compile backend/main.py backend/rag_service.py` for a quick backend syntax check. The vector database is stored under `backend/data/db` and is ignored from source control.
