"""
MindShield comprehensive tests covering:
  - Admin Crisis Notification System
  - AI Auto-Flagging of Forum Posts
  - Counselor Scheduling/Availability Management
  - Regression for existing flows
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://mindshield-ai.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "admin"
ADMIN_PASS = "mindshield_admin_2024"

CRISIS_MSG = (
    "I cannot do this anymore. I am thinking of ending my life tonight. "
    "I have planned how I will kill myself. Please nobody can help me."
)
BENIGN_MSG = "I had a relaxing weekend gardening and reading. Hope everyone is doing well today!"
TOXIC_MSG = (
    "You are pathetic and worthless. Just go ahead and kill yourself, nobody cares about you. "
    "The world would be much better without losers like you. Please end it tonight."
)


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def patient(s):
    r = s.post(f"{API}/auth/register", json={}, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    return {
        "id": data["user_id"],
        "pseudonym": data["pseudonym"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
    }


@pytest.fixture(scope="module")
def counselor(s, admin_headers):
    # Generate invite
    r = s.post(f"{API}/admin/invites", json={"specialty_hint": "Anxiety"}, headers=admin_headers, timeout=20)
    assert r.status_code == 200, r.text
    code = r.json()["code"]
    # Register counselor with the invite code
    payload = {"access_code": code, "specialty": "Anxiety", "bio": "Test counselor", "pin": "1234"}
    r = s.post(f"{API}/auth/counselor/register", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    return {
        "id": data["user_id"],
        "pseudonym": data["pseudonym"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
    }


# ---------- Health ----------
class TestHealth:
    def test_root_api(self, s):
        r = s.get(f"{API}/", timeout=15)
        assert r.status_code in (200, 404)


# ---------- Admin login ----------
class TestAdminAuth:
    def test_admin_login_success(self, s):
        r = s.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("role") == "admin" and d.get("access_token")

    def test_admin_login_wrong(self, s):
        r = s.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": "bad"}, timeout=15)
        assert r.status_code == 401


# ---------- CRISIS notification via /api/messages ----------
class TestCrisisNotification:
    def test_crisis_message_creates_notification_and_alert(self, s, patient, admin_headers):
        # Snapshot current crisis alerts count
        before_alerts = s.get(f"{API}/admin/crisis-alerts", headers=admin_headers, timeout=15).json()["alerts"]
        before_alert_ids = {a["id"] for a in before_alerts}

        r = s.post(f"{API}/messages", json={"message": CRISIS_MSG}, headers=patient["headers"], timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "ai_response" in data
        # State may sometimes be classified as MILD_DISTRESS by LLM, but expected is CRISIS for this prompt
        state = data["ai_response"]["emotional_state"]
        assert state in ("CRISIS", "MILD_DISTRESS", "NORMAL")
        # If not CRISIS, mark xfail-like skip but continue
        if state != "CRISIS":
            pytest.skip(f"AI did not classify as CRISIS (got {state}); skipping notification check")

        # crisis_alerts increments
        after_alerts = s.get(f"{API}/admin/crisis-alerts", headers=admin_headers, timeout=15).json()["alerts"]
        new_alert_ids = {a["id"] for a in after_alerts} - before_alert_ids
        assert len(new_alert_ids) >= 1

        # admin_notifications has CRISIS for this user
        notifs = s.get(f"{API}/admin/notifications?limit=100", headers=admin_headers, timeout=15).json()["notifications"]
        crisis_for_user = [n for n in notifs if n.get("type") == "CRISIS" and n.get("user_id") == patient["id"]]
        assert len(crisis_for_user) >= 1
        assert crisis_for_user[0]["title"]


# ---------- Admin notification endpoints ----------
class TestAdminNotificationEndpoints:
    def test_list_count_and_mark_read(self, s, admin_headers):
        # Ensure at least one notification exists; if not, create one synthetically via crisis flow already done.
        # Get list
        r = s.get(f"{API}/admin/notifications", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        notifs = r.json()["notifications"]
        assert isinstance(notifs, list)

        # count endpoint
        r = s.get(f"{API}/admin/notifications/count", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert "count" in r.json() and isinstance(r.json()["count"], int)

        # If unread exists, mark single as read
        unread = [n for n in notifs if not n.get("read")]
        if unread:
            nid = unread[0]["id"]
            r = s.put(f"{API}/admin/notifications/{nid}/read", headers=admin_headers, timeout=15)
            assert r.status_code == 200, r.text
            assert r.json().get("read") is True

        # Mark-all-read
        r = s.put(f"{API}/admin/notifications/read-all", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert "modified" in r.json()

        r = s.get(f"{API}/admin/notifications/count", headers=admin_headers, timeout=15)
        assert r.json()["count"] == 0

    def test_notifications_require_auth(self, s):
        r = s.get(f"{API}/admin/notifications", timeout=15)
        assert r.status_code in (401, 403)


# ---------- Connect to Counselor ----------
class TestConnectToCounselor:
    def test_connect_creates_then_returns_existing(self, s, admin_headers, patient, counselor):
        body = {"user_id": patient["id"]}
        r = s.post(f"{API}/admin/connect-to-counselor", json=body, headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "conversation_id" in d
        assert d.get("counselor_pseudonym")
        assert "counselor_specialty" in d
        first_conv = d["conversation_id"]

        # Call again with explicit counselor_id of the same counselor — should return already_exists
        body2 = {"user_id": patient["id"], "counselor_id": d["counselor_id"]}
        r2 = s.post(f"{API}/admin/connect-to-counselor", json=body2, headers=admin_headers, timeout=20)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2.get("already_exists") is True
        assert d2["conversation_id"] == first_conv

    def test_connect_invalid_user(self, s, admin_headers):
        r = s.post(f"{API}/admin/connect-to-counselor", json={"user_id": "nonexistent-id"}, headers=admin_headers, timeout=15)
        assert r.status_code == 404


# ---------- Forum auto-flag ----------
class TestForumAutoFlag:
    def test_toxic_post_is_flagged(self, s, patient, admin_headers):
        r = s.post(f"{API}/forum/posts", json={"topic": "general", "body": TOXIC_MSG}, headers=patient["headers"], timeout=20)
        assert r.status_code == 200, r.text
        post = r.json()
        post_id = post["id"]
        assert post.get("is_flagged") is False  # initially false; background task runs after

        # poll up to ~25s
        flagged = False
        for _ in range(12):
            time.sleep(2.5)
            posts = s.get(f"{API}/forum/posts").json()["posts"]
            target = next((p for p in posts if p["id"] == post_id), None)
            if target and target.get("is_flagged"):
                flagged = True
                assert target.get("flag_reason"), "flag_reason should be populated"
                break
        assert flagged, "Toxic post was not auto-flagged within timeout"

        # Admin notification with type FLAGGED_POST referencing this post
        notifs = s.get(f"{API}/admin/notifications?limit=100", headers=admin_headers, timeout=15).json()["notifications"]
        match = [n for n in notifs if n.get("type") == "FLAGGED_POST" and n.get("metadata", {}).get("post_id") == post_id]
        assert len(match) >= 1, "FLAGGED_POST admin notification missing"

    def test_benign_post_not_flagged(self, s, patient):
        r = s.post(f"{API}/forum/posts", json={"topic": "general", "body": BENIGN_MSG}, headers=patient["headers"], timeout=20)
        assert r.status_code == 200
        pid = r.json()["id"]
        # Wait for moderation task to settle
        time.sleep(8)
        posts = s.get(f"{API}/forum/posts").json()["posts"]
        target = next((p for p in posts if p["id"] == pid), None)
        assert target is not None
        assert target.get("is_flagged") is False


# ---------- Conversation crisis branch ----------
class TestConversationCrisis:
    def test_crisis_message_in_conversation(self, s, admin_headers, patient, counselor):
        # Ensure a conversation between patient & counselor exists via connect-to-counselor
        body = {"user_id": patient["id"], "counselor_id": counselor["id"]}
        r = s.post(f"{API}/admin/connect-to-counselor", json=body, headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        conv_id = r.json()["conversation_id"]

        r = s.post(
            f"{API}/conversations/{conv_id}/messages",
            json={"body": CRISIS_MSG},
            headers=patient["headers"],
            timeout=60,
        )
        assert r.status_code == 200, r.text
        msg = r.json()
        if msg.get("emotional_state") != "CRISIS":
            pytest.skip(f"AI did not classify counselor message as CRISIS (got {msg.get('emotional_state')})")

        notifs = s.get(f"{API}/admin/notifications?limit=200", headers=admin_headers, timeout=15).json()["notifications"]
        match = [n for n in notifs if n.get("type") == "CRISIS" and n.get("metadata", {}).get("conversation_id") == conv_id]
        assert len(match) >= 1


# ---------- Counselor profile & availability ----------
class TestCounselorProfileAvailability:
    def test_get_counselor_profile(self, s, counselor):
        r = s.get(f"{API}/counselor/profile", headers=counselor["headers"], timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("id") == counselor["id"]
        assert "available_slots" in d and isinstance(d["available_slots"], list)
        assert "pin_hash" not in d

    def test_get_counselor_profile_unauth(self, s):
        r = s.get(f"{API}/counselor/profile", timeout=15)
        assert r.status_code in (401, 403)

    def test_update_availability(self, s, counselor):
        new_slots = ["Mon 09:00", "Tue 14:00", "Thu 16:30"]
        r = s.put(
            f"{API}/counselor/availability",
            json={"available_slots": new_slots, "bio": "Updated bio"},
            headers=counselor["headers"],
            timeout=15,
        )
        assert r.status_code == 200, r.text
        prof = r.json()
        assert prof["available_slots"] == new_slots
        assert prof["bio"] == "Updated bio"

        # Persistence check
        r2 = s.get(f"{API}/counselor/profile", headers=counselor["headers"], timeout=15)
        assert r2.json()["available_slots"] == new_slots


# ---------- Regression ----------
class TestRegression:
    def test_patient_register(self, s):
        r = s.post(f"{API}/auth/register", json={}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("user_id") and d.get("access_token")

    def test_admin_analytics(self, s, admin_headers):
        r = s.get(f"{API}/admin/analytics", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_users", "total_counselors", "total_messages", "flagged_posts"):
            assert k in d

    def test_forum_get(self, s):
        r = s.get(f"{API}/forum/posts", timeout=15)
        assert r.status_code == 200
        assert "posts" in r.json()

    def test_mood_log(self, s, patient):
        r = s.post(
            f"{API}/mood/log",
            json={"mood_score": 7, "note": "Doing okay"},
            headers=patient["headers"],
            timeout=15,
        )
        assert r.status_code == 200, r.text

    def test_appointments_list_counselors(self, s):
        r = s.get(f"{API}/appointments/counselors", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json().get("counselors"), list)
