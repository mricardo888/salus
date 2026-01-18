"""
Salus API - FastAPI Backend
Provides endpoints for chat, file upload, and benefit analysis
"""
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage
import os
from dotenv import load_dotenv
from pathlib import Path
from config import GEMINI_MODEL_PATH

# Load environment variables
env_path = Path(__file__).parents[1] / '.env.local'
load_dotenv(dotenv_path=env_path)

# Initialize FastAPI
app = FastAPI(title="Salus API", version="1.0.0")

# CORS - allow both local and production
allowed_origins = [
    "http://localhost:3000",
    "https://salusify.tech",
    "https://www.salusify.tech",
    "https://salusify.herokuapp.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static Next.js build if it exists (for production)
static_path = Path(__file__).parents[1] / 'out'
if static_path.exists():
    app.mount("/_next", StaticFiles(directory=static_path / "_next"), name="next_static")
    
    @app.get("/")
    async def serve_index():
        return FileResponse(static_path / "index.html")

# Import agents
from agent import chat_graph, analysis_graph

# Request Models
class HistoryItem(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    policy_id: str
    message: str
    region: str = "Ontario"
    history: list[HistoryItem] = []

class AnalyzeRequest(BaseModel):
    policy_id: str
    region: str = "Ontario"
    bill_total: float = 5000.0
    service_type: str = "Emergency Room Visit"

# Store for uploaded files (in-memory for demo)
uploaded_files = {}

# === ENDPOINTS ===

@app.get("/")
async def root():
    return {"status": "online", "service": "Salus Backend", "version": "1.0.0"}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a hospital bill and analyze it with Gemini Vision"""
    try:
        file_location = f"uploads/{file.filename}"
        os.makedirs("uploads", exist_ok=True)
        
        content = await file.read()
        with open(file_location, "wb") as f:
            f.write(content)
        
        # Store file reference
        uploaded_files['latest'] = {
            'filename': file.filename,
            'path': file_location,
            'size': len(content)
        }
        
        # Use Gemini Vision to analyze the document
        import base64
        from google import genai
        
        api_key = os.getenv('GEMINI_API_KEY')
        extracted_data = {
            'filename': file.filename,
            'total': 0.0,
            'services': [],
            'service': 'Unknown',
            'date': 'Unknown',
            'uploaded': True
        }
        
        if api_key:
            try:
                client = genai.Client(api_key=api_key)
                
                # Encode image as base64
                image_base64 = base64.b64encode(content).decode('utf-8')
                
                # Determine mime type
                mime_type = "image/jpeg"
                if file.filename.lower().endswith('.png'):
                    mime_type = "image/png"
                elif file.filename.lower().endswith('.webp'):
                    mime_type = "image/webp"
                elif file.filename.lower().endswith('.pdf'):
                    mime_type = "application/pdf"
                
                # Call Gemini Vision to extract bill information
                vision_prompt = """Analyze this medical document. It could be:
- Hospital bill / statement
- Prescription drug receipt
- Pharmacy receipt
- Medical lab/test bill
- Insurance EOB (Explanation of Benefits)

Identify the document type and extract:

{
  "document_type": "hospital_bill" | "prescription" | "pharmacy" | "lab_test" | "insurance_eob" | "other",
  "total_charges": number (original total BEFORE any deductions),
  "insurance_paid": number (already covered by insurance, 0 if not shown),
  "patient_responsibility": number (actual amount owed),
  "services": ["list of items/services/medications"],
  "date_of_service": "string",
  "provider_name": "string (hospital, pharmacy, or clinic name)"
}

RULES:
- For prescriptions/pharmacy: services = medication names, provider = pharmacy
- If only one amount shown, it's likely patient_responsibility (already adjusted)
- Return ONLY valid JSON, no other text."""
                
                response = client.models.generate_content(
                    model=GEMINI_MODEL_PATH,
                    contents=[
                        {
                            "parts": [
                                {"text": vision_prompt},
                                {"inline_data": {"mime_type": mime_type, "data": image_base64}}
                            ]
                        }
                    ]
                )
                
                # Parse the response
                import json
                response_text = response.text.strip()
                # Remove markdown code blocks if present
                if response_text.startswith('```'):
                    response_text = response_text.split('```')[1]
                    if response_text.startswith('json'):
                        response_text = response_text[4:]
                
                bill_info = json.loads(response_text)
                
                # New structure that understands deductions
                total_charges = bill_info.get('total_charges') or bill_info.get('total_amount') or 0.0
                insurance_paid = bill_info.get('insurance_paid') or 0.0
                patient_responsibility = bill_info.get('patient_responsibility') or total_charges
                document_type = bill_info.get('document_type') or 'other'
                
                # Use total_charges as the bill total for analysis (original amount)
                # Store both for transparency
                extracted_data['total'] = total_charges
                extracted_data['total_charges'] = total_charges
                extracted_data['insurance_already_paid'] = insurance_paid
                extracted_data['patient_responsibility'] = patient_responsibility
                extracted_data['document_type'] = document_type
                extracted_data['services'] = bill_info.get('services') or []
                extracted_data['service'] = ', '.join(extracted_data['services'][:3]) if extracted_data['services'] else 'Medical Services'
                extracted_data['date'] = bill_info.get('date_of_service') or 'Unknown'
                extracted_data['provider'] = bill_info.get('provider_name') or 'Unknown'
                
            except Exception as e:
                print(f"Gemini Vision error: {e}")
                # Fall back to filename-based guess
                extracted_data['service'] = 'Medical Services (analysis pending)'
        
        uploaded_files['bill_data'] = extracted_data
        
        return {
            "filename": file.filename, 
            "status": "uploaded", 
            "path": file_location,
            "bill_data": extracted_data,
            "message": f"Document '{file.filename}' analyzed successfully."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """Chat with the Salus AI agent"""
    
    initial_state = {
        "messages": [],
        "user_message": request.message,
        "policy_id": request.policy_id,
        "region": request.region,
        "bill_data": uploaded_files.get('bill_data', {}),
        "private_coverage": 0.0,
        "public_coverage": 0.0,
        "final_cost": 0.0,
        "logs": [],
        "file_path": uploaded_files.get('latest', {}).get('path'),
        "analysis_complete": False,
        "history": [{"role": h.role, "content": h.content} for h in request.history]
    }
    
    try:
        result = chat_graph.invoke(initial_state)
        
        # Extract the AI response from messages
        ai_messages = [m for m in result.get('messages', []) if isinstance(m, AIMessage)]
        response_text = ai_messages[-1].content if ai_messages else "I'm here to help. How can I assist you today?"
        
        return {
            "response": response_text,
            "logs": result.get('logs', []),
            "analysis_complete": result.get('analysis_complete', False)
        }
    except Exception as e:
        return {
            "response": f"I apologize, I'm having trouble processing your request. Please try again. (Error: {str(e)[:100]})",
            "logs": [f"Error: {str(e)}"],
            "analysis_complete": False
        }


@app.post("/api/analyze")
async def analyze_endpoint(request: AnalyzeRequest):
    """Run the full 4-node Coordination of Benefits analysis using real bill data"""
    
    # Use real bill data from upload, or fallback to request params
    real_bill_data = uploaded_files.get('bill_data', {})
    if not real_bill_data.get('total'):
        real_bill_data = {"total": request.bill_total, "service": request.service_type}
    
    initial_state = {
        "messages": [],
        "user_message": "",
        "policy_id": request.policy_id,
        "region": request.region,
        "bill_data": real_bill_data,
        "private_coverage": 0.0,
        "public_coverage": 0.0,
        "final_cost": 0.0,
        "logs": [],
        "file_path": uploaded_files.get('latest', {}).get('path'),
        "analysis_complete": True,
        "history": []
    }
    
    try:
        result = analysis_graph.invoke(initial_state)
        
        bill_total = result.get('bill_data', {}).get('total', 0)
        
        return {
            "bill_total": bill_total,
            "private_coverage": result.get('private_coverage', 0),
            "public_coverage": result.get('public_coverage', 0),
            "final_cost": result.get('final_cost', 0),
            "logs": result.get('logs', []),
            "summary": f"After coordinating benefits, you pay: ${result.get('final_cost', 0):,.2f}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/status")
async def status_endpoint():
    """Get current session status"""
    return {
        "has_uploaded_file": 'latest' in uploaded_files,
        "uploaded_file": uploaded_files.get('latest', {}).get('filename'),
        "ready_for_analysis": 'latest' in uploaded_files
    }
