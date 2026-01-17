"""
Seed MongoDB with Ontario Drug Benefit Formulary Data
Based on https://www.formulary.health.gov.on.ca/formulary/
"""
import os
import ssl
import certifi
from dotenv import load_dotenv
from pathlib import Path
from pymongo import MongoClient

# Load environment
env_path = Path(__file__).parents[1] / '.env.local'
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv('MONGO_URI')

# Ontario Drug Benefit (ODB) Formulary - Sample coverage data
# Based on real programs from Ontario Ministry of Health
ONTARIO_DRUG_PROGRAMS = [
    {
        "program_id": "ODB",
        "name": "Ontario Drug Benefit Program",
        "description": "Covers most prescription drugs for eligible Ontarians",
        "eligibility": ["seniors_65+", "social_assistance", "disability", "high_drug_costs"],
        "coverage_rate": 1.0,  # 100% of listed drugs
        "max_copay": 2.00,  # $2 copay for low-income
        "region": "Ontario"
    },
    {
        "program_id": "TDP",
        "name": "Trillium Drug Program",
        "description": "Helps people with high prescription drug costs relative to income",
        "eligibility": ["high_drug_costs", "no_private_insurance"],
        "coverage_rate": 1.0,
        "deductible_rate": 0.04,  # 4% of net household income
        "region": "Ontario"
    },
    {
        "program_id": "OHIP+",
        "name": "OHIP+ Children and Youth Pharmacare",
        "description": "Free prescription drugs for anyone under 25 without private insurance",
        "eligibility": ["under_25", "no_private_insurance"],
        "coverage_rate": 1.0,
        "max_copay": 0,
        "region": "Ontario"
    },
    {
        "program_id": "EAP",
        "name": "Exceptional Access Program",
        "description": "Coverage for drugs not on regular formulary when medically necessary",
        "eligibility": ["medical_necessity", "doctor_request"],
        "coverage_rate": 1.0,
        "region": "Ontario"
    }
]

# Common prescription drugs from ODB Formulary with coverage info
DRUG_FORMULARY = [
    {
        "din": "02230711",
        "drug_name": "METFORMIN",
        "brand_name": "Glucophage",
        "category": "Diabetes",
        "odb_covered": True,
        "coverage_rate": 1.0,
        "typical_price": 15.00,
        "limited_use": False
    },
    {
        "din": "02229235",
        "drug_name": "ATORVASTATIN",
        "brand_name": "Lipitor",
        "category": "Cholesterol",
        "odb_covered": True,
        "coverage_rate": 1.0,
        "typical_price": 45.00,
        "limited_use": False
    },
    {
        "din": "02237145",
        "drug_name": "OMEPRAZOLE",
        "brand_name": "Losec",
        "category": "Acid Reflux",
        "odb_covered": True,
        "coverage_rate": 1.0,
        "typical_price": 25.00,
        "limited_use": False
    },
    {
        "din": "02242963",
        "drug_name": "AMLODIPINE",
        "brand_name": "Norvasc",
        "category": "Blood Pressure",
        "odb_covered": True,
        "coverage_rate": 1.0,
        "typical_price": 20.00,
        "limited_use": False
    },
    {
        "din": "02247440",
        "drug_name": "RAMIPRIL",
        "brand_name": "Altace",
        "category": "Blood Pressure / Heart",
        "odb_covered": True,
        "coverage_rate": 1.0,
        "typical_price": 18.00,
        "limited_use": False
    },
    {
        "din": "00636622",
        "drug_name": "AMOXICILLIN",
        "brand_name": "Amoxil",
        "category": "Antibiotic",
        "odb_covered": True,
        "coverage_rate": 1.0,
        "typical_price": 12.00,
        "limited_use": False
    },
    {
        "din": "02230946",
        "drug_name": "LEVOTHYROXINE",
        "brand_name": "Synthroid",
        "category": "Thyroid",
        "odb_covered": True,
        "coverage_rate": 1.0,
        "typical_price": 22.00,
        "limited_use": False
    },
    {
        "din": "02299437",
        "drug_name": "ROSUVASTATIN",
        "brand_name": "Crestor",
        "category": "Cholesterol",
        "odb_covered": True,
        "coverage_rate": 1.0,
        "typical_price": 55.00,
        "limited_use": False
    },
    {
        "din": "02244305",
        "drug_name": "PANTOPRAZOLE",
        "brand_name": "Tecta",
        "category": "Acid Reflux",
        "odb_covered": True,
        "coverage_rate": 1.0,
        "typical_price": 35.00,
        "limited_use": False
    },
    {
        "din": "02248854",
        "drug_name": "GABAPENTIN",
        "brand_name": "Neurontin",
        "category": "Nerve Pain / Epilepsy",
        "odb_covered": True,
        "coverage_rate": 1.0,
        "typical_price": 40.00,
        "limited_use": False
    }
]

# Private insurance typical coverage rules
PRIVATE_INSURANCE_PLANS = [
    {
        "plan_id": "SLG80",
        "provider": "Sun Life",
        "plan_name": "Gold Plan",
        "prescription_coverage": 0.80,
        "annual_max": 10000,
        "deductible": 0,
        "covers_brand_name": True,
        "covers_generic": True
    },
    {
        "plan_id": "MFC70",
        "provider": "Manulife",
        "plan_name": "Flex Benefits",
        "prescription_coverage": 0.70,
        "annual_max": 5000,
        "deductible": 100,
        "covers_brand_name": True,
        "covers_generic": True
    },
    {
        "plan_id": "GWL90",
        "provider": "Great-West Life",
        "plan_name": "Comprehensive",
        "prescription_coverage": 0.90,
        "annual_max": 15000,
        "deductible": 0,
        "covers_brand_name": True,
        "covers_generic": True
    }
]


def seed_database():
    if not MONGO_URI:
        print("ERROR: MONGO_URI not found in .env.local")
        return False
    
    try:
        client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
        db = client.salus
        
        # Clear existing data
        print("Clearing existing collections...")
        db.drug_programs.delete_many({})
        db.drug_formulary.delete_many({})
        db.insurance_plans.delete_many({})
        
        # Insert Ontario drug programs
        print(f"Inserting {len(ONTARIO_DRUG_PROGRAMS)} Ontario drug programs...")
        db.drug_programs.insert_many(ONTARIO_DRUG_PROGRAMS)
        
        # Insert drug formulary
        print(f"Inserting {len(DRUG_FORMULARY)} drugs from ODB Formulary...")
        db.drug_formulary.insert_many(DRUG_FORMULARY)
        
        # Insert private insurance plans
        print(f"Inserting {len(PRIVATE_INSURANCE_PLANS)} private insurance plans...")
        db.insurance_plans.insert_many(PRIVATE_INSURANCE_PLANS)
        
        # Create indexes for fast lookup
        print("Creating indexes...")
        db.drug_formulary.create_index("drug_name")
        db.drug_formulary.create_index("din")
        db.drug_programs.create_index("program_id")
        db.insurance_plans.create_index("plan_id")
        
        # Verify
        print("\n=== Database Seeded Successfully ===")
        print(f"Drug Programs: {db.drug_programs.count_documents({})}")
        print(f"Drug Formulary: {db.drug_formulary.count_documents({})}")
        print(f"Insurance Plans: {db.insurance_plans.count_documents({})}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False


if __name__ == "__main__":
    seed_database()
