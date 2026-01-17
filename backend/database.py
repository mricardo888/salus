from pymongo import MongoClient
from pymongo.server_api import ServerApi
import os

# Placeholder for when user provides real credentials
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://mock:mock@cluster0.example.net/?retryWrites=true&w=majority")

def get_db_client():
    try:
        # mocked for now until URI is real
        if "mock" in MONGO_URI:
            return None
            
        client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
        return client
    except Exception as e:
        print(f"DB Connection Error: {e}")
        return None

def get_policy(policy_id: str):
    client = get_db_client()
    if client:
        try:
            db = client['salus_db']
            policy = db['policies'].find_one({"id": policy_id})
            if policy:
                # Remove MongoDB _id object before returning
                policy.pop('_id', None)
                return policy
        except Exception as e:
            print(f"MongoDB Read Error: {e}")

    # Fallback / Mock data for Phase 2 proof of concept
    if policy_id.startswith("88"):
        return {
            "id": policy_id,
            "provider": "Sun Life (Mock)", 
            "plan": "Gold", 
            "coverage": {"ER": 0.80, "Ambulance": 1.0}
        }
    return None
