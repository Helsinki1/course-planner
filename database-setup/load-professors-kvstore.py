# load_professors.py
import json
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

with open("culpa_professors.json") as f:
    professors = json.load(f)

rows = [{"id": key, **value} for key, value in professors.items()]
supabase.table("professors").upsert(rows).execute()

print("Done!")