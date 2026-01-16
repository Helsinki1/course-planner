import os
import json
from openai import OpenAI
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_KEY = os.getenv("OPENAI_KEY")

# Initialize clients
client = OpenAI(api_key=OPENAI_KEY)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load courses from JSON file
with open("courses.json", "r") as f:
    courses = json.load(f)

print(f"Loaded {len(courses)} courses from courses.json")


def extract_department(course_id):
    """Extract department code from course ID (e.g., 'AFAM4007GU' -> 'AFAM')."""
    department = ""
    for char in course_id:
        if char.isalpha():
            department += char
        else:
            break
    return department


def create_embedding_text(course):
    """Create embedding text from title, department, and description only."""
    title = course.get("name", "")
    department = extract_department(course.get("id", ""))
    description = course.get("description", "")
    
    return f"{title} | {department} | {description}"


def create_search_text(course):
    """Create searchable text for full-text search (tsvector)."""
    title = course.get("name", "")
    course_id = course.get("id", "")
    department = extract_department(course_id)
    description = course.get("description", "")
    
    # Include professor names for searchability
    professors = []
    for time_slot in course.get("times", []):
        prof = time_slot.get("professor", "")
        if prof and prof not in professors:
            professors.append(prof)
    
    return f"{title} {course_id} {department} {' '.join(professors)} {description}"


def get_embeddings_batch(texts):
    """Get embeddings for a batch of texts using ada-002."""
    response = client.embeddings.create(
        input=texts,
        model="text-embedding-ada-002"
    )
    return [item.embedding for item in response.data]


# Process courses in batches
BATCH_SIZE = 50
all_rows = []
total_batches = (len(courses) + BATCH_SIZE - 1) // BATCH_SIZE

for i in range(0, len(courses), BATCH_SIZE):
    batch = courses[i:i + BATCH_SIZE]
    batch_num = i // BATCH_SIZE + 1
    
    # Create embedding texts
    texts = [create_embedding_text(course) for course in batch]
    
    # Show sample on first batch
    if batch_num == 1:
        print(f"\nSample embedding text:\n{texts[0][:500]}...\n")
        print(f"Sample search text:\n{create_search_text(batch[0])[:500]}...\n")
    
    # Get embeddings
    print(f"[{batch_num}/{total_batches}] Creating embeddings...")
    embeddings = get_embeddings_batch(texts)
    
    # Create rows
    for course, embedding in zip(batch, embeddings):
        all_rows.append({
            "content": course,  # Store dict directly, not as JSON string
            "embedding": embedding,
            "search_text": create_search_text(course)  # For full-text search
        })
    
    print(f"[{batch_num}/{total_batches}] Done.")

print(f"\nCreated {len(all_rows)} embeddings")

# Insert into Supabase (small batches to avoid timeout)
INSERT_BATCH_SIZE = 50
for i in range(0, len(all_rows), INSERT_BATCH_SIZE):
    batch = all_rows[i:i + INSERT_BATCH_SIZE]
    print(f"Inserting batch {i // INSERT_BATCH_SIZE + 1}/{(len(all_rows) + INSERT_BATCH_SIZE - 1) // INSERT_BATCH_SIZE}...")
    supabase.table("courses").insert(batch).execute()

print("Done!")
