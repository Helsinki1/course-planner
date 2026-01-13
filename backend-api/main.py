import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# LangChain imports for semantic search
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma, FAISS
from langchain.schema import Document

load_dotenv()

app = Flask(__name__)

# CORS configuration - allow the Next.js frontend
CORS(app, origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
])

# ============================================================================
# Vector Store Setup (lazy initialization)
# ============================================================================

_vector_store = None


def get_vector_store():
    """
    Lazy initialization of the vector store.
    In production, you would load your pre-indexed course data here.
    """
    global _vector_store
    
    if _vector_store is None:
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            return None, "OpenAI API key not configured for embeddings"
        
        embeddings = OpenAIEmbeddings(openai_api_key=openai_api_key)
        
        # Placeholder: In production, load your actual course data
        # For now, create an empty Chroma store
        _vector_store = Chroma(
            collection_name="courses",
            embedding_function=embeddings,
            persist_directory="./chroma_db",
        )
    
    return _vector_store, None


# ============================================================================
# Endpoints
# ============================================================================

@app.route("/")
def root():
    return jsonify({"message": "Course Planner API is running"})


@app.route("/api/mapbox-token", methods=["GET"])
def get_mapbox_token():
    """
    Return the Mapbox token for the frontend map component.
    In production, add rate limiting, session validation, etc.
    """
    token = os.getenv("MAPBOX_SECRET_TOKEN")
    
    if not token:
        return jsonify({"error": "Mapbox token not configured"}), 500
    
    response = jsonify({"token": token})
    response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


@app.route("/api/search", methods=["POST"])
def semantic_search():
    """
    Perform semantic search over the course vector database.
    """
    try:
        data = request.get_json()
        query = data.get("query", "")
        top_k = data.get("top_k", 5)
        
        vector_store, error = get_vector_store()
        if error:
            return jsonify({"error": error}), 500
        
        # Perform similarity search
        docs_with_scores = vector_store.similarity_search_with_score(query, k=top_k)
        
        results = [
            {
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": score,
            }
            for doc, score in docs_with_scores
        ]
        
        return jsonify({"results": results})
    
    except Exception as e:
        return jsonify({"error": f"Search failed: {str(e)}"}), 500


@app.route("/api/index", methods=["POST"])
def index_documents():
    """
    Index new documents into the vector store.
    Each document should have 'content' and optional 'metadata'.
    """
    try:
        documents = request.get_json()
        
        vector_store, error = get_vector_store()
        if error:
            return jsonify({"error": error}), 500
        
        docs = [
            Document(
                page_content=doc["content"],
                metadata=doc.get("metadata", {}),
            )
            for doc in documents
        ]
        
        vector_store.add_documents(docs)
        
        return jsonify({"message": f"Successfully indexed {len(docs)} documents"}), 201
    
    except Exception as e:
        return jsonify({"error": f"Indexing failed: {str(e)}"}), 500


# ============================================================================
# Run with: flask run --port 8000 --debug
# Or: python main.py
# ============================================================================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
