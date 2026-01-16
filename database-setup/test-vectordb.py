from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI
import os
import json

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
openai = OpenAI(api_key=os.getenv("OPENAI_KEY"))


def should_use_keyword_search(query: str) -> bool:
    """Use LLM to determine if query contains specific named entities."""
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """You classify course search queries. Return "keyword" if the query contains:
- Specific place names or locations (e.g., Harlem, Tokyo, NYC)
- Professor or person names (e.g., Einstein, Professor Smith)
- Course codes (e.g., COMS4111, PHYS1601)
- Specific institution names (e.g., Columbia, Barnard)

Return "semantic" if the query is conceptual/thematic:
- General topics (e.g., "machine learning", "organic chemistry")
- Abstract concepts (e.g., "social justice", "economic theory")
- Descriptive queries (e.g., "easy science classes", "writing intensive")

Respond with ONLY "keyword" or "semantic"."""
            },
            {"role": "user", "content": query}
        ],
        max_tokens=10,
        temperature=0
    )
    return response.choices[0].message.content.strip().lower() == "keyword"


# the course search bar should not have user context

query = "math and cs classes taught by professor Tony Dear"

# LLM determines search strategy
use_keywords = should_use_keyword_search(query)
keyword_weight = 0.3 if use_keywords else 0.0
semantic_weight = 0.7 if use_keywords else 1.0

query_embedding = openai.embeddings.create(
    input=query,
    model="text-embedding-ada-002"
).data[0].embedding

# Hybrid search: combines vector similarity + keyword matching
result = supabase.rpc(
    "hybrid_search",
    {
        "query_text": query,
        "query_embedding": query_embedding,
        "match_count": 50,
        "keyword_weight": keyword_weight,
        "semantic_weight": semantic_weight
    }
).execute()

print(f"Query: {query}")
print(f"Mode: {'HYBRID (keyword + semantic)' if use_keywords else 'SEMANTIC ONLY'}")
print(f"Weights: keyword={keyword_weight}, semantic={semantic_weight}\n")
print("-" * 60)

for item in result.data:
    content = item["content"]
    course = json.loads(content)
    print(f"{course['name']}")
    print(f"  → semantic: {item['similarity']:.3f} | keyword: {item['keyword_score']:.3f} | combined: {item['combined_score']:.3f}")
    print()
