from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query, BackgroundTasks, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import json
import re
import random
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="MindShield API")
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ.get('JWT_SECRET', 'mindshield_secure_jwt_secret_key_2024_production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 24
COUNSELOR_ACCESS_CODE = os.environ.get('COUNSELOR_ACCESS_CODE', 'MINDSHIELD-COUNSELOR')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Pseudonym Generator ---
ADJECTIVES = [
    'Calm', 'Brave', 'Gentle', 'Wise', 'Kind', 'Serene', 'Bold', 'Quiet',
    'Warm', 'Swift', 'Noble', 'Bright', 'Steady', 'Free', 'True', 'Pure',
    'Strong', 'Soft', 'Fair', 'Deep', 'Wild', 'Safe', 'Light', 'Cool'
]
NOUNS = [
    'Phoenix', 'River', 'Mountain', 'Star', 'Ocean', 'Forest', 'Falcon',
    'Lotus', 'Eagle', 'Wolf', 'Breeze', 'Dawn', 'Storm', 'Sage', 'Haven',
    'Coral', 'Ember', 'Frost', 'Grove', 'Hawk', 'Isle', 'Lake', 'Moon', 'Peak'
]

def generate_pseudonym():
    adj = random.choice(ADJECTIVES)
    noun = random.choice(NOUNS)
    num = random.randint(1000, 9999)
    return f"{adj}{noun}{num}"

# --- JWT Helpers ---
def create_token(user_id: str, role: str = "user") -> str:
    payload = {
        'sub': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {'user_id': payload['sub'], 'role': payload.get('role', 'user')}
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# --- Auth Dependency ---
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    token = authorization.split(' ')[1]
    token_data = verify_token(token)
    if not token_data:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    user = await db.users.find_one({'id': token_data['user_id']}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    user['role'] = token_data.get('role', 'user')
    return user

async def get_current_counselor(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    token = authorization.split(' ')[1]
    token_data = verify_token(token)
    if not token_data or token_data.get('role') != 'counselor':
        raise HTTPException(status_code=403, detail='Counselor access required')
    counselor = await db.counselors.find_one({'id': token_data['user_id']}, {'_id': 0})
    if not counselor:
        raise HTTPException(status_code=401, detail='Counselor not found')
    counselor['role'] = 'counselor'
    return counselor

# --- RSA Key Generation ---
def generate_rsa_key_pair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    return private_pem, public_pem

# --- Pydantic Models ---
class RegisterRequest(BaseModel):
    pin: Optional[str] = None

class LoginRequest(BaseModel):
    user_id: str
    pin: Optional[str] = None

class SendMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class CreatePostRequest(BaseModel):
    topic: str
    body: str

class ReplyRequest(BaseModel):
    body: str

class MoodLogRequest(BaseModel):
    mood_score: int = Field(ge=1, le=10)
    notes: Optional[str] = None

class AppointmentRequest(BaseModel):
    counselor_id: str
    scheduled_at: str
    notes: Optional[str] = None

class CounselorRegisterRequest(BaseModel):
    access_code: str
    specialty: str
    bio: Optional[str] = ""
    available_slots: List[str] = []
    pin: Optional[str] = None

class CounselorLoginRequest(BaseModel):
    user_id: str
    pin: Optional[str] = None

class UpdateBookingStatusRequest(BaseModel):
    status: str

class ConversationMessageRequest(BaseModel):
    body: str

class ConnectToCounselorRequest(BaseModel):
    user_id: str
    counselor_id: Optional[str] = None

class UpdateAvailabilityRequest(BaseModel):
    available_slots: List[str]
    bio: Optional[str] = None
    specialty: Optional[str] = None

@api_router.get("/")
async def health_check():
    return {"status": "ok", "app": "MindShield", "version": "1.0.0"}

# ========== AUTH ROUTES ==========

@api_router.post("/auth/register")
async def register(body: RegisterRequest):
    user_id = str(uuid.uuid4())
    pseudonym = generate_pseudonym()

    # Ensure unique pseudonym
    while await db.users.find_one({'pseudonym': pseudonym}):
        pseudonym = generate_pseudonym()

    # Generate RSA key pair
    private_pem, public_pem = generate_rsa_key_pair()

    # Hash PIN if provided
    pin_hash = None
    if body.pin:
        pin_hash = bcrypt.hashpw(body.pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    user_doc = {
        'id': user_id,
        'pseudonym': pseudonym,
        'pin_hash': pin_hash,
        'public_key': public_pem,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'last_seen': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    token = create_token(user_id)

    return {
        'user_id': user_id,
        'pseudonym': pseudonym,
        'private_key': private_pem,
        'access_token': token
    }

@api_router.post("/auth/login")
async def login(body: LoginRequest):
    user = await db.users.find_one({'id': body.user_id}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=404, detail='User not found. Check your UUID.')

    if user.get('pin_hash') and body.pin:
        if not bcrypt.checkpw(body.pin.encode('utf-8'), user['pin_hash'].encode('utf-8')):
            raise HTTPException(status_code=401, detail='Invalid PIN')
    elif user.get('pin_hash') and not body.pin:
        raise HTTPException(status_code=401, detail='PIN required')

    await db.users.update_one(
        {'id': body.user_id},
        {'$set': {'last_seen': datetime.now(timezone.utc).isoformat()}}
    )

    token = create_token(body.user_id)
    return {
        'user_id': user['id'],
        'pseudonym': user['pseudonym'],
        'access_token': token
    }

# ========== COUNSELOR AUTH ROUTES ==========

COUNSELOR_NAMES = ['Serenity', 'Harmony', 'Compass', 'Resilience', 'Clarity', 'Courage', 'Haven', 'Grace', 'Solace', 'Beacon']

@api_router.post("/auth/counselor/register")
async def counselor_register(body: CounselorRegisterRequest):
    # Check invite code first, then fall back to generic access code
    invite = await db.invite_codes.find_one({'code': body.access_code, 'used': False})
    if not invite and body.access_code != COUNSELOR_ACCESS_CODE:
        raise HTTPException(status_code=403, detail='Invalid or expired invite code')

    counselor_id = str(uuid.uuid4())
    pseudonym = f"Dr. {random.choice(COUNSELOR_NAMES)}{random.randint(100, 999)}"
    while await db.counselors.find_one({'pseudonym': pseudonym}):
        pseudonym = f"Dr. {random.choice(COUNSELOR_NAMES)}{random.randint(100, 999)}"

    pin_hash = None
    if body.pin:
        pin_hash = bcrypt.hashpw(body.pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    counselor_doc = {
        'id': counselor_id,
        'pseudonym': pseudonym,
        'pin_hash': pin_hash,
        'specialty': body.specialty,
        'bio': body.bio or f"Professional counselor specializing in {body.specialty}.",
        'available_slots': body.available_slots if body.available_slots else ['Mon 10:00', 'Wed 10:00', 'Fri 10:00'],
        'role': 'counselor',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.counselors.insert_one(counselor_doc)

    # Mark invite as used
    if invite:
        await db.invite_codes.update_one(
            {'id': invite['id']},
            {'$set': {'used': True, 'used_by': counselor_id, 'used_at': datetime.now(timezone.utc).isoformat()}}
        )

    token = create_token(counselor_id, role='counselor')
    return {
        'user_id': counselor_id,
        'pseudonym': pseudonym,
        'access_token': token,
        'role': 'counselor',
        'specialty': body.specialty
    }

@api_router.post("/auth/counselor/login")
async def counselor_login(body: CounselorLoginRequest):
    counselor = await db.counselors.find_one({'id': body.user_id}, {'_id': 0})
    if not counselor:
        raise HTTPException(status_code=404, detail='Counselor not found. Check your UUID.')

    if counselor.get('pin_hash') and body.pin:
        if not bcrypt.checkpw(body.pin.encode('utf-8'), counselor['pin_hash'].encode('utf-8')):
            raise HTTPException(status_code=401, detail='Invalid PIN')
    elif counselor.get('pin_hash') and not body.pin:
        raise HTTPException(status_code=401, detail='PIN required')

    token = create_token(body.user_id, role='counselor')
    return {
        'user_id': counselor['id'],
        'pseudonym': counselor['pseudonym'],
        'specialty': counselor.get('specialty', ''),
        'access_token': token,
        'role': 'counselor'
    }

# ========== AI / MESSAGE ROUTES ==========

MINDSHIELD_SYSTEM_PROMPT = """You are MindShield, a compassionate mental health support assistant.
Your job is to provide empathetic, evidence-based emotional support.

RULES:
1. You NEVER provide medical diagnoses.
2. You ALWAYS classify each user message into exactly one state: NORMAL | MILD_DISTRESS | CRISIS
3. You respond based on the classification:
   - NORMAL: warm, motivational support
   - MILD_DISTRESS: practical coping strategies, breathing exercises, grounding techniques
   - CRISIS: immediately provide Nigerian emergency contacts, urge professional help, offer to connect to a human counselor. Be calm and direct.
4. You NEVER reveal any user-identifying information.
5. You ALWAYS encourage users to seek professional help when appropriate.
6. Be culturally sensitive. Many users are in Nigeria and West Africa.

Return your response as JSON:
{
  "state": "NORMAL" or "MILD_DISTRESS" or "CRISIS",
  "message": "your response text",
  "resources": ["optional array of resource titles to show"],
  "escalate": true or false
}

IMPORTANT: Return ONLY the JSON object, no additional text."""

async def analyze_with_ai(user_id: str, message_text: str):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"mindshield-{user_id}-{str(uuid.uuid4())[:8]}",
            system_message=MINDSHIELD_SYSTEM_PROMPT
        ).with_model("anthropic", "claude-4-sonnet-20250514")

        response = await chat.send_message(UserMessage(text=message_text))

        # Parse JSON from response
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            if 'state' in result and 'message' in result:
                result.setdefault('resources', [])
                result.setdefault('escalate', result.get('state') == 'CRISIS')
                return result

        return {
            "state": "NORMAL",
            "message": response,
            "resources": [],
            "escalate": False
        }
    except Exception as e:
        logger.error(f"AI analysis error: {str(e)}")
        return {
            "state": "NORMAL",
            "message": "I'm here to listen. Could you tell me more about how you're feeling? Remember, you're not alone in this.",
            "resources": [],
            "escalate": False
        }

# --- Admin Notification Helper ---
class AdminWSManager:
    def __init__(self):
        self.connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast(self, payload: dict):
        dead = []
        for ws in self.connections:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

admin_ws_manager = AdminWSManager()

async def create_admin_notification(ntype, title, message, user_id=None, user_pseudonym=None, metadata=None):
    doc = {
        'id': str(uuid.uuid4()),
        'type': ntype,
        'title': title,
        'message': message,
        'user_id': user_id,
        'user_pseudonym': user_pseudonym or 'Unknown',
        'read': False,
        'metadata': metadata or {},
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.admin_notifications.insert_one(doc)
    # Push to all connected admin clients in real-time
    try:
        broadcast_doc = {k: v for k, v in doc.items() if k != '_id'}
        await admin_ws_manager.broadcast({'event': 'notification.new', 'notification': broadcast_doc})
    except Exception as e:
        logger.error(f"Notification broadcast failed: {e}")
    return doc

# --- AI Content Moderation ---
async def moderate_forum_content(post_id, text, author_pseudonym):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"moderation-{str(uuid.uuid4())[:8]}",
            system_message="""You are a content moderator for MindShield, a mental health support platform.
Analyze the forum post and determine if it contains:
1. Self-harm or suicide ideation
2. Harmful or dangerous advice
3. Harassment or bullying
4. Severe misinformation about mental health
5. Explicit or inappropriate content

Be lenient with genuine expressions of distress - those are normal on a mental health platform.
Only flag content that could genuinely harm others.

Return JSON only: {"flagged": true/false, "reason": "brief explanation if flagged, empty string if not"}"""
        ).with_model("anthropic", "claude-4-sonnet-20250514")
        response = await chat.send_message(UserMessage(text=text))
        json_match = re.search(r'\{[^{}]*\}', response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            if result.get('flagged'):
                await db.forum_posts.update_one(
                    {'id': post_id},
                    {'$set': {'is_flagged': True, 'flag_reason': result.get('reason', 'Auto-detected concerning content')}}
                )
                await create_admin_notification(
                    'FLAGGED_POST',
                    'Forum Post Auto-Flagged',
                    f'Post by {author_pseudonym} was flagged: {result.get("reason", "Concerning content")}',
                    metadata={'post_id': post_id, 'reason': result.get('reason')}
                )
                return True
    except Exception as e:
        logger.error(f"Content moderation error: {e}")
    return False

@api_router.post("/messages")
async def send_message(body: SendMessageRequest, user=Depends(get_current_user)):
    session_id = body.session_id or user['id']

    # Store user message
    user_msg_doc = {
        'id': str(uuid.uuid4()),
        'session_id': session_id,
        'sender_id': user['id'],
        'sender_type': 'user',
        'body': body.message,
        'emotional_state': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(user_msg_doc)

    # Analyze with AI
    ai_result = await analyze_with_ai(user['id'], body.message)

    # Update user message with emotional state
    await db.messages.update_one(
        {'id': user_msg_doc['id']},
        {'$set': {'emotional_state': ai_result['state']}}
    )

    # Store AI response
    ai_msg_doc = {
        'id': str(uuid.uuid4()),
        'session_id': session_id,
        'sender_id': 'mindshield-ai',
        'sender_type': 'ai',
        'body': ai_result['message'],
        'emotional_state': ai_result['state'],
        'resources': ai_result.get('resources', []),
        'escalate': ai_result.get('escalate', False),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(ai_msg_doc)

    # If crisis, store alert
    if ai_result.get('state') == 'CRISIS':
        await db.crisis_alerts.insert_one({
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'session_id': session_id,
            'message_id': user_msg_doc['id'],
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        await create_admin_notification(
            'CRISIS',
            'Crisis Detected',
            f"User {user.get('pseudonym', 'Anonymous')} sent a message classified as CRISIS in AI chat.",
            user_id=user['id'],
            user_pseudonym=user.get('pseudonym'),
            metadata={'session_id': session_id, 'message_id': user_msg_doc['id'], 'preview': body.message[:160]}
        )

    return {
        'user_message': {
            'id': user_msg_doc['id'],
            'body': body.message,
            'sender_type': 'user',
            'emotional_state': ai_result['state'],
            'created_at': user_msg_doc['created_at']
        },
        'ai_response': {
            'id': ai_msg_doc['id'],
            'body': ai_result['message'],
            'sender_type': 'ai',
            'emotional_state': ai_result['state'],
            'resources': ai_result.get('resources', []),
            'escalate': ai_result.get('escalate', False),
            'created_at': ai_msg_doc['created_at']
        }
    }

@api_router.get("/messages/{session_id}")
async def get_messages(session_id: str, user=Depends(get_current_user)):
    messages = await db.messages.find(
        {'session_id': session_id},
        {'_id': 0}
    ).sort('created_at', 1).to_list(200)
    return {'messages': messages}

# ========== FORUM ROUTES ==========

@api_router.get("/forum/posts")
async def get_forum_posts(topic: Optional[str] = None):
    query = {}
    if topic and topic != 'all':
        query['topic'] = topic
    posts = await db.forum_posts.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    return {'posts': posts}

@api_router.post("/forum/posts")
async def create_forum_post(body: CreatePostRequest, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    post_doc = {
        'id': str(uuid.uuid4()),
        'author_id': user['id'],
        'pseudonym': user['pseudonym'],
        'topic': body.topic,
        'body': body.body,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'is_flagged': False,
        'replies': []
    }
    await db.forum_posts.insert_one(post_doc)
    del post_doc['_id']
    # Run AI moderation in the background so the response stays fast
    background_tasks.add_task(moderate_forum_content, post_doc['id'], body.body, user['pseudonym'])
    return post_doc

@api_router.post("/forum/posts/{post_id}/reply")
async def reply_to_post(post_id: str, body: ReplyRequest, user=Depends(get_current_user)):
    reply_doc = {
        'id': str(uuid.uuid4()),
        'author_id': user['id'],
        'pseudonym': user['pseudonym'],
        'body': body.body,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    result = await db.forum_posts.update_one(
        {'id': post_id},
        {'$push': {'replies': reply_doc}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Post not found')
    return reply_doc

# ========== MOOD ROUTES ==========

@api_router.post("/mood/log")
async def log_mood(body: MoodLogRequest, user=Depends(get_current_user)):
    mood_doc = {
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'mood_score': body.mood_score,
        'notes': body.notes,
        'logged_at': datetime.now(timezone.utc).isoformat()
    }
    await db.mood_logs.insert_one(mood_doc)
    del mood_doc['_id']
    return mood_doc

@api_router.get("/mood/history")
async def get_mood_history(user=Depends(get_current_user), days: int = Query(default=30)):
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    logs = await db.mood_logs.find(
        {'user_id': user['id'], 'logged_at': {'$gte': since}},
        {'_id': 0}
    ).sort('logged_at', 1).to_list(500)
    return {'mood_logs': logs}

# ========== APPOINTMENT ROUTES ==========

@api_router.get("/appointments/counselors")
async def get_counselors():
    counselors = await db.counselors.find({}, {'_id': 0}).to_list(50)
    return {'counselors': counselors}

@api_router.get("/appointments")
async def get_appointments(user=Depends(get_current_user)):
    appointments = await db.appointments.find(
        {'user_id': user['id']},
        {'_id': 0}
    ).sort('scheduled_at', -1).to_list(50)
    return {'appointments': appointments}

@api_router.post("/appointments")
async def create_appointment(body: AppointmentRequest, user=Depends(get_current_user)):
    counselor = await db.counselors.find_one({'id': body.counselor_id}, {'_id': 0})
    if not counselor:
        raise HTTPException(status_code=404, detail='Counselor not found')

    appt_doc = {
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'counselor_id': body.counselor_id,
        'counselor_pseudonym': counselor['pseudonym'],
        'counselor_specialty': counselor['specialty'],
        'scheduled_at': body.scheduled_at,
        'status': 'PENDING',
        'notes': body.notes,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.appointments.insert_one(appt_doc)
    del appt_doc['_id']
    return appt_doc

# ========== RESOURCE ROUTES ==========

@api_router.get("/resources")
async def get_resources(category: Optional[str] = None):
    query = {}
    if category and category != 'all':
        query['category'] = category
    resources = await db.resources.find(query, {'_id': 0}).sort('created_at', 1).to_list(100)
    return {'resources': resources}

# ========== COUNSELOR MANAGEMENT ROUTES ==========

@api_router.get("/counselor/bookings")
async def get_counselor_bookings(counselor=Depends(get_current_counselor)):
    bookings = await db.appointments.find(
        {'counselor_id': counselor['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    for b in bookings:
        patient = await db.users.find_one({'id': b.get('user_id')}, {'_id': 0, 'pseudonym': 1})
        b['patient_pseudonym'] = patient['pseudonym'] if patient else 'Anonymous'
    return {'bookings': bookings}

@api_router.put("/counselor/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, body: UpdateBookingStatusRequest, counselor=Depends(get_current_counselor)):
    if body.status not in ['CONFIRMED', 'CANCELLED']:
        raise HTTPException(status_code=400, detail='Status must be CONFIRMED or CANCELLED')
    result = await db.appointments.update_one(
        {'id': booking_id, 'counselor_id': counselor['id']},
        {'$set': {'status': body.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Booking not found')
    if body.status == 'CONFIRMED':
        appt = await db.appointments.find_one({'id': booking_id}, {'_id': 0})
        existing = await db.conversations.find_one({
            'patient_id': appt['user_id'], 'counselor_id': counselor['id']
        })
        if not existing:
            patient = await db.users.find_one({'id': appt['user_id']}, {'_id': 0})
            conv_doc = {
                'id': str(uuid.uuid4()),
                'patient_id': appt['user_id'],
                'counselor_id': counselor['id'],
                'patient_pseudonym': patient['pseudonym'] if patient else 'Anonymous',
                'counselor_pseudonym': counselor['pseudonym'],
                'appointment_id': booking_id,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'last_message_at': datetime.now(timezone.utc).isoformat()
            }
            await db.conversations.insert_one(conv_doc)
    return {'status': body.status, 'booking_id': booking_id}

@api_router.get("/counselor/conversations")
async def get_counselor_conversations(counselor=Depends(get_current_counselor)):
    convs = await db.conversations.find(
        {'counselor_id': counselor['id']}, {'_id': 0}
    ).sort('last_message_at', -1).to_list(50)
    for conv in convs:
        last_msg = await db.conversation_messages.find(
            {'conversation_id': conv['id']}, {'_id': 0}
        ).sort('created_at', -1).limit(1).to_list(1)
        conv['last_message'] = last_msg[0] if last_msg else None
    return {'conversations': convs}

@api_router.get("/counselor/conversations/{conversation_id}/messages")
async def get_counselor_conv_messages(conversation_id: str, counselor=Depends(get_current_counselor)):
    conv = await db.conversations.find_one(
        {'id': conversation_id, 'counselor_id': counselor['id']}, {'_id': 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail='Conversation not found')
    messages = await db.conversation_messages.find(
        {'conversation_id': conversation_id}, {'_id': 0}
    ).sort('created_at', 1).to_list(500)
    return {'messages': messages, 'conversation': conv}

@api_router.post("/counselor/conversations/{conversation_id}/messages")
async def send_counselor_message(conversation_id: str, body: ConversationMessageRequest, counselor=Depends(get_current_counselor)):
    conv = await db.conversations.find_one(
        {'id': conversation_id, 'counselor_id': counselor['id']}, {'_id': 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail='Conversation not found')
    msg_doc = {
        'id': str(uuid.uuid4()),
        'conversation_id': conversation_id,
        'sender_id': counselor['id'],
        'sender_role': 'counselor',
        'sender_pseudonym': counselor['pseudonym'],
        'body': body.body,
        'emotional_state': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.conversation_messages.insert_one(msg_doc)
    await db.conversations.update_one(
        {'id': conversation_id},
        {'$set': {'last_message_at': msg_doc['created_at']}}
    )
    del msg_doc['_id']
    return msg_doc

# ========== PATIENT CONVERSATION ROUTES ==========

@api_router.get("/conversations")
async def get_patient_conversations(user=Depends(get_current_user)):
    convs = await db.conversations.find(
        {'patient_id': user['id']}, {'_id': 0}
    ).sort('last_message_at', -1).to_list(50)
    for conv in convs:
        last_msg = await db.conversation_messages.find(
            {'conversation_id': conv['id']}, {'_id': 0}
        ).sort('created_at', -1).limit(1).to_list(1)
        conv['last_message'] = last_msg[0] if last_msg else None
    return {'conversations': convs}

@api_router.get("/conversations/{conversation_id}/messages")
async def get_patient_conv_messages(conversation_id: str, user=Depends(get_current_user)):
    conv = await db.conversations.find_one(
        {'id': conversation_id, 'patient_id': user['id']}, {'_id': 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail='Conversation not found')
    messages = await db.conversation_messages.find(
        {'conversation_id': conversation_id}, {'_id': 0}
    ).sort('created_at', 1).to_list(500)
    return {'messages': messages, 'conversation': conv}

@api_router.post("/conversations/{conversation_id}/messages")
async def send_patient_message(conversation_id: str, body: ConversationMessageRequest, user=Depends(get_current_user)):
    conv = await db.conversations.find_one(
        {'id': conversation_id, 'patient_id': user['id']}, {'_id': 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail='Conversation not found')
    emotional_state = None
    try:
        ai_result = await analyze_with_ai(user['id'], body.body)
        emotional_state = ai_result.get('state')
    except Exception:
        pass
    msg_doc = {
        'id': str(uuid.uuid4()),
        'conversation_id': conversation_id,
        'sender_id': user['id'],
        'sender_role': 'patient',
        'sender_pseudonym': user.get('pseudonym', 'Anonymous'),
        'body': body.body,
        'emotional_state': emotional_state,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.conversation_messages.insert_one(msg_doc)
    await db.conversations.update_one(
        {'id': conversation_id},
        {'$set': {'last_message_at': msg_doc['created_at']}}
    )
    if emotional_state == 'CRISIS':
        await db.crisis_alerts.insert_one({
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'session_id': conversation_id,
            'message_id': msg_doc['id'],
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        await create_admin_notification(
            'CRISIS',
            'Crisis Detected (Counselor Chat)',
            f"User {user.get('pseudonym', 'Anonymous')} sent a CRISIS message in counselor conversation.",
            user_id=user['id'],
            user_pseudonym=user.get('pseudonym'),
            metadata={'conversation_id': conversation_id, 'message_id': msg_doc['id'], 'preview': body.body[:160]}
        )
    del msg_doc['_id']
    return msg_doc

import string as string_module

# ========== ADMIN ROUTES ==========

ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'mindshield_admin_2024')

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class CreateInviteRequest(BaseModel):
    specialty_hint: Optional[str] = None
    note: Optional[str] = None

async def get_current_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    token = authorization.split(' ')[1]
    token_data = verify_token(token)
    if not token_data or token_data.get('role') != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    return {'role': 'admin', 'username': ADMIN_USERNAME}

@api_router.post("/admin/login")
async def admin_login(body: AdminLoginRequest):
    if body.username != ADMIN_USERNAME or body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail='Invalid admin credentials')
    token = create_token('admin', role='admin')
    return {'access_token': token, 'role': 'admin', 'username': ADMIN_USERNAME}

@api_router.get("/admin/analytics")
async def get_analytics(admin=Depends(get_current_admin)):
    total_users = await db.users.count_documents({})
    total_counselors = await db.counselors.count_documents({})
    total_messages = await db.messages.count_documents({})
    total_forum_posts = await db.forum_posts.count_documents({})
    total_mood_logs = await db.mood_logs.count_documents({})
    total_appointments = await db.appointments.count_documents({})
    pending_appointments = await db.appointments.count_documents({'status': 'PENDING'})
    confirmed_appointments = await db.appointments.count_documents({'status': 'CONFIRMED'})
    total_conversations = await db.conversations.count_documents({})
    total_crisis_alerts = await db.crisis_alerts.count_documents({})
    flagged_posts = await db.forum_posts.count_documents({'is_flagged': True})
    pending_invites = await db.invite_codes.count_documents({'used': False})
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_users = await db.users.count_documents({'created_at': {'$gte': seven_days_ago}})
    recent_messages = await db.messages.count_documents({'created_at': {'$gte': seven_days_ago}})
    recent_crisis = await db.crisis_alerts.count_documents({'created_at': {'$gte': seven_days_ago}})
    mood_pipeline = [{'$group': {'_id': None, 'avg': {'$avg': '$mood_score'}}}]
    mood_avg_result = await db.mood_logs.aggregate(mood_pipeline).to_list(1)
    avg_mood = round(mood_avg_result[0]['avg'], 1) if mood_avg_result else 0
    return {
        'total_users': total_users, 'total_counselors': total_counselors,
        'total_messages': total_messages, 'total_forum_posts': total_forum_posts,
        'total_mood_logs': total_mood_logs, 'total_appointments': total_appointments,
        'pending_appointments': pending_appointments, 'confirmed_appointments': confirmed_appointments,
        'total_conversations': total_conversations, 'total_crisis_alerts': total_crisis_alerts,
        'flagged_posts': flagged_posts, 'pending_invites': pending_invites,
        'recent_users': recent_users, 'recent_messages': recent_messages,
        'recent_crisis': recent_crisis, 'avg_mood': avg_mood
    }

@api_router.get("/admin/users")
async def list_users(admin=Depends(get_current_admin)):
    users = await db.users.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)
    for u in users:
        u['message_count'] = await db.messages.count_documents({'sender_id': u['id'], 'sender_type': 'user'})
        u['mood_count'] = await db.mood_logs.count_documents({'user_id': u['id']})
        u.pop('pin_hash', None)
        u.pop('public_key', None)
    return {'users': users}

@api_router.delete("/admin/users/{user_id}")
async def remove_user(user_id: str, admin=Depends(get_current_admin)):
    result = await db.users.delete_one({'id': user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
    await db.messages.delete_many({'$or': [{'sender_id': user_id}, {'session_id': user_id}]})
    await db.mood_logs.delete_many({'user_id': user_id})
    await db.appointments.delete_many({'user_id': user_id})
    await db.forum_posts.delete_many({'author_id': user_id})
    await db.conversations.delete_many({'patient_id': user_id})
    await db.conversation_messages.delete_many({'sender_id': user_id})
    return {'deleted': True, 'user_id': user_id}

@api_router.get("/admin/counselors")
async def admin_list_counselors(admin=Depends(get_current_admin)):
    counselors = await db.counselors.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    for c in counselors:
        c['booking_count'] = await db.appointments.count_documents({'counselor_id': c['id']})
        c['conversation_count'] = await db.conversations.count_documents({'counselor_id': c['id']})
        c.pop('pin_hash', None)
    return {'counselors': counselors}

@api_router.delete("/admin/counselors/{counselor_id}")
async def remove_counselor(counselor_id: str, admin=Depends(get_current_admin)):
    result = await db.counselors.delete_one({'id': counselor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Counselor not found')
    await db.appointments.delete_many({'counselor_id': counselor_id})
    await db.conversations.delete_many({'counselor_id': counselor_id})
    return {'deleted': True, 'counselor_id': counselor_id}

@api_router.get("/admin/invites")
async def list_invites(admin=Depends(get_current_admin)):
    invites = await db.invite_codes.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return {'invites': invites}

@api_router.post("/admin/invites")
async def create_invite(body: CreateInviteRequest, admin=Depends(get_current_admin)):
    code = 'INV-' + ''.join(random.choices(string_module.ascii_uppercase + string_module.digits, k=8))
    while await db.invite_codes.find_one({'code': code}):
        code = 'INV-' + ''.join(random.choices(string_module.ascii_uppercase + string_module.digits, k=8))
    invite_doc = {
        'id': str(uuid.uuid4()), 'code': code,
        'specialty_hint': body.specialty_hint, 'note': body.note,
        'used': False, 'used_by': None, 'used_at': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.invite_codes.insert_one(invite_doc)
    del invite_doc['_id']
    return invite_doc

@api_router.delete("/admin/invites/{invite_id}")
async def revoke_invite(invite_id: str, admin=Depends(get_current_admin)):
    result = await db.invite_codes.delete_one({'id': invite_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Invite not found')
    return {'deleted': True, 'invite_id': invite_id}

@api_router.get("/admin/posts")
async def admin_list_posts(admin=Depends(get_current_admin)):
    posts = await db.forum_posts.find({}, {'_id': 0}).sort('created_at', -1).to_list(200)
    return {'posts': posts}

@api_router.get("/admin/flagged-posts")
async def list_flagged_posts(admin=Depends(get_current_admin)):
    posts = await db.forum_posts.find({'is_flagged': True}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return {'posts': posts}

@api_router.put("/admin/posts/{post_id}/flag")
async def toggle_flag_post(post_id: str, admin=Depends(get_current_admin)):
    post = await db.forum_posts.find_one({'id': post_id}, {'_id': 0})
    if not post:
        raise HTTPException(status_code=404, detail='Post not found')
    new_flag = not post.get('is_flagged', False)
    await db.forum_posts.update_one({'id': post_id}, {'$set': {'is_flagged': new_flag}})
    return {'post_id': post_id, 'is_flagged': new_flag}

@api_router.delete("/admin/posts/{post_id}")
async def remove_post(post_id: str, admin=Depends(get_current_admin)):
    result = await db.forum_posts.delete_one({'id': post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Post not found')
    return {'deleted': True, 'post_id': post_id}

@api_router.get("/admin/crisis-alerts")
async def list_crisis_alerts(admin=Depends(get_current_admin)):
    alerts = await db.crisis_alerts.find({}, {'_id': 0}).sort('created_at', -1).to_list(200)
    for a in alerts:
        u = await db.users.find_one({'id': a.get('user_id')}, {'_id': 0, 'pseudonym': 1})
        a['user_pseudonym'] = u['pseudonym'] if u else 'Unknown'
    return {'alerts': alerts}

# ========== ADMIN NOTIFICATIONS ==========

@api_router.get("/admin/notifications")
async def list_notifications(admin=Depends(get_current_admin), limit: int = Query(default=50)):
    notifications = await db.admin_notifications.find({}, {'_id': 0}).sort('created_at', -1).to_list(limit)
    return {'notifications': notifications}

@api_router.get("/admin/notifications/count")
async def count_unread_notifications(admin=Depends(get_current_admin)):
    count = await db.admin_notifications.count_documents({'read': False})
    return {'count': count}

@api_router.put("/admin/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, admin=Depends(get_current_admin)):
    result = await db.admin_notifications.update_one(
        {'id': notification_id},
        {'$set': {'read': True, 'read_at': datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Notification not found')
    return {'read': True, 'notification_id': notification_id}

@api_router.put("/admin/notifications/read-all")
async def mark_all_notifications_read(admin=Depends(get_current_admin)):
    result = await db.admin_notifications.update_many(
        {'read': False},
        {'$set': {'read': True, 'read_at': datetime.now(timezone.utc).isoformat()}}
    )
    try:
        await admin_ws_manager.broadcast({'event': 'notification.read_all'})
    except Exception:
        pass
    return {'modified': result.modified_count}

@api_router.delete("/admin/notifications")
async def clear_all_notifications(admin=Depends(get_current_admin)):
    result = await db.admin_notifications.delete_many({})
    try:
        await admin_ws_manager.broadcast({'event': 'notification.cleared'})
    except Exception:
        pass
    return {'deleted': result.deleted_count}

@app.websocket("/api/ws/admin/notifications")
async def admin_notifications_ws(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    # WebSocket auth via ?token= (browsers can't set Authorization headers on WS upgrade)
    token_data = verify_token(token) if token else None
    if not token_data or token_data.get('role') != 'admin':
        await websocket.close(code=4401)
        return
    await admin_ws_manager.connect(websocket)
    try:
        await websocket.send_json({'event': 'connected'})
        while True:
            # Keep the connection alive; client may send pings
            msg = await websocket.receive_text()
            if msg == 'ping':
                await websocket.send_text('pong')
    except WebSocketDisconnect:
        admin_ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS error: {e}")
        admin_ws_manager.disconnect(websocket)

@api_router.post("/admin/connect-to-counselor")
async def admin_connect_user_to_counselor(body: ConnectToCounselorRequest, admin=Depends(get_current_admin)):
    user_doc = await db.users.find_one({'id': body.user_id}, {'_id': 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail='User not found')

    # Resolve counselor: explicit choice or auto-pick the one with the fewest active conversations
    if body.counselor_id:
        counselor = await db.counselors.find_one({'id': body.counselor_id}, {'_id': 0})
        if not counselor:
            raise HTTPException(status_code=404, detail='Counselor not found')
    else:
        all_counselors = await db.counselors.find({}, {'_id': 0}).to_list(100)
        if not all_counselors:
            raise HTTPException(status_code=400, detail='No counselors available')
        counselor_loads = []
        for c in all_counselors:
            load = await db.conversations.count_documents({'counselor_id': c['id']})
            counselor_loads.append((load, c))
        counselor_loads.sort(key=lambda x: x[0])
        counselor = counselor_loads[0][1]

    # Reuse an existing conversation if there is one
    existing = await db.conversations.find_one(
        {'patient_id': body.user_id, 'counselor_id': counselor['id']}, {'_id': 0}
    )
    if existing:
        return {
            'already_exists': True,
            'conversation_id': existing['id'],
            'counselor_id': counselor['id'],
            'counselor_pseudonym': counselor['pseudonym'],
            'counselor_specialty': counselor.get('specialty', '')
        }

    conv_doc = {
        'id': str(uuid.uuid4()),
        'patient_id': body.user_id,
        'counselor_id': counselor['id'],
        'patient_pseudonym': user_doc['pseudonym'],
        'counselor_pseudonym': counselor['pseudonym'],
        'appointment_id': None,
        'created_by': 'admin',
        'created_at': datetime.now(timezone.utc).isoformat(),
        'last_message_at': datetime.now(timezone.utc).isoformat()
    }
    await db.conversations.insert_one(conv_doc)
    return {
        'already_exists': False,
        'conversation_id': conv_doc['id'],
        'counselor_id': counselor['id'],
        'counselor_pseudonym': counselor['pseudonym'],
        'counselor_specialty': counselor.get('specialty', '')
    }

# ========== COUNSELOR PROFILE & AVAILABILITY ==========

@api_router.get("/counselor/profile")
async def get_counselor_profile(counselor=Depends(get_current_counselor)):
    profile = await db.counselors.find_one({'id': counselor['id']}, {'_id': 0, 'pin_hash': 0})
    if not profile:
        raise HTTPException(status_code=404, detail='Counselor profile not found')
    return profile

@api_router.put("/counselor/availability")
async def update_counselor_availability(body: UpdateAvailabilityRequest, counselor=Depends(get_current_counselor)):
    update = {'available_slots': body.available_slots}
    if body.bio is not None:
        update['bio'] = body.bio
    if body.specialty is not None and body.specialty.strip():
        update['specialty'] = body.specialty.strip()
    update['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.counselors.update_one({'id': counselor['id']}, {'$set': update})
    profile = await db.counselors.find_one({'id': counselor['id']}, {'_id': 0, 'pin_hash': 0})
    return profile

# ========== SEED DATA ==========

async def seed_resources():
    count = await db.resources.count_documents({})
    if count > 0:
        return

    resources = [
        {
            'id': str(uuid.uuid4()), 'title': 'Understanding Cognitive Behavioral Therapy',
            'category': 'CBT', 'content': 'Cognitive Behavioral Therapy (CBT) is a structured, goal-oriented form of psychotherapy. It helps you identify negative thought patterns and replace them with healthier ones. Key techniques include:\n\n1. **Thought Records**: Write down negative thoughts, identify distortions, and create balanced alternatives.\n2. **Behavioral Activation**: Schedule activities that bring joy or accomplishment.\n3. **Cognitive Restructuring**: Challenge unhelpful thoughts with evidence.\n4. **Exposure Therapy**: Gradually face feared situations in a safe way.\n\nCBT has strong evidence for treating depression, anxiety, PTSD, and many other conditions.',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()), 'title': 'The 5-4-3-2-1 Grounding Technique',
            'category': 'COPING', 'content': 'When anxiety strikes, use this grounding exercise:\n\n**5** - Name 5 things you can SEE around you\n**4** - Name 4 things you can TOUCH\n**3** - Name 3 things you can HEAR\n**2** - Name 2 things you can SMELL\n**1** - Name 1 thing you can TASTE\n\nThis technique anchors you to the present moment and interrupts anxious thoughts. Practice it regularly so it becomes automatic during stressful times.',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()), 'title': 'Box Breathing for Calm',
            'category': 'COPING', 'content': 'Box breathing (also called square breathing) is used by Navy SEALs to stay calm under pressure:\n\n1. **Breathe IN** for 4 seconds\n2. **HOLD** for 4 seconds\n3. **Breathe OUT** for 4 seconds\n4. **HOLD** for 4 seconds\n\nRepeat 4-6 times. This activates your parasympathetic nervous system, reducing stress hormones and lowering heart rate. Practice daily for best results.',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()), 'title': 'Nigerian Crisis Helplines',
            'category': 'CRISIS', 'content': 'If you or someone you know is in crisis, please reach out:\n\n- **NEMA Crisis Line**: 0800 033 3567 (24/7)\n- **Suicide Prevention Nigeria**: 0800 800 2000\n- **LASUTH Mental Health**: 01-342-9000\n- **SURPIN (Suicide Research & Prevention Initiative)**: +234 806 210 6493\n- **Mentally Aware Nigeria Initiative (MANI)**: DM @MentallyAwareNG on Twitter\n\nYou are not alone. Help is available. Reaching out takes courage.',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()), 'title': 'Understanding Depression',
            'category': 'PSYCHOEDUCATION', 'content': 'Depression is more than feeling sad. It is a medical condition that affects how you think, feel, and act. Common signs include:\n\n- Persistent sadness or emptiness\n- Loss of interest in activities you once enjoyed\n- Changes in appetite or weight\n- Difficulty sleeping or oversleeping\n- Fatigue and low energy\n- Difficulty concentrating\n- Feelings of worthlessness or guilt\n\nDepression is treatable. Therapy, lifestyle changes, and sometimes medication can help. The first step is acknowledging what you are feeling.',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()), 'title': 'Progressive Muscle Relaxation',
            'category': 'COPING', 'content': 'Progressive Muscle Relaxation (PMR) reduces physical tension from stress:\n\n1. Find a quiet, comfortable space\n2. Start with your toes: tense the muscles for 5 seconds, then release for 10 seconds\n3. Move upward: calves, thighs, abdomen, chest, hands, arms, shoulders, neck, face\n4. Notice the difference between tension and relaxation\n5. Take 3 deep breaths to finish\n\nPractice for 10-15 minutes daily. Over time, you will learn to recognize and release tension automatically.',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()), 'title': 'Challenging Negative Thoughts',
            'category': 'CBT', 'content': 'Negative thoughts are common, but they are not always true. Use the ABCDE model:\n\n**A** - Activating event (what happened?)\n**B** - Beliefs (what did you tell yourself?)\n**C** - Consequences (how did you feel/act?)\n**D** - Dispute (is the belief accurate? What evidence exists?)\n**E** - Effect (how do you feel after challenging the thought?)\n\nCommon thought distortions:\n- All-or-nothing thinking\n- Catastrophizing\n- Mind reading\n- Overgeneralization\n\nWith practice, you can train your mind to think more balanced thoughts.',
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()), 'title': 'Understanding Anxiety',
            'category': 'PSYCHOEDUCATION', 'content': 'Anxiety is your body\'s natural response to perceived threats. While some anxiety is normal, excessive anxiety can interfere with daily life.\n\nPhysical symptoms: racing heart, sweating, trembling, shortness of breath\nMental symptoms: excessive worry, difficulty concentrating, restlessness\n\nHelpful strategies:\n- Regular physical exercise (even a 15-minute walk helps)\n- Limiting caffeine and alcohol\n- Maintaining a regular sleep schedule\n- Practicing mindfulness or meditation\n- Talking to a trusted person or professional\n\nAnxiety disorders are among the most treatable mental health conditions.',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.resources.insert_many(resources)
    logger.info("Seeded resources collection")

async def seed_counselors():
    count = await db.counselors.count_documents({})
    if count > 0:
        return

    counselors = [
        {
            'id': str(uuid.uuid4()), 'pseudonym': 'Dr. Serenity',
            'specialty': 'Anxiety & Stress Management',
            'bio': 'Specializes in anxiety disorders and stress management with 8 years of experience in cognitive behavioral therapy.',
            'available_slots': ['Mon 10:00', 'Mon 14:00', 'Wed 10:00', 'Wed 14:00', 'Fri 10:00'],
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()), 'pseudonym': 'Dr. Harmony',
            'specialty': 'Depression & Mood Disorders',
            'bio': 'Expert in mood disorders with a compassionate, person-centered approach. 12 years supporting individuals through depression recovery.',
            'available_slots': ['Tue 09:00', 'Tue 13:00', 'Thu 09:00', 'Thu 13:00', 'Sat 10:00'],
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()), 'pseudonym': 'Dr. Compass',
            'specialty': 'Relationships & Family',
            'bio': 'Focuses on relationship dynamics, family issues, and interpersonal conflicts. Culturally sensitive approach for diverse backgrounds.',
            'available_slots': ['Mon 11:00', 'Wed 11:00', 'Wed 15:00', 'Fri 11:00', 'Fri 15:00'],
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()), 'pseudonym': 'Dr. Resilience',
            'specialty': 'Trauma & PTSD',
            'bio': 'Specialized in trauma recovery using EMDR and trauma-focused CBT. Creates safe spaces for healing.',
            'available_slots': ['Tue 10:00', 'Tue 14:00', 'Thu 10:00', 'Thu 14:00'],
            'created_at': datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.counselors.insert_many(counselors)
    logger.info("Seeded counselors collection")

@app.on_event("startup")
async def startup_event():
    await db.users.create_index('id', unique=True)
    await db.users.create_index('pseudonym', unique=True)
    await db.messages.create_index('session_id')
    await db.messages.create_index('created_at')
    await db.mood_logs.create_index('user_id')
    await db.mood_logs.create_index('logged_at')
    await db.forum_posts.create_index('topic')
    await db.forum_posts.create_index('created_at')
    await db.appointments.create_index('user_id')
    await db.resources.create_index('category')
    await db.conversations.create_index('patient_id')
    await db.conversations.create_index('counselor_id')
    await db.conversation_messages.create_index('conversation_id')
    await db.conversation_messages.create_index('created_at')
    await db.invite_codes.create_index('code', unique=True)
    await db.invite_codes.create_index('used')
    await db.crisis_alerts.create_index('created_at')
    await db.admin_notifications.create_index('created_at')
    await db.admin_notifications.create_index('read')
    await seed_resources()
    await seed_counselors()
    logger.info("MindShield API started - indexes and seed data ready")

# ========== MOOD INSIGHTS ==========

@api_router.post("/mood/insights")
async def get_mood_insights(user=Depends(get_current_user)):
    logs = await db.mood_logs.find(
        {'user_id': user['id']},
        {'_id': 0}
    ).sort('logged_at', -1).to_list(30)

    if len(logs) < 3:
        return {'insight': 'Log at least 3 mood entries to receive personalized insights.'}

    scores = [l['mood_score'] for l in logs]
    avg = sum(scores) / len(scores)
    trend = 'stable'
    if len(scores) >= 5:
        recent = sum(scores[:5]) / 5
        older = sum(scores[-5:]) / 5
        if recent > older + 1:
            trend = 'improving'
        elif recent < older - 1:
            trend = 'declining'

    summary = f"Over the past {len(logs)} entries, your average mood is {avg:.1f}/10 and the trend is {trend}."

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"mood-insight-{user['id']}-{str(uuid.uuid4())[:8]}",
            system_message="You are MindShield's mood insight assistant. Given mood data, provide a brief, warm, actionable insight in 2-3 sentences. Be encouraging and culturally sensitive for Nigerian/West African users. Never diagnose."
        ).with_model("anthropic", "claude-4-sonnet-20250514")

        response = await chat.send_message(UserMessage(text=summary))
        return {'insight': response, 'average': round(avg, 1), 'trend': trend, 'entries': len(logs)}
    except Exception as e:
        logger.error(f"Mood insight AI error: {e}")
        return {'insight': summary, 'average': round(avg, 1), 'trend': trend, 'entries': len(logs)}

# Include router & middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
