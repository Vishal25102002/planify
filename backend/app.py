from typing import List
from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
from rag_pipeline import get_answer, initialize_pipeline

# -------------------------------
# Logging Configuration
# -------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# -------------------------------
# FastAPI App Setup
# -------------------------------
app = FastAPI(title="RAG Chatbot API")

# Configure CORS (Allows requests from any origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# Pydantic Models
# -------------------------------
class QuestionRequest(BaseModel):
    question: str

# Only the answer is included in the response model now
class AnswerResponse(BaseModel):
    answer: str

# -------------------------------
# Dependency Injection for Retriever
# -------------------------------
def get_retriever():
    return app.state.retriever

# -------------------------------
# API Endpoints
# -------------------------------

@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {"status": "OK", "message": "RAG chatbot API is running"}

@app.get("/docs")
async def redirect_docs():
    """Redirects to Swagger UI"""
    return {"docs_url": "/docs"}

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(request: Request, request_body: QuestionRequest, retriever=Depends(get_retriever)):
    """Handles question answering with RAG pipeline"""
    try:
        logging.info(f"Received question: {request_body.question}")

        # Validate that retriever is initialized
        if not retriever:
            raise HTTPException(status_code=500, detail="Retriever is not initialized")

        # Process question
        result = get_answer(request_body.question, retriever)

        # Only include the answer in the response
        response_data = {
            "answer": result["answer"]
        }

        logging.info("Response generated successfully.")
        return response_data

    except Exception as e:
        logging.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------
# Startup Event (Runs once when API starts)
# -------------------------------
@app.on_event("startup")
async def startup_event():
    """Initialize RAG pipeline on startup"""
    try:
        logging.info("Initializing RAG pipeline...")
        app.state.retriever = initialize_pipeline()
        logging.info("RAG pipeline initialized successfully.")
    except Exception as e:
        logging.error(f"Failed to initialize RAG pipeline: {str(e)}")
        raise RuntimeError(f"Failed to initialize RAG pipeline: {str(e)}")

# -------------------------------
# Main Execution (For Local Running)
# -------------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000, reload=True)
