"""
Salus Configuration File
Centralized settings for the application
"""
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

# =============================================================================
# GEMINI AI CONFIGURATION
# =============================================================================
# Change this to switch models across the entire project:
# Options: gemini-3-flash-preview, gemini-3-pro-preview, gemini-2.5-flash, gemini-2.5-pro, etc.
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash-lite')

# Full model path for API calls (auto-prefixed with 'models/')
GEMINI_MODEL_PATH = f"models/{GEMINI_MODEL}"

# API Key
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

# =============================================================================
# APPLICATION SETTINGS
# =============================================================================
DEFAULT_REGION = 'Ontario'
DEFAULT_POLICY_PREFIX = '88'

# =============================================================================
# DATABASE SETTINGS
# =============================================================================
MONGO_URI = os.getenv('MONGO_URI', '')
DATABASE_NAME = 'salus'

# =============================================================================
# AGENT PROMPTS (Token-Optimized)
# =============================================================================

# Adjuster Agent - Concise prompt
ADJUSTER_PROMPT = """You are ADJUSTER, an insurance claims agent.

TASK: Calculate coverage for this claim.
Bill: ${bill_total:.2f} | Services: {services}
{plan_info}

Rules: Prescriptions 80%, Emergency 80%, Ambulance 100%, Surgery 85%, Lab 75%, General 70%.

Respond EXACTLY:
REASONING: [1 sentence]
COVERAGE_AMOUNT: [number]
ASSESSMENT: [1 sentence]"""

# Social Worker Agent - Concise prompt
SOCIAL_WORKER_PROMPT = """You are SOCIAL WORKER, a government benefits specialist.

TASK: Find aid for patient in {region}.
Remaining: ${remaining:.2f} | Insurance paid: ${private_coverage:.2f}
{program_info}

Respond EXACTLY:
REASONING: [1 sentence]
PROGRAM_FOUND: [name or None]
AID_AMOUNT: [number]
RECOMMENDATION: [1 sentence]"""

# Coordinator Agent - Concise prompt
COORDINATOR_PROMPT = """You are COORDINATOR, the benefits summary agent.

Bill: ${bill_total:.2f}
Insurance: ${private:.2f}
Aid: ${public:.2f}
You Pay: ${you_pay:.2f}

Respond EXACTLY:
SUMMARY: [2 sentences max]
SAVINGS: [amount]
FINAL_MESSAGE: [1 encouraging sentence]"""

# Chat Agent - Concise system context
CHAT_SYSTEM_PROMPT = """You are Salus, a friendly healthcare billing assistant. Help patients understand their bills. Be warm, concise. No markdown formatting. 2-3 sentences max per response."""


# Print config on import (for debugging)
if __name__ == "__main__":
    print(f"Gemini Model: {GEMINI_MODEL}")
    print(f"Model Path: {GEMINI_MODEL_PATH}")
    print(f"API Key Set: {'Yes' if GEMINI_API_KEY else 'No'}")
    print(f"MongoDB URI Set: {'Yes' if MONGO_URI else 'No'}")
