from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI
import os
import json

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
openai = OpenAI(api_key=os.getenv("OPENAI_KEY"))

def analyze_query(query: str) -> tuple[bool, str]:
    """
    Use LLM to:
    1. Determine if query contains specific named entities (keyword search)
    2. Extract only the meaningful keywords, removing filler words
    
    Returns: (use_keyword_search, cleaned_keywords)
    """
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": 

                    """
                    Analyze course search queries. Return TWO lines:

                    Line 1: "keyword" or "semantic"
                    - "keyword" if query contains: names, places, course codes, institutions
                    - "semantic" if query is conceptual/thematic

                    Line 2: Extract ONLY the specific searchable terms (names, places, course codes).
                    Remove filler words like: class, classes, course, courses, taught, by, with, and, the, for, about, professor, prof, dr, prepositions

                    Examples:
                    Query: "math and cs classes taught by professor Tony Dear"
                    keyword
                    Tony Dear

                    Query: "introductory biology courses"
                    semantic

                    Query: "COMS4111 with Brian Borowski"
                    keyword
                    COMS4111 Brian Borowski

                    Query: "courses about social justice in Harlem"
                    keyword
                    Harlem

                    Query: "machine learning fundamentals"
                    semantic
                    """
            },
            {"role": "user", "content": query}
        ],
        max_tokens=50,
        temperature=0
    )
    
    lines = response.choices[0].message.content.strip().split('\n')
    use_keywords = lines[0].strip().lower() == "keyword"
    cleaned_keywords = lines[1].strip() if len(lines) > 1 else ""
    
    return use_keywords, cleaned_keywords


def get_professor_ratings(names: list[str]) -> dict:
    """Batch lookup: ["Erica Hunt", "Tony Dear"] -> {name: rating}"""
    keys = [n.lower().replace(" ", "_") for n in names]
    result = supabase.table("professors") \
        .select("id, first_name, last_name, rating") \
        .in_("id", keys) \
        .execute()
    
    return {
        f"{r['first_name']} {r['last_name']}".title(): r["rating"] 
        for r in result.data
    }

# the query will not have user context, just search bar text
def get_courses(query: str) -> list[dict]:

    # LLM determines search strategy AND extracts clean keywords
    use_keywords, cleaned_keywords = analyze_query(query)
    keyword_weight = 0.3 if use_keywords else 0.0
    semantic_weight = 0.7 if use_keywords else 1.0

    # Full query for semantic embedding (captures intent)
    query_embedding = openai.embeddings.create(
        input=query,
        model="text-embedding-ada-002"
    ).data[0].embedding

    # Cleaned keywords for tsvector matching (precise terms only)
    keyword_query = cleaned_keywords if use_keywords and cleaned_keywords else query

    # Hybrid search: combines vector similarity + keyword matching
    result = supabase.rpc(
        "hybrid_search",
        {
            "query_text": keyword_query,  # Use cleaned keywords for tsvector
            "query_embedding": query_embedding,
            "match_count": 50,
            "keyword_weight": keyword_weight,
            "semantic_weight": semantic_weight
        }
    ).execute()

    courses = []
    for item in result.data:
        content = item["content"]
        course = json.loads(content)
        courses.append(course)
    return courses