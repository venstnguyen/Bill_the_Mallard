from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uvicorn

from rag_service import RAGService

app = FastAPI(title="Bill the Mallard Backend")

# Allow CORS for VS Code extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    context: str | None = None

class IndexRequest(BaseModel):
    root_path: str

# Initialize RAG Service (assumes API Key is in env or passed)
rag = RAGService()

@app.get("/")
async def root():
    return {"status": "ok", "message": "Bill the Mallard Backend is running"}

@app.post("/index")
async def index_repo(request: IndexRequest):
    result = rag.index_repository(request.root_path)
    return result

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        reply = rag.chat_with_context(request.message)
        return {"reply": reply}
    except Exception as e:
        print(f"Error in chat: {e}")
        return {"reply": f"Quack! Something went wrong: {str(e)}"}

class RefactorRequest(BaseModel):
    file_content: str
    filename: str

@app.post("/analyze")
async def analyze_refactor(request: RefactorRequest):
    # Static Metrics
    import re
    lines = len(request.file_content.split('\n'))
    
    # Naive function count (looks for 'def ' or 'function ' or '=>')
    # This is a heuristic for demonstration purposes
    func_matches = re.findall(r'(def\s+)|(function\s+)|(=>\s*{)', request.file_content)
    function_count = len(func_matches)
    
    # Ask LLM for plan
    prompt = (
        f"You are a senior developer. Analyze this {request.filename} file."
        f"\nMetrics: {lines} lines, ~{function_count} functions."
        "List 3 specific refactoring opportunities. Be concise."
        f"\n\nCode:\n{request.file_content[:4000]}" # Truncate for safety
    )
    
    try:
        response = rag.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        plan = response.choices[0].message.content
    except Exception as e:
        plan = f"Could not generate plan: {e}"

    return {
        "metrics": {"lines": lines},
        "plan": plan
    }

class DiaryRequest(BaseModel):
    commits: List[str]

@app.post("/summarize_commits")
async def dev_diary(request: DiaryRequest):
    commits_text = "\n---\n".join(request.commits)
    prompt = (
        "You are a tech influencer. Summarize these git commits into a LinkedIn post. "
        "Use emojis, make it sound exciting, and describe the technical achievements."
        f"\n\nCommits:\n{commits_text}"
    )
    
    try:
        response = rag.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        post = response.choices[0].message.content
    except Exception as e:
        post = f"Could not generate diary: {e}"
        
    return {"post": post}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
