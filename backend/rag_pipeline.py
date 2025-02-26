import logging.config
import fitz  # PyMuPDF
from PIL import Image
import pytesseract
import logging
import warnings
import io
# import torch
from typing import List, Dict
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

warnings.filterwarnings('ignore')
# -------------------------------
# Configuration
# -------------------------------
FILE_PATH = "data/hackney-community-strategy-2018-2028.pdf"
PINECONE_API_KEY = "pcsk_2e1eb9_Hgzagrk5Sj32AEFx1JyojfC5mi71qGfHN9YAamU2YdL47tasmh8QZHNaLJE1nSY"
INDEX_NAME = "newchatbot"
MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"
BATCH_SIZE = 256
# DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DIMENSION = 768
# Updated API token for Google Gemini – replace with your actual API key
GOOGLE_GEMINI_API_KEY = "AIzaSyA7zT1-4oEyPcToeKETl4-wPK07EvQ5sUM"

# -------------------------------
# Initialize Components
# -------------------------------
pc = Pinecone(api_key=PINECONE_API_KEY)
embedder = SentenceTransformer(MODEL_NAME, device="cpu")

# -------------------------------
# Document Processing Functions
# -------------------------------
def load_and_process_documents(file_path: str) -> List[Document]:
    """Load documents with text and image OCR processing."""
    doc = fitz.open(file_path)
    documents = []
    
    for page_num in range(len(doc)):
        try:
            page = doc.load_page(page_num)
            text = page.get_text()
            
            # Process images on the page
            img_list = page.get_images(full=True)
            for img_index, img in enumerate(img_list):
                base_image = doc.extract_image(img[0])
                image_bytes = base_image["image"]
                try:
                    image = Image.open(io.BytesIO(image_bytes))
                    ocr_text = pytesseract.image_to_string(image)
                    text += f"\n[IMAGE {img_index+1} TEXT]: {ocr_text}"
                except Exception as e:
                    print(f"OCR Error on page {page_num}: {str(e)}")
            
            metadata = {
                "source": file_path,
                "page": page_num + 1,
                "has_images": len(img_list) > 0
            }
            documents.append(Document(page_content=text, metadata=metadata))
        except Exception as e:
            print(f"Error processing page {page_num}: {str(e)}")
            continue
    
    print(f"Processed {len(documents)} pages with OCR")
    return documents

def chunk_documents(documents: List[Document]) -> List[Dict]:
    """Split documents into chunks with metadata."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " "]
    )
    
    chunks = []
    chunk_id = 0
    for doc in documents:
        doc_chunks = splitter.split_documents([doc])
        for chunk in doc_chunks:
            chunk_dict = {
                "id": str(chunk_id),
                "text": chunk.page_content,
                "metadata": {
                    "text": chunk.page_content,
                    "page": chunk.metadata["page"],
                    "has_images": chunk.metadata["has_images"],
                    "source": chunk.metadata["source"]
                }
            }
            chunks.append(chunk_dict)
            chunk_id += 1
    
    print(f"Created {len(chunks)} chunks")
    return chunks

# -------------------------------
# Pinecone Functions
# -------------------------------
def get_pinecone_index():
    """Connect to an existing Pinecone index."""
    return pc.Index(INDEX_NAME)

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings in batches."""
    embeddings = embedder.encode(
        texts, 
        batch_size=BATCH_SIZE,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=True
    )
    return embeddings.tolist()

def insert_data(index, chunks: List[Dict]):
    """Insert data with embeddings into Pinecone."""
    texts = [chunk["text"] for chunk in chunks]
    embeddings = generate_embeddings(texts)
    
    vectors = []
    for chunk, embedding in zip(chunks, embeddings):
        vectors.append({
            "id": chunk["id"],
            "values": embedding,
            "metadata": chunk["metadata"]
        })
    
    for i in range(0, len(vectors), BATCH_SIZE):
        batch = vectors[i:i+BATCH_SIZE]
        index.upsert(vectors=batch)
    
    print(f"Inserted {len(vectors)} records")

# -------------------------------
# Retriever Class
# -------------------------------
class PineconeRetriever:
    def __init__(self, index):
        self.index = index
    
    def search(self, query: str, top_k: int = 5, filters: dict = None) -> List[Document]:
        query_embedding = embedder.encode(query, convert_to_numpy=True).tolist()
        
        pinecone_filter = {}
        if filters:
            if "pages" in filters:
                pinecone_filter["page"] = {"$in": filters["pages"]}
            if "has_images" in filters:
                pinecone_filter["has_images"] = {"$eq": filters["has_images"]}
        
        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter=pinecone_filter
        )
        
        documents = []
        for match in results["matches"]:
            doc = Document(
                page_content=match.metadata["text"],
                metadata={
                    "page": match.metadata["page"],
                    "has_images": match.metadata["has_images"],
                    "score": match.score
                }
            )
            documents.append(doc)
        
        return documents

# ----------------------------------
# Initialization and Query Functions
# ----------------------------------
def initialize_pipeline():
    """Initialize the RAG pipeline and return a retriever."""
    print("Initializing RAG pipeline...")
    index = get_pinecone_index()
    raw_docs = load_and_process_documents(FILE_PATH)
    chunks = chunk_documents(raw_docs)
    insert_data(index, chunks)
    return PineconeRetriever(index)

def get_answer(query: str, retriever: PineconeRetriever) -> dict:
    """Generate an answer with reference data for a given query."""
    results = retriever.search(query, top_k=3)
    
    # Check if the highest similarity score is below threshold (0.3)
    if results:
        max_score = max(float(doc.metadata.get("score", 0)) for doc in results)
        if max_score < 0.2:
            context = ""
            references = []
        else:
            context = "\n\n".join([doc.page_content for doc in results])
            references = [
                {
                    "content": doc.page_content[:500] + "...",
                    "page": doc.metadata["page"],
                    "score": f"{doc.metadata['score']:.4f}"
                }
                for doc in results
            ]
    else:
        context = ""
        references = []
    
    template = """
You are "Planify AI," a highly intelligent and conversational AI assistant. Your primary role is to assist users in answering questions, providing guidance, engaging in meaningful conversations, and adapting to various topics with a natural and informative approach.

Greeting & Context Awareness: If the user initiates the conversation with a greeting (e.g., "Hi," "Hello," "Good morning"), respond warmly and naturally. Do not greet the user in every response—only when appropriate.
Conversational Memory: Maintain chat history context to provide coherent, continuous interactions while adapting responses based on previous exchanges.
General Knowledge & Assistance: Answer a wide range of questions, including general knowledge, technical topics, recommendations, problem-solving, and creative brainstorming.
Context Utilization: If relevant information from a retrieved knowledge base or document is available, use it to enhance responses. Otherwise, acknowledge when an answer is unavailable.
Concise & Clear Responses: Provide well-structured, concise answers with a maximum of ten sentences unless the question requires a more detailed explanation.
Adaptability & Tone: Adjust your response style and depth based on user intent—being friendly in casual chats, professional in formal queries, and empathetic when needed.
Avoid Unnecessary Repetition: Ensure responses are varied, avoiding redundant phrases unless necessary for clarity.
Instruction for Processing Questions:

Question: {question}

Context (if available): {context}

Answer:

"""
    prompt = ChatPromptTemplate.from_template(template)
    
    # Instantiate the Google Gemini 1.5 Flash endpoint
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
            temperature=0.7,
            max_tokens=512,
            timeout=None,
            max_retries=2,
            api_key=GOOGLE_GEMINI_API_KEY
    )
    
    chain = (
        {"context": lambda _: context, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return {
        "answer": chain.invoke(query),
        "references": references
    }

# -------------------------------
# Main Function
# -------------------------------
if __name__ == "__main__":
    # Initialize the pipeline and get a retriever
    retriever = initialize_pipeline()
    
    print("\n--- RAG Pipeline is Ready ---")
    print("Type your question and press Enter (or type 'exit' to quit).")
    
    while True:
        user_query = input("\nEnter your question: ")
        if user_query.strip().lower() == "exit":
            print("Exiting...")
            break
        
        result = get_answer(user_query, retriever)
        
        print("\nAnswer:")
        print(result["answer"])
        if result["references"]:
            print("\nReferences:")
            for ref in result["references"]:
                print(f"Page: {ref['page']} (Score: {ref['score']})")
                print(ref["content"])
                print("-" * 80)
        else:
            print("\nNo relevant PDF content was used in this response.")
