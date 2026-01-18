"""
MongoDB Database Module for Salus
Connects to MongoDB Atlas and provides query functions for agents
"""
import os
import certifi
from dotenv import load_dotenv
from pathlib import Path
from pymongo import MongoClient
from typing import Optional, Dict, List, Any

# Load environment
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv('MONGO_URI')

# Global client (lazy initialization)
_client: Optional[MongoClient] = None
_db = None


def get_db():
    """Get MongoDB database connection with SSL support"""
    global _client, _db
    
    if _db is not None:
        return _db
        
    if not MONGO_URI:
        print("WARNING: MONGO_URI not found in .env.local")
        return None
    
    try:
        _client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
        _db = _client.salus
        # Test connection
        _db.command('ping')
        print("✅ MongoDB connected successfully")
        return _db
    except Exception as e:
        print(f"❌ MongoDB Connection Error: {e}")
        return None


def find_insurance_plan(provider: str = None, plan_id: str = None) -> Optional[Dict]:
    """
    Find a private insurance plan by provider name or plan ID
    Used by the Adjuster Agent
    """
    db = get_db()
    if db is None:
        return None
    
    try:
        collection = db.insurance_plans
        
        # Search by plan_id first
        if plan_id:
            plan = collection.find_one({"plan_id": plan_id})
            if plan:
                plan.pop('_id', None)
                return plan
        
        # Search by provider name (case-insensitive)
        if provider:
            plan = collection.find_one(
                {"provider": {"$regex": provider, "$options": "i"}}
            )
            if plan:
                plan.pop('_id', None)
                return plan
        
        # Return default plan if no match (Sun Life Gold)
        default_plan = collection.find_one({"plan_id": "SLG80"})
        if default_plan:
            default_plan.pop('_id', None)
            return default_plan
            
    except Exception as e:
        print(f"Error finding insurance plan: {e}")
    
    return None


def get_all_insurance_plans() -> List[Dict]:
    """Get all available insurance plans"""
    db = get_db()
    if db is None:
        return []
    
    try:
        plans = list(db.insurance_plans.find({}))
        for plan in plans:
            plan.pop('_id', None)
        return plans
    except Exception as e:
        print(f"Error getting insurance plans: {e}")
        return []


def find_government_program(region: str, service_type: str = None) -> Optional[Dict]:
    """
    Find applicable government aid program based on region and service type
    Used by the Social Worker Agent
    """
    db = get_db()
    if db is None:
        return None
    
    try:
        collection = db.drug_programs
        
        # Find programs for the specified region
        programs = list(collection.find({"region": region}))
        
        if not programs:
            # Try Ontario as fallback if in Canada
            programs = list(collection.find({"region": "Ontario"}))
        
        if programs:
            # Priority: Return best matching program
            # 1. ODB for seniors/low-income
            # 2. OHIP+ for under 25
            # 3. Trillium for high costs
            
            for prog in programs:
                if prog.get('program_id') == 'ODB':
                    prog.pop('_id', None)
                    return prog
            
            # Return first available
            programs[0].pop('_id', None)
            return programs[0]
            
    except Exception as e:
        print(f"Error finding government program: {e}")
    
    return None


def get_all_drug_programs(region: str = "Ontario") -> List[Dict]:
    """Get all drug programs for a region"""
    db = get_db()
    if db is None:
        return []
    
    try:
        programs = list(db.drug_programs.find({"region": region}))
        for prog in programs:
            prog.pop('_id', None)
        return programs
    except Exception as e:
        print(f"Error getting drug programs: {e}")
        return []


def check_drug_coverage(drug_name: str) -> Optional[Dict]:
    """
    Check if a drug is covered under ODB formulary
    """
    db = get_db()
    if db is None:
        return None
    
    try:
        # Search by drug name (case-insensitive)
        drug = db.drug_formulary.find_one(
            {"drug_name": {"$regex": drug_name, "$options": "i"}}
        )
        if drug:
            drug.pop('_id', None)
            return drug
            
        # Try brand name
        drug = db.drug_formulary.find_one(
            {"brand_name": {"$regex": drug_name, "$options": "i"}}
        )
        if drug:
            drug.pop('_id', None)
            return drug
            
    except Exception as e:
        print(f"Error checking drug coverage: {e}")
    
    return None


def get_coverage_summary() -> Dict[str, Any]:
    """
    Get a summary of available coverage data for LLM context
    """
    db = get_db()
    if db is None:
        return {"connected": False}
    
    try:
        return {
            "connected": True,
            "insurance_plans_count": db.insurance_plans.count_documents({}),
            "drug_programs_count": db.drug_programs.count_documents({}),
            "drug_formulary_count": db.drug_formulary.count_documents({})
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}


# ============== USER PROFILE FUNCTIONS ==============

def get_or_create_user(passkey_id: str) -> Optional[Dict]:
    """
    Get or create a user by their passkey credential ID.
    This is the unique identifier derived from WebAuthn.
    """
    db = get_db()
    if db is None or not passkey_id:
        return None
    
    try:
        from datetime import datetime, timezone
        collection = db.users
        
        # Try to find existing user
        user = collection.find_one({"passkey_id": passkey_id})
        
        if user:
            user.pop('_id', None)
            return user
        
        # Create new user if not found
        new_user = {
            "passkey_id": passkey_id,
            "profile": None,  # Will be filled in by profile form
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        collection.insert_one(new_user)
        new_user.pop('_id', None)
        print(f"✅ Created new user for passkey {passkey_id[:16]}...")
        return new_user
        
    except Exception as e:
        print(f"Error in get_or_create_user: {e}")
        return None


def update_user_profile(passkey_id: str, profile: Dict) -> bool:
    """
    Update or set the user's profile data.
    """
    db = get_db()
    if db is None or not passkey_id:
        return False
    
    try:
        from datetime import datetime, timezone
        result = db.users.update_one(
            {"passkey_id": passkey_id},
            {
                "$set": {
                    "profile": profile,
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True  # Create if doesn't exist
        )
        print(f"✅ Updated profile for passkey {passkey_id[:16]}...")
        return result.modified_count > 0 or result.upserted_id is not None
    except Exception as e:
        print(f"Error updating user profile: {e}")
        return False


def get_user_profile(passkey_id: str) -> Optional[Dict]:
    """
    Get just the profile portion for a user.
    """
    user = get_or_create_user(passkey_id)
    if user:
        return user.get('profile')
    return None


# ============== BILL HISTORY FUNCTIONS ==============

def save_bill_analysis(passkey_id: str, bill_data: Dict, analysis_result: Dict) -> bool:
    """
    Save an analyzed bill to the user's history.
    """
    db = get_db()
    if db is None or not passkey_id:
        return False
    
    try:
        from datetime import datetime, timezone
        bill_record = {
            "passkey_id": passkey_id,
            "bill_data": bill_data,
            "analysis_result": {
                "bill_total": analysis_result.get('bill_total', 0),
                "private_coverage": analysis_result.get('private_coverage', 0),
                "public_coverage": analysis_result.get('public_coverage', 0),
                "final_cost": analysis_result.get('final_cost', 0),
            },
            "created_at": datetime.now(timezone.utc)
        }
        db.bill_history.insert_one(bill_record)
        print(f"✅ Saved bill analysis for passkey {passkey_id[:16]}...")
        return True
    except Exception as e:
        print(f"Error saving bill analysis: {e}")
        return False


def get_user_bill_history(passkey_id: str, limit: int = 20) -> List[Dict]:
    """
    Get the user's bill history, most recent first.
    """
    db = get_db()
    if db is None or not passkey_id:
        return []
    
    try:
        bills = list(
            db.bill_history.find({"passkey_id": passkey_id})
            .sort("created_at", -1)
            .limit(limit)
        )
        for bill in bills:
            bill.pop('_id', None)
            # Convert datetime to ISO string for JSON serialization
            if 'created_at' in bill:
                bill['created_at'] = bill['created_at'].isoformat()
        return bills
    except Exception as e:
        print(f"Error getting bill history: {e}")
        return []


def get_user_uploaded_files(passkey_id: str) -> Dict:
    """
    Get the most recent uploaded file data for a user session.
    Stored in a separate collection for pending uploads before analysis.
    """
    db = get_db()
    if db is None or not passkey_id:
        return {}
    
    try:
        record = db.pending_uploads.find_one({"passkey_id": passkey_id})
        if record:
            record.pop('_id', None)
            return record
        return {}
    except Exception as e:
        print(f"Error getting uploaded files: {e}")
        return {}


def save_user_uploaded_files(passkey_id: str, file_data: Dict, bill_data: Dict) -> bool:
    """
    Save uploaded file data for the current user session (before analysis).
    """
    db = get_db()
    if db is None or not passkey_id:
        return False
    
    try:
        from datetime import datetime, timezone
        db.pending_uploads.update_one(
            {"passkey_id": passkey_id},
            {
                "$set": {
                    "passkey_id": passkey_id,
                    "file_data": file_data,
                    "bill_data": bill_data,
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        return True
    except Exception as e:
        print(f"Error saving uploaded files: {e}")
        return False


def clear_user_pending_upload(passkey_id: str) -> bool:
    """
    Clear pending upload after analysis is complete.
    """
    db = get_db()
    if db is None or not passkey_id:
        return False
    
    try:
        db.pending_uploads.delete_one({"passkey_id": passkey_id})
        return True
    except Exception as e:
        print(f"Error clearing pending upload: {e}")
        return False


# Test connection on import
if __name__ == "__main__":
    db = get_db()
    if db is not None:
        summary = get_coverage_summary()
        print(f"Database Summary: {summary}")
        
        # Test queries
        plan = find_insurance_plan(provider="Sun Life")
        print(f"Sample Insurance Plan: {plan}")
        
        program = find_government_program("Ontario")
        print(f"Sample Drug Program: {program}")
