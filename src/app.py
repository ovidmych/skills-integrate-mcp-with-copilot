"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
import json
from pathlib import Path

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Load teachers data
def load_teachers():
    try:
        with open(os.path.join(current_dir, "teachers.json"), "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"teachers": {}}

teachers_data = load_teachers()

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

# Simple session storage (in production, use proper session management)
active_sessions = set()

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities

@app.post("/auth/login")
def login(login_request: LoginRequest, response: Response):
    """Authenticate teacher login"""
    teachers = teachers_data.get("teachers", {})
    
    if (login_request.username in teachers and 
        teachers[login_request.username]["password"] == login_request.password):
        
        # Simple session token (in production, use proper JWT or similar)
        session_token = f"session_{login_request.username}_{len(active_sessions)}"
        active_sessions.add(session_token)
        
        # Set session cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            max_age=3600,  # 1 hour
            samesite="lax"
        )
        
        return {
            "message": "Login successful",
            "user": {
                "username": login_request.username,
                "name": teachers[login_request.username]["name"]
            }
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/auth/logout")
def logout(request: Request, response: Response):
    """Logout teacher"""
    session_token = request.cookies.get("session_token")
    
    if session_token and session_token in active_sessions:
        active_sessions.remove(session_token)
    
    response.delete_cookie("session_token")
    return {"message": "Logout successful"}

@app.get("/auth/status")
def auth_status(request: Request):
    """Check authentication status"""
    session_token = request.cookies.get("session_token")
    
    if session_token and session_token in active_sessions:
        # Extract username from session token
        username = session_token.split("_")[1]
        teachers = teachers_data.get("teachers", {})
        
        if username in teachers:
            return {
                "authenticated": True,
                "user": {
                    "username": username,
                    "name": teachers[username]["name"]
                }
            }
    
    return {"authenticated": False}

def check_authentication(request: Request):
    """Helper function to check if user is authenticated"""
    session_token = request.cookies.get("session_token")
    return session_token and session_token in active_sessions


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, request: Request):
    """Sign up a student for an activity (requires teacher authentication)"""
    # Check authentication
    if not check_authentication(request):
        raise HTTPException(status_code=401, detail="Teacher authentication required")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Check if activity is full
    if len(activity["participants"]) >= activity["max_participants"]:
        raise HTTPException(
            status_code=400,
            detail="Activity is full"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, request: Request):
    """Unregister a student from an activity (requires teacher authentication)"""
    # Check authentication
    if not check_authentication(request):
        raise HTTPException(status_code=401, detail="Teacher authentication required")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
