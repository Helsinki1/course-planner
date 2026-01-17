import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI
import resend
import json

load_dotenv()

app = Flask(__name__)

# CORS configuration - allow the Next.js frontend
CORS(app, origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://lion-cal.com",
    "https://www.lion-cal.com",
])

# ============================================================================
# Supabase and OpenAI Setup
# ============================================================================

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
openai = OpenAI(api_key=os.getenv("OPENAI_KEY"))
resend.api_key = os.getenv("RESEND_KEY")

# ============================================================================
# Functions copied from database-setup/query-courses.py
# ============================================================================

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

# ============================================================================
# Endpoints
# ============================================================================

@app.route("/")
def root():
    return jsonify({"message": "Course Planner API is running"})


@app.route("/api/mapbox-token", methods=["GET"])
def get_mapbox_token():
    """
    Return the Mapbox token for the frontend map component.
    In production, add rate limiting, session validation, etc.
    """
    token = os.getenv("MAPBOX_SECRET_TOKEN")
    
    if not token:
        return jsonify({"error": "Mapbox token not configured"}), 500
    
    response = jsonify({"token": token})
    response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


@app.route("/api/courses/search", methods=["POST"])
def search_courses():
    """
    Search for courses using hybrid search (semantic + keyword).
    """
    try:
        data = request.get_json()
        query = data.get("query", "")
        
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        courses = get_courses(query)
        return jsonify(courses)
    
    except Exception as e:
        return jsonify({"error": f"Search failed: {str(e)}"}), 500


@app.route("/api/professors/ratings", methods=["POST"])
def get_ratings():
    """
    Get professor ratings by names.
    """
    try:
        data = request.get_json()
        names = data.get("names", [])
        
        if not names:
            return jsonify({})
        
        ratings = get_professor_ratings(names)
        return jsonify(ratings)
    
    except Exception as e:
        return jsonify({"error": f"Failed to get ratings: {str(e)}"}), 500


# ============================================================================
# Selected Courses Endpoints
# ============================================================================

@app.route("/api/courses/selected", methods=["GET"])
def get_selected_courses():
    """
    Get all selected courses for a user.
    """
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        
        result = supabase.table("courses_selected") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()
        
        return jsonify(result.data)
    
    except Exception as e:
        return jsonify({"error": f"Failed to get selected courses: {str(e)}"}), 500


@app.route("/api/courses/selected", methods=["POST"])
def add_selected_course():
    """
    Add a course to user's selected courses.
    """
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        course_id = data.get("course_id")
        course_name = data.get("course_name")
        section_index = data.get("section_index")
        section_data = data.get("section_data")
        credits = data.get("credits")
        
        if not all([user_id, course_id, course_name, section_data]):
            return jsonify({"error": "Missing required fields"}), 400
        
        result = supabase.table("courses_selected").insert({
            "user_id": user_id,
            "course_id": course_id,
            "course_name": course_name,
            "section_index": section_index,
            "section_data": json.dumps(section_data),
            "credits": credits
        }).execute()
        
        return jsonify(result.data), 201
    
    except Exception as e:
        return jsonify({"error": f"Failed to add selected course: {str(e)}"}), 500


@app.route("/api/courses/selected", methods=["DELETE"])
def remove_selected_course():
    """
    Remove a course from user's selected courses.
    """
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        course_id = data.get("course_id")
        section_index = data.get("section_index")
        
        if not all([user_id, course_id]):
            return jsonify({"error": "user_id and course_id are required"}), 400
        
        query = supabase.table("courses_selected") \
            .delete() \
            .eq("user_id", user_id) \
            .eq("course_id", course_id)
        
        if section_index is not None:
            query = query.eq("section_index", section_index)
        
        result = query.execute()
        
        return jsonify({"message": "Course removed successfully"})
    
    except Exception as e:
        return jsonify({"error": f"Failed to remove selected course: {str(e)}"}), 500


# ============================================================================
# Courses Taken Endpoints
# ============================================================================

@app.route("/api/courses/taken", methods=["GET"])
def get_taken_courses():
    """
    Get all taken courses for a user.
    """
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        
        result = supabase.table("courses_taken") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()
        
        return jsonify(result.data)
    
    except Exception as e:
        return jsonify({"error": f"Failed to get taken courses: {str(e)}"}), 500


@app.route("/api/courses/taken", methods=["POST"])
def mark_course_taken():
    """
    Mark a course as taken for a user.
    """
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        course_id = data.get("course_id")
        course_name = data.get("course_name")
        
        if not all([user_id, course_id, course_name]):
            return jsonify({"error": "Missing required fields"}), 400
        
        result = supabase.table("courses_taken").insert({
            "user_id": user_id,
            "course_id": course_id,
            "course_name": course_name
        }).execute()
        
        return jsonify(result.data), 201
    
    except Exception as e:
        return jsonify({"error": f"Failed to mark course as taken: {str(e)}"}), 500


@app.route("/api/courses/taken", methods=["DELETE"])
def unmark_course_taken():
    """
    Unmark a course as taken for a user.
    """
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        course_id = data.get("course_id")
        
        if not all([user_id, course_id]):
            return jsonify({"error": "user_id and course_id are required"}), 400
        
        result = supabase.table("courses_taken") \
            .delete() \
            .eq("user_id", user_id) \
            .eq("course_id", course_id) \
            .execute()
        
        return jsonify({"message": "Course unmarked as taken"})
    
    except Exception as e:
        return jsonify({"error": f"Failed to unmark course as taken: {str(e)}"}), 500


@app.route("/api/courses/taken/check", methods=["GET"])
def check_course_taken():
    """
    Check if a user has taken a specific course.
    """
    try:
        user_id = request.args.get("user_id")
        course_id = request.args.get("course_id")
        
        if not all([user_id, course_id]):
            return jsonify({"error": "user_id and course_id are required"}), 400
        
        result = supabase.table("courses_taken") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("course_id", course_id) \
            .execute()
        
        return jsonify({"taken": len(result.data) > 0})
    
    except Exception as e:
        return jsonify({"error": f"Failed to check course taken status: {str(e)}"}), 500


# ============================================================================
# Friends Endpoints
# ============================================================================

@app.route("/api/friends/invite", methods=["POST"])
def send_friend_invite():
    """
    Send a friend invitation email via Resend.
    """
    try:
        data = request.get_json()
        sender_id = data.get("sender_id")
        sender_first_name = data.get("sender_first_name")
        sender_last_name = data.get("sender_last_name")
        recipient_email = data.get("recipient_email")
        
        if not all([sender_id, sender_first_name, sender_last_name, recipient_email]):
            return jsonify({"error": "Missing required fields"}), 400
        
        sender_full_name = f"{sender_first_name} {sender_last_name}"
        
        # Check if invite already exists
        existing = supabase.table("friend_invites") \
            .select("*") \
            .eq("sender_id", sender_id) \
            .eq("recipient_email", recipient_email) \
            .eq("status", "pending") \
            .execute()
        
        if existing.data:
            return jsonify({"error": "Invitation already sent to this email"}), 400
        
        # Create the invite in database
        result = supabase.table("friend_invites").insert({
            "sender_id": sender_id,
            "sender_first_name": sender_first_name,
            "sender_last_name": sender_last_name,
            "recipient_email": recipient_email,
            "status": "pending"
        }).execute()
        
        # Send email via Resend
        resend.Emails.send({
            "from": "Lion-Cal <onboarding@resend.dev>",
            "to": recipient_email,
            "subject": f"{sender_full_name} shared their course schedule with you!",
            "html": f"""
                <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <h1 style="color: #e5a829; margin-bottom: 24px;">New Friend Request</h1>
                    <p style="font-size: 18px; color: #333; line-height: 1.6;">
                        <strong>{sender_full_name}</strong> shared their course schedule with you on Lion-Cal!
                    </p>
                    <p style="font-size: 16px; color: #666; line-height: 1.6;">
                        Lion-Cal helps Columbia students semantically search for courses with professor ratings, an AI academic advisor trained on the Columbia Bulletin, and a 3D interactive map.
                    </p>
                    <p style="font-size: 16px; color: #666; line-height: 1.6;">
                        Create an account on Lion-Cal.com to accept this invitation, view {sender_full_name}'s schedule, and share your own!
                    </p>
                    <a href="https://lion-cal.com/login" 
                       style="display: inline-block; background-color: #e5a829; color: #000; padding: 14px 28px; 
                              text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px;">
                        Open Lion-Cal.com
                    </a>
                    <p style="font-size: 14px; color: #999; margin-top: 40px;">
                        If you didn't expect this email, you can safely ignore it.
                    </p>
                </div>
            """
        })
        
        return jsonify(result.data), 201
    
    except Exception as e:
        return jsonify({"error": f"Failed to send invitation: {str(e)}"}), 500


@app.route("/api/friends/invites/sent", methods=["GET"])
def get_sent_invites():
    """
    Get all invitations sent by a user.
    """
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        
        result = supabase.table("friend_invites") \
            .select("*") \
            .eq("sender_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        return jsonify(result.data)
    
    except Exception as e:
        return jsonify({"error": f"Failed to get sent invites: {str(e)}"}), 500


@app.route("/api/friends/invites/received", methods=["GET"])
def get_received_invites():
    """
    Get all pending invitations received by a user (by email).
    """
    try:
        email = request.args.get("email")
        if not email:
            return jsonify({"error": "email is required"}), 400
        
        result = supabase.table("friend_invites") \
            .select("*") \
            .eq("recipient_email", email) \
            .eq("status", "pending") \
            .order("created_at", desc=True) \
            .execute()
        
        return jsonify(result.data)
    
    except Exception as e:
        return jsonify({"error": f"Failed to get received invites: {str(e)}"}), 500


@app.route("/api/friends/invites/accept", methods=["POST"])
def accept_invite():
    """
    Accept a friend invitation and create a friendship.
    """
    try:
        data = request.get_json()
        invite_id = data.get("invite_id")
        recipient_id = data.get("recipient_id")
        
        if not all([invite_id, recipient_id]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Get the invite
        invite_result = supabase.table("friend_invites") \
            .select("*") \
            .eq("id", invite_id) \
            .single() \
            .execute()
        
        if not invite_result.data:
            return jsonify({"error": "Invite not found"}), 404
        
        invite = invite_result.data
        
        # Update invite status
        supabase.table("friend_invites") \
            .update({"status": "accepted"}) \
            .eq("id", invite_id) \
            .execute()
        
        # Create bidirectional friendship
        supabase.table("friendships").insert([
            {"user_id": invite["sender_id"], "friend_id": recipient_id},
            {"user_id": recipient_id, "friend_id": invite["sender_id"]}
        ]).execute()
        
        return jsonify({"message": "Invitation accepted"})
    
    except Exception as e:
        return jsonify({"error": f"Failed to accept invitation: {str(e)}"}), 500


@app.route("/api/friends/invites/decline", methods=["POST"])
def decline_invite():
    """
    Decline a friend invitation.
    """
    try:
        data = request.get_json()
        invite_id = data.get("invite_id")
        
        if not invite_id:
            return jsonify({"error": "invite_id is required"}), 400
        
        supabase.table("friend_invites") \
            .update({"status": "declined"}) \
            .eq("id", invite_id) \
            .execute()
        
        return jsonify({"message": "Invitation declined"})
    
    except Exception as e:
        return jsonify({"error": f"Failed to decline invitation: {str(e)}"}), 500


@app.route("/api/friends", methods=["GET"])
def get_friends():
    """
    Get all friends for a user.
    """
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        
        # Get friendships where user is the user_id
        result = supabase.table("friendships") \
            .select("friend_id, created_at") \
            .eq("user_id", user_id) \
            .execute()
        
        if not result.data:
            return jsonify([])
        
        # Get friend profiles
        friend_ids = [f["friend_id"] for f in result.data]
        profiles = supabase.table("user_profiles") \
            .select("id, email") \
            .in_("id", friend_ids) \
            .execute()
        
        return jsonify(profiles.data)
    
    except Exception as e:
        return jsonify({"error": f"Failed to get friends: {str(e)}"}), 500


@app.route("/api/friends/<friend_id>/courses", methods=["GET"])
def get_friend_courses(friend_id):
    """
    Get a friend's selected courses. Requires verified friendship.
    """
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        
        # Verify friendship exists
        friendship = supabase.table("friendships") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("friend_id", friend_id) \
            .execute()
        
        if not friendship.data:
            return jsonify({"error": "Not friends with this user"}), 403
        
        # Get friend's selected courses
        result = supabase.table("courses_selected") \
            .select("*") \
            .eq("user_id", friend_id) \
            .execute()
        
        return jsonify(result.data)
    
    except Exception as e:
        return jsonify({"error": f"Failed to get friend's courses: {str(e)}"}), 500


# ============================================================================
# Run with: flask run --port 8000 --debug
# Or: python main.py
# ============================================================================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
