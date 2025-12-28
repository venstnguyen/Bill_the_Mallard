# Bill the Mallard - Full Stack Edition 🦆

Bill has been upgraded to a powerful RAG-enabled coding buddy with a local Python backend.

## Architecture
- **Frontend**: VS Code Extension (TypeScript)
- **Backend**: FastAPI (Python) running on `localhost:8000`
- **Brain**: OpenAI (GPT-4o-mini) + ChromaDB (Vector Search)

## Setup Instructions

### 1. Requirements
- Python 3.10+
- Node.js (for extension)
- OpenAI API Key

### 2. Start the Backend
1. Open a terminal in the root workspace.
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Export your API key:
   ```bash
   export OPENAI_API_KEY="sk-..."
   ```
4. Run the server:
   ```bash
   python backend/main.py
   ```
   *Verify it's running at [http://127.0.0.1:8000](http://127.0.0.1:8000)*

### 3. Use the Extension
1. Press `F5` to launch the Extension Host.
2. Open the "Bill" view in the Activity Bar.
3. **Chat**: Type "How does this app work?" to chat with Bill.
4. **Commands** (`Cmd+Shift+P`):
   - `Bill: Index Repository 🧠`: Scans your files and builds the "brain" (Vector DB). **Run this first!**
   - `Bill: Analyze & Refactor File 🔨`: Generates a refactor plan for the active file.
   - `Bill: Generate Dev Diary 📝`: Reads your git log and writes a LinkedIn post.

## Features Implemented
- **RAG Chat**: Context-aware answers based on your actual code.
- **Refactor Agent**: Static metrics + LLM advice.
- **Dev Diary**: Automated social media summaries from git history.
