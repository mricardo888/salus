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
