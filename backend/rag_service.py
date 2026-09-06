from __future__ import annotations

import os
import glob
from typing import List, Optional

import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI

class RAGService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            print("Warning: No OpenAI API Key found. RAG will not work effectively.")
        
        self.client = OpenAI(api_key=self.api_key)
        
        # Initialize ChromaDB
        self.chroma_client = chromadb.PersistentClient(path="backend/data/db")
        
        # Use OpenAI Embedding Function
        self.embedding_fn = embedding_functions.OpenAIEmbeddingFunction(
            api_key=self.api_key,
            model_name="text-embedding-3-small"
        )
        
        self.collection = self.chroma_client.get_or_create_collection(
            name="codebase",
            embedding_function=self.embedding_fn
        )

    def index_repository(self, root_path: str, supported_extensions: List[str] = [".ts", ".py", ".md", ".json"]):
        """
        Recursively finds files and indexes them in ChromaDB.
        """
        if not os.path.isdir(root_path):
            return {"error": "Invalid directory"}

        files_processed = 0
        documents = []
        metadatas = []
        ids = []

        # Naive recursive walk
        for dirpath, _, filenames in os.walk(root_path):
            # Skip node_modules, .git, etc.
            if "node_modules" in dirpath or ".git" in dirpath or "backend/data" in dirpath:
                print(f"Skipping {dirpath}")
                continue
                
            for file in filenames:
                _, ext = os.path.splitext(file)
                if ext in supported_extensions:
                    full_path = os.path.join(dirpath, file)
                    try:
                        with open(full_path, "r", encoding="utf-8") as f:
                            content = f.read()
                            
                        # Chunking (very simple for now)
                        # In production, use a proper recursive text splitter
                        if not content.strip():
                            continue
                            
                        documents.append(content)
                        metadatas.append({"source": full_path})
                        ids.append(full_path)
                        files_processed += 1
                        
                    except Exception as e:
                        print(f"Error reading {full_path}: {e}")

        # Batch add to Chroma
        if documents:
            # Upsert overwrites existing IDs
            chunk_size = 100
            for i in range(0, len(documents), chunk_size):
                end = i + chunk_size
                print(f"Upserting batch {i} to {end}...")
                self.collection.upsert(
                    documents=documents[i:end],
                    metadatas=metadatas[i:end],
                    ids=ids[i:end]
                )

        return {"status": "success", "files_indexed": files_processed}

    def query(self, query_text: str, n_results=3):
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results
        )
        # results["documents"][0] is a list of strings
        context_str = "\n\n---\n\n".join(results["documents"][0]) if results["documents"] else ""
        return context_str

    def chat_with_context(self, message: str, editor_context: Optional[str] = None):
        context = self.query(message)
        if editor_context:
            context = f"Active editor context:\n{editor_context}\n\nRetrieved repository context:\n{context}"
        
        system_prompt = (
            "You are Bill the Mallard, a helpful coding AI duck. "
            "Use the provided context from the user's codebase to answer the question. "
            "If the answer isn't in the context, use your general knowledge but mention you didn't find it in the files. "
            "Always end with a faint 'Quack!'."
        )
        
        user_content = f"Context:\n{context}\n\nQuestion: {message}"

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.7
        )
        
        return response.choices[0].message.content
