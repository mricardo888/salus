"""
Salus Actuary Agent - Real Gemini-Powered Chatbot
Uses google-genai SDK and LangGraph for Coordination of Benefits
"""
from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
import os
import operator
from dotenv import load_dotenv
from pathlib import Path
from google import genai

# Load environment variables
env_path = Path(__file__).parents[1] / '.env.local'
load_dotenv(dotenv_path=env_path)

# Initialize Gemini client
api_key = os.getenv('GEMINI_API_KEY')
client = genai.Client(api_key=api_key) if api_key else None

# Define Agent State
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    bill_data: dict
    policy_id: str
    region: str
    private_coverage: float
    public_coverage: float
    final_cost: float
    logs: Annotated[list[str], operator.add]
    file_path: str | None
    user_message: str
    analysis_complete: bool
    history: list[dict]

# System prompt for Salus
SALUS_SYSTEM_PROMPT = """You are Salus, a friendly insurance benefits coordinator. You help users understand their medical bills and find coverage.

IMPORTANT RULES:
- Respond in plain text only. NO markdown, NO asterisks, NO bullet points.
- Keep responses short (2-3 sentences).
- Be warm and reassuring.
- Always reference the specific bill details when available.

Current Context:
- Region: {region}
- Policy ID: {policy_id}
{bill_context}

If a bill has been uploaded, always mention the specific filename and amount in your response."""


def create_chat_response(state: AgentState) -> dict:
    """Main chat node - uses google-genai for Gemini"""
    
    user_message = state.get('user_message', '')
    region = state.get('region', 'Ontario')
    policy_id = state.get('policy_id', 'Unknown')
    bill_data = state.get('bill_data', {})
    
    # Build bill context
    bill_context = ""
    if bill_data and bill_data.get('uploaded'):
        filename = bill_data.get('filename', 'document')
        total = bill_data.get('total', 0)
        services = bill_data.get('services', [])
        date = bill_data.get('date', 'Unknown')
        provider = bill_data.get('provider', 'Unknown')
        
        services_text = ""
        if services:
            for i, svc in enumerate(services, 1):
                services_text += f"  {i}. {svc}\n"
        else:
            services_text = "  (No itemized services found)\n"
        
        bill_context = f"""
UPLOADED BILL DETAILS:
- Document: {filename}
- Provider: {provider}
- Date of Service: {date}
- Total Amount: ${total:,.2f}
- Services/Items:
{services_text}"""
    else:
        bill_context = "\nNo bill uploaded yet."
    
    system_prompt = SALUS_SYSTEM_PROMPT.format(
        region=region, 
        policy_id=policy_id,
        bill_context=bill_context
    )
    
    # Build conversation history
    history = state.get('history', [])
    conversation = ""
    for msg in history:
        role = "User" if msg.get('role') == 'user' else "Salus"
        conversation += f"{role}: {msg.get('content', '')}\n"
    
    is_coverage_query = any(word in user_message.lower() for word in 
                           ['yes', 'confirm', 'correct', 'check', 'coverage', 'pay', 'cost', 'analyze', 'run'])
    
    try:
        if client:
            # Include history in the prompt
            full_prompt = f"{system_prompt}\n\nConversation so far:\n{conversation}\nUser: {user_message}\n\nSalus:"
            response = client.models.generate_content(
                model='models/gemini-3-flash-preview',
                contents=full_prompt
            )
            ai_response = response.text
        else:
            ai_response = "I'm here to help you understand your medical bills and find coverage. Please tell me about your situation."
    except Exception as e:
        error_str = str(e)
        print(f"Gemini error: {error_str}")
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            ai_response = "I'm currently experiencing high demand. Please wait a moment and try again. In the meantime, know that I'm here to help you find coverage for your medical bills."
        else:
            ai_response = "I understand you're concerned about your medical bills. I'm here to help you find coverage from both your insurance and government programs. Could you tell me more about the bill you received?"
    
    return {
        "messages": [HumanMessage(content=user_message), AIMessage(content=ai_response)],
        "logs": [f"Chat: Responded to user"],
        "analysis_complete": is_coverage_query
    }


def extract_bill_info(state: AgentState) -> dict:
    """Node 1: Extractor - Uses real uploaded bill data"""
    logs = []
    
    logs.append("Extractor: Starting bill analysis...")
    
    bill_data = state.get('bill_data', {})
    
    # Use real data if available
    bill_total = bill_data.get('total', 0) or 0
    services = bill_data.get('services', [])
    service_type = bill_data.get('service', 'Medical Services')
    provider = bill_data.get('provider', 'Unknown')
    
    logs.append(f"Extractor: Document source: {provider}")
    
    if services:
        service_summary = ', '.join(services[:3])
        logs.append(f"Extractor: Found {len(services)} service(s): {service_summary}")
    else:
        service_summary = service_type
        logs.append(f"Extractor: Service type: {service_type}")
    
    logs.append(f"Extractor: Total bill amount: ${bill_total:,.2f}")
    logs.append("Extractor: Analysis complete. Passing to Adjuster...")
    
    return {
        "bill_data": {
            "total": bill_total, 
            "service": service_type,
            "services": services,
            "provider": provider
        },
        "logs": logs
    }


def check_private_insurance(state: AgentState) -> dict:
    """Node 2: Private Adjuster - Uses Gemini to analyze insurance coverage"""
    logs = []
    
    logs.append("Adjuster: Starting insurance coverage analysis...")
    
    policy_id = state.get('policy_id', '')
    bill_data = state.get('bill_data', {})
    bill_total = bill_data.get('total', 0)
    services = bill_data.get('services', [])
    service_type = bill_data.get('service', 'Medical Services')
    
    logs.append(f"Adjuster: Checking policy #{policy_id[:8] if policy_id else 'N/A'}...")
    
    coverage_amount = 0.0
    reasoning = "Unable to analyze"
    
    if client and bill_total > 0:
        try:
            logs.append("Adjuster: Connecting to Gemini AI...")
            
            prompt = f"""You are an insurance adjuster AI. Analyze this claim and determine coverage.

Bill Details:
- Total Amount: ${bill_total:.2f}
- Services: {', '.join(services) if services else service_type}
- Policy ID: {policy_id}

Based on typical private insurance policies:
- Prescription drugs: 80% coverage
- Emergency services: 80% coverage  
- Ambulance: 100% coverage
- Surgery: 85% coverage
- General medical: 70% coverage

Calculate the coverage amount and explain briefly. Respond in this exact format:
COVERAGE_PERCENT: [number]
COVERAGE_AMOUNT: [number]
REASONING: [one sentence explanation]"""

            logs.append("Adjuster: Sending coverage analysis request...")
            
            response = client.models.generate_content(
                model='models/gemini-3-flash-preview',
                contents=prompt
            )
            
            logs.append("Adjuster: Response received. Parsing coverage data...")
            
            # Parse response
            text = response.text
            for line in text.split('\n'):
                if 'COVERAGE_AMOUNT:' in line:
                    try:
                        coverage_amount = float(line.split(':')[1].strip().replace('$', '').replace(',', ''))
                    except:
                        coverage_amount = bill_total * 0.7
                if 'REASONING:' in line:
                    reasoning = line.split(':', 1)[1].strip()
                    
            logs.append(f"Adjuster: {reasoning}")
            logs.append(f"Adjuster: Coverage amount: ${coverage_amount:,.2f}")
                    
        except Exception as e:
            logs.append(f"Adjuster: AI unavailable, using fallback rules...")
            coverage_amount = bill_total * 0.7
            reasoning = "Default 70% coverage applied"
            logs.append(f"Adjuster: {reasoning} - ${coverage_amount:,.2f}")
    else:
        coverage_amount = bill_total * 0.7
        logs.append("Adjuster: Using standard coverage calculation")
        logs.append(f"Adjuster: Coverage: ${coverage_amount:,.2f}")
    
    logs.append("Adjuster: Complete. Passing to Social Worker...")
    
    return {
        "private_coverage": coverage_amount,
        "logs": logs
    }


def check_public_aid(state: AgentState) -> dict:
    """Node 3: Social Worker - Uses Gemini to find government aid programs"""
    logs = []
    
    logs.append("Social Worker: Starting government aid search...")
    
    region = state.get('region', 'Ontario')
    bill_data = state.get('bill_data', {})
    bill_total = bill_data.get('total', 0)
    services = bill_data.get('services', [])
    private_coverage = state.get('private_coverage', 0)
    remaining = bill_total - private_coverage
    
    logs.append(f"Social Worker: Region: {region}")
    logs.append(f"Social Worker: Remaining balance after insurance: ${remaining:,.2f}")
    
    public_aid = 0.0
    program_found = "No program found"
    
    if client and remaining > 0:
        try:
            logs.append("Social Worker: Connecting to Gemini AI...")
            logs.append("Social Worker: Querying government program database...")
            
            prompt = f"""You are a social worker AI helping find government aid programs.

Patient Situation:
- Region: {region}
- Bill Total: ${bill_total:.2f}
- Private Insurance Covered: ${private_coverage:.2f}
- Remaining Balance: ${remaining:.2f}
- Services: {', '.join(services) if services else 'Medical services'}

Find applicable government programs. Consider:
- Ontario: OHIP, Ontario Works, Trillium Drug Program
- Quebec: RAMQ, Social Assistance
- USA/New York: Medicaid, Medicare, Hospital Financial Assistance

Respond in this exact format:
PROGRAM_NAME: [name of program or "None"]
AID_AMOUNT: [number - how much this program covers]
REASONING: [one sentence explanation]"""

            response = client.models.generate_content(
                model='models/gemini-3-flash-preview',
                contents=prompt
            )
            
            logs.append("Social Worker: Response received. Analyzing programs...")
            
            text = response.text
            for line in text.split('\n'):
                if 'PROGRAM_NAME:' in line:
                    program_found = line.split(':', 1)[1].strip()
                if 'AID_AMOUNT:' in line:
                    try:
                        public_aid = float(line.split(':')[1].strip().replace('$', '').replace(',', ''))
                    except:
                        public_aid = 0.0
            
            if public_aid > 0:
                logs.append(f"Social Worker: Found program: {program_found}")
                logs.append(f"Social Worker: Aid amount: ${public_aid:,.2f}")
            else:
                logs.append("Social Worker: No matching programs found")
                        
        except Exception as e:
            logs.append("Social Worker: AI unavailable, using fallback...")
            if remaining > 0 and region in ["Ontario", "Canada"]:
                public_aid = min(remaining, 500.0)
                program_found = "Ontario Works Emergency Assistance"
                logs.append(f"Social Worker: Fallback: {program_found} - ${public_aid:,.2f}")
    else:
        if remaining <= 0:
            logs.append("Social Worker: No remaining balance - no aid needed!")
        else:
            logs.append("Social Worker: Checking local programs...")
    
    logs.append("Social Worker: Complete. Passing to Coordinator...")
    
    return {"public_coverage": public_aid, "logs": logs}


def coordinate_benefits(state: AgentState) -> dict:
    """Node 4: Coordinator - Uses Gemini to summarize and calculate final cost"""
    logs = []
    
    logs.append("Coordinator: Starting final benefit calculation...")
    
    bill_data = state.get('bill_data', {})
    bill_total = bill_data.get('total', 0)
    private = state.get('private_coverage', 0)
    public = state.get('public_coverage', 0)
    you_pay = max(0, bill_total - private - public)
    
    logs.append(f"Coordinator: Original bill: ${bill_total:,.2f}")
    logs.append(f"Coordinator: Private insurance: ${private:,.2f}")
    logs.append(f"Coordinator: Government aid: ${public:,.2f}")
    logs.append(f"Coordinator: Calculating final amount...")
    
    summary = f"You pay ${you_pay:,.2f}"
    
    if client:
        try:
            logs.append("Coordinator: Connecting to Gemini AI...")
            logs.append("Coordinator: Generating summary...")
            
            prompt = f"""You are the Coordinator AI finalizing a Coordination of Benefits calculation.

Final Numbers:
- Original Bill: ${bill_total:.2f}
- Private Insurance Paid: ${private:.2f}
- Government Aid: ${public:.2f}
- Patient Responsibility: ${you_pay:.2f}

Provide a brief, encouraging summary in one sentence. No markdown. Be warm and reassuring."""

            response = client.models.generate_content(
                model='models/gemini-3-flash-preview',
                contents=prompt
            )
            summary = response.text.strip()
            logs.append(f"Coordinator: {summary}")
        except Exception as e:
            logs.append("Coordinator: Using standard calculation...")
            logs.append(f"Coordinator: Final amount due: ${you_pay:,.2f}")
    else:
        logs.append(f"Coordinator: Final amount due: ${you_pay:,.2f}")
    
    logs.append("Coordinator: Analysis complete!")
    
    return {
        "final_cost": you_pay,
        "logs": logs
    }


# Build graphs
def build_chat_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("chat", create_chat_response)
    workflow.set_entry_point("chat")
    workflow.add_edge("chat", END)
    return workflow.compile()


def build_analysis_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("extractor", extract_bill_info)
    workflow.add_node("adjuster", check_private_insurance)
    workflow.add_node("social_worker", check_public_aid)
    workflow.add_node("coordinator", coordinate_benefits)
    
    workflow.set_entry_point("extractor")
    workflow.add_edge("extractor", "adjuster")
    workflow.add_edge("adjuster", "social_worker")
    workflow.add_edge("social_worker", "coordinator")
    workflow.add_edge("coordinator", END)
    return workflow.compile()


chat_graph = build_chat_graph()
analysis_graph = build_analysis_graph()
app_graph = analysis_graph
