"""
Salus Actuary Agent - Real Gemini-Powered Chatbot
Uses google-genai SDK and LangGraph for Coordination of Benefits
"""
from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
import operator
from google import genai
from database import find_insurance_plan, find_government_program, get_coverage_summary
from config import (
    GEMINI_MODEL_PATH, GEMINI_API_KEY, 
    ADJUSTER_PROMPT, SOCIAL_WORKER_PROMPT, COORDINATOR_PROMPT, CHAT_SYSTEM_PROMPT
)

# Initialize Gemini client
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

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
                model=GEMINI_MODEL_PATH,
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
    """Node 2: Private Insurance Adjuster Agent - LLM-powered with MongoDB data"""
    logs = []
    
    logs.append("Adjuster Agent: Initializing...")
    logs.append("Adjuster Agent: Loading insurance adjuster persona...")
    
    policy_id = state.get('policy_id', '')
    bill_data = state.get('bill_data', {})
    bill_total = bill_data.get('total', 0)
    services = bill_data.get('services', [])
    service_type = bill_data.get('service', 'Medical Services')
    
    logs.append(f"Adjuster Agent: Analyzing claim for policy #{policy_id[:8] if policy_id else 'N/A'}")
    logs.append(f"Adjuster Agent: Bill amount: ${bill_total:.2f}")
    logs.append(f"Adjuster Agent: Services: {', '.join(services) if services else service_type}")
    
    # Query MongoDB for insurance plan data
    logs.append("Adjuster Agent: Querying insurance database...")
    insurance_plan = find_insurance_plan(provider="Sun Life")  # Default to Sun Life
    
    plan_info = "No insurance plan found in database"
    coverage_rate = 0.70  # Default fallback
    
    if insurance_plan:
        logs.append(f"Adjuster Agent: Found plan: {insurance_plan.get('provider')} {insurance_plan.get('plan_name')}")
        coverage_rate = insurance_plan.get('prescription_coverage', 0.70)
        plan_info = f"""
INSURANCE PLAN FROM DATABASE:
- Provider: {insurance_plan.get('provider')}
- Plan Name: {insurance_plan.get('plan_name')}
- Coverage Rate: {int(coverage_rate * 100)}%
- Annual Maximum: ${insurance_plan.get('annual_max', 0):,}
- Deductible: ${insurance_plan.get('deductible', 0)}"""
    else:
        logs.append("Adjuster Agent: No plan in database, using default coverage rates")
    
    coverage_amount = 0.0
    
    if client and bill_total > 0:
        try:
            logs.append("Adjuster Agent: Connecting to Gemini LLM...")
            logs.append("Adjuster Agent: Processing with insurance expertise...")
            
            prompt = f"""You are ADJUSTER, a specialized Private Insurance Claims Adjuster AI Agent.

YOUR PERSONA: You are a meticulous, detail-oriented insurance professional with 20 years of experience. You analyze claims fairly but always look for ways to maximize coverage for the patient within policy guidelines.

TASK: Analyze this insurance claim and determine the coverage amount.

CLAIM DETAILS:
- Policy ID: {policy_id}
- Bill Total: ${bill_total:.2f}
- Services: {', '.join(services) if services else service_type}
{plan_info}

STEP-BY-STEP REASONING (show your work):
1. Identify the service category
2. Determine applicable coverage rate
3. Calculate the coverage amount
4. Provide your professional assessment

RESPOND IN THIS EXACT FORMAT:
REASONING: [Your step-by-step analysis]
COVERAGE_RATE: [percentage as decimal, e.g., 0.80]
COVERAGE_AMOUNT: [calculated dollar amount]
ASSESSMENT: [One sentence professional opinion]"""

            response = client.models.generate_content(
                model=GEMINI_MODEL_PATH,
                contents=prompt
            )
            
            logs.append("Adjuster Agent: LLM response received")
            
            text = response.text
            # Parse the structured response
            for line in text.split('\n'):
                if 'REASONING:' in line:
                    reasoning = line.split(':', 1)[1].strip()
                    logs.append(f"Adjuster Agent [REASONING]: {reasoning[:150]}...")
                if 'COVERAGE_AMOUNT:' in line:
                    try:
                        coverage_amount = float(line.split(':')[1].strip().replace('$', '').replace(',', ''))
                    except:
                        coverage_amount = bill_total * 0.7
                if 'ASSESSMENT:' in line:
                    assessment = line.split(':', 1)[1].strip()
                    logs.append(f"Adjuster Agent [ASSESSMENT]: {assessment}")
                    
            logs.append(f"Adjuster Agent: Coverage approved: ${coverage_amount:,.2f}")
                    
        except Exception as e:
            logs.append(f"Adjuster Agent: LLM unavailable, using fallback calculation...")
            coverage_amount = bill_total * 0.7
            logs.append(f"Adjuster Agent: Fallback coverage: ${coverage_amount:,.2f}")
    else:
        coverage_amount = bill_total * 0.7
        logs.append(f"Adjuster Agent: Standard coverage applied: ${coverage_amount:,.2f}")
    
    logs.append("Adjuster Agent: Analysis complete. Handing off to Social Worker Agent...")
    
    return {
        "private_coverage": coverage_amount,
        "logs": logs
    }


def check_public_aid(state: AgentState) -> dict:
    """Node 3: Social Worker Agent - LLM-powered with MongoDB data"""
    logs = []
    
    logs.append("Social Worker Agent: Initializing...")
    logs.append("Social Worker Agent: Loading social services expertise...")
    
    region = state.get('region', 'Ontario')
    bill_data = state.get('bill_data', {})
    bill_total = bill_data.get('total', 0)
    services = bill_data.get('services', [])
    private_coverage = state.get('private_coverage', 0)
    remaining = bill_total - private_coverage
    
    logs.append(f"Social Worker Agent: Patient region: {region}")
    logs.append(f"Social Worker Agent: Remaining balance after insurance: ${remaining:,.2f}")
    
    # Query MongoDB for government aid programs
    logs.append("Social Worker Agent: Querying government programs database...")
    gov_program = find_government_program(region)
    
    program_info = "No government programs found in database"
    
    if gov_program:
        logs.append(f"Social Worker Agent: Found program: {gov_program.get('name')}")
        coverage_rate = gov_program.get('coverage_rate', 1.0)
        program_info = f"""
GOVERNMENT PROGRAM FROM DATABASE:
- Program ID: {gov_program.get('program_id')}
- Name: {gov_program.get('name')}
- Description: {gov_program.get('description')}
- Coverage Rate: {int(coverage_rate * 100)}%
- Eligibility: {', '.join(gov_program.get('eligibility', []))}
- Maximum Copay: ${gov_program.get('max_copay', 0):.2f}"""
    else:
        logs.append("Social Worker Agent: No programs in database, using general knowledge")
    
    public_aid = 0.0
    
    if client and remaining > 0:
        try:
            logs.append("Social Worker Agent: Connecting to Gemini LLM...")
            logs.append("Social Worker Agent: Analyzing eligibility for assistance programs...")
            
            prompt = f"""You are SOCIAL WORKER, a compassionate Government Benefits Specialist AI Agent.

YOUR PERSONA: You are an empathetic social worker with deep knowledge of public assistance programs. Your mission is to find every possible source of aid to help patients afford their healthcare. You never give up until you've exhausted all options.

TASK: Find applicable government aid programs for this patient.

PATIENT SITUATION:
- Region: {region}
- Original Bill: ${bill_total:.2f}
- Already Covered by Insurance: ${private_coverage:.2f}
- Remaining Balance: ${remaining:.2f}
- Services Needed: {', '.join(services) if services else 'Medical services'}
{program_info}

STEP-BY-STEP REASONING (show your work):
1. Assess patient's situation and needs
2. Identify relevant programs in their region
3. Determine eligibility and coverage
4. Calculate the aid amount

RESPOND IN THIS EXACT FORMAT:
REASONING: [Your step-by-step analysis]
PROGRAM_FOUND: [Name of the best program or "None"]
AID_AMOUNT: [Dollar amount this program provides]
RECOMMENDATION: [Your empathetic recommendation to the patient]"""

            response = client.models.generate_content(
                model=GEMINI_MODEL_PATH,
                contents=prompt
            )
            
            logs.append("Social Worker Agent: LLM response received")
            
            text = response.text
            program_found = "No program"
            
            for line in text.split('\n'):
                if 'REASONING:' in line:
                    reasoning = line.split(':', 1)[1].strip()
                    logs.append(f"Social Worker Agent [REASONING]: {reasoning[:150]}...")
                if 'PROGRAM_FOUND:' in line:
                    program_found = line.split(':', 1)[1].strip()
                    if program_found.lower() != 'none':
                        logs.append(f"Social Worker Agent: Found program: {program_found}")
                if 'AID_AMOUNT:' in line:
                    try:
                        public_aid = float(line.split(':')[1].strip().replace('$', '').replace(',', ''))
                    except:
                        public_aid = 0.0
                if 'RECOMMENDATION:' in line:
                    recommendation = line.split(':', 1)[1].strip()
                    logs.append(f"Social Worker Agent [RECOMMENDATION]: {recommendation}")
            
            if public_aid > 0:
                logs.append(f"Social Worker Agent: Aid secured: ${public_aid:,.2f}")
            else:
                logs.append("Social Worker Agent: No additional aid programs found")
                        
        except Exception as e:
            logs.append("Social Worker Agent: LLM unavailable, using fallback...")
            if remaining > 0 and region in ["Ontario", "Canada"]:
                public_aid = min(remaining, remaining * 0.5)
                logs.append(f"Social Worker Agent: Fallback - Ontario Works: ${public_aid:,.2f}")
    else:
        if remaining <= 0:
            logs.append("Social Worker Agent: No remaining balance - patient fully covered!")
        else:
            logs.append("Social Worker Agent: Checking local programs...")
    
    logs.append("Social Worker Agent: Search complete. Handing off to Coordinator Agent...")
    
    return {"public_coverage": public_aid, "logs": logs}


def coordinate_benefits(state: AgentState) -> dict:
    """Node 4: Benefits Coordinator Agent - LLM-powered"""
    logs = []
    
    logs.append("Coordinator Agent: Initializing...")
    logs.append("Coordinator Agent: Loading coordination expertise...")
    
    bill_data = state.get('bill_data', {})
    bill_total = bill_data.get('total', 0)
    private = state.get('private_coverage', 0)
    public = state.get('public_coverage', 0)
    you_pay = max(0, bill_total - private - public)
    
    logs.append(f"Coordinator Agent: Reviewing all benefits...")
    logs.append(f"Coordinator Agent: Original bill: ${bill_total:,.2f}")
    logs.append(f"Coordinator Agent: Private insurance contribution: ${private:,.2f}")
    logs.append(f"Coordinator Agent: Government aid contribution: ${public:,.2f}")
    logs.append(f"Coordinator Agent: Calculating final patient responsibility...")
    
    summary = f"You pay ${you_pay:,.2f}"
    
    if client:
        try:
            logs.append("Coordinator Agent: Connecting to Gemini LLM...")
            logs.append("Coordinator Agent: Generating final report...")
            
            prompt = f"""You are COORDINATOR, the Lead Benefits Coordination AI Agent.

YOUR PERSONA: You are the team leader who brings everything together. You're warm, reassuring, and excellent at explaining complex financial information in simple terms. You celebrate wins with patients and provide hope even when some costs remain.

TASK: Create a final summary of the Coordination of Benefits for this patient.

FINAL NUMBERS:
- Original Bill: ${bill_total:.2f}
- Private Insurance Paid: ${private:.2f}
- Government Aid Secured: ${public:.2f}
- Patient Responsibility: ${you_pay:.2f}

STEP-BY-STEP SUMMARY:
1. Acknowledge the original bill
2. Celebrate what was covered
3. State the final amount clearly
4. Provide an encouraging message

RESPOND IN THIS EXACT FORMAT:
SUMMARY: [A warm, clear 2-3 sentence summary for the patient]
SAVINGS: [Total amount saved through coordination]
FINAL_MESSAGE: [An encouraging closing message]"""

            response = client.models.generate_content(
                model=GEMINI_MODEL_PATH,
                contents=prompt
            )
            
            logs.append("Coordinator Agent: LLM response received")
            
            text = response.text
            for line in text.split('\n'):
                if 'SUMMARY:' in line:
                    summary = line.split(':', 1)[1].strip()
                    logs.append(f"Coordinator Agent [SUMMARY]: {summary}")
                if 'SAVINGS:' in line:
                    savings = line.split(':', 1)[1].strip()
                    logs.append(f"Coordinator Agent [SAVINGS]: {savings}")
                if 'FINAL_MESSAGE:' in line:
                    final_msg = line.split(':', 1)[1].strip()
                    logs.append(f"Coordinator Agent [FINAL]: {final_msg}")
                    
        except Exception as e:
            logs.append("Coordinator Agent: Using standard summary...")
            if you_pay == 0:
                summary = "Great news! Your bill is fully covered through coordinated benefits."
            else:
                summary = f"Through coordinated benefits, your responsibility is ${you_pay:,.2f}."
            logs.append(f"Coordinator Agent: {summary}")
    else:
        logs.append(f"Coordinator Agent: Final amount: ${you_pay:,.2f}")
    
    logs.append("Coordinator Agent: Coordination of Benefits complete!")
    logs.append("=" * 50)
    logs.append(f"FINAL RESULT: Patient pays ${you_pay:,.2f}")
    logs.append("=" * 50)
    
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
