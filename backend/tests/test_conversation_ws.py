"""
Tests for the Conversation WebSocket realtime feature on MindShield.
Covers:
  - WS auth (4401 invalid, 4404 unknown conv, 4403 non-participant)
  - Patient + Counselor both can connect to a shared conversation
  - Message broadcasts on counselor POST and patient POST
  - Multiple simultaneous connections all receive the broadcast
  - CRISIS message creates admin notification AND broadcasts via conv WS
  - Disconnect cleanup (broadcast still works after a client closes)
"""
import asyncio
import json
import os
import time
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://mindshield-ai.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
WS_BASE = BASE_URL.replace("http://", "ws://").replace("https://", "wss://")

ADMIN_USER = "admin"
ADMIN_PASS = "mindshield_admin_2024"

CRISIS_MSG = (
    "I cannot do this anymore. I am thinking of ending my life tonight. "
    "I have planned how I will kill myself."
)


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_headers(s):
    r = s.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def patient(s):
    r = s.post(f"{API}/auth/register", json={}, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"id": d["user_id"], "token": d["access_token"], "headers": {"Authorization": f"Bearer {d['access_token']}"}}


@pytest.fixture(scope="module")
def other_patient(s):
    r = s.post(f"{API}/auth/register", json={}, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"id": d["user_id"], "token": d["access_token"], "headers": {"Authorization": f"Bearer {d['access_token']}"}}


@pytest.fixture(scope="module")
def counselor(s, admin_headers):
    r = s.post(f"{API}/admin/invites", json={"specialty_hint": "Anxiety"}, headers=admin_headers, timeout=20)
    assert r.status_code == 200, r.text
    code = r.json()["code"]
    payload = {"access_code": code, "specialty": "Anxiety", "bio": "WS test counselor", "pin": "1234"}
    r = s.post(f"{API}/auth/counselor/register", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"id": d["user_id"], "token": d["access_token"], "headers": {"Authorization": f"Bearer {d['access_token']}"}}


@pytest.fixture(scope="module")
def conversation_id(s, admin_headers, patient, counselor):
    r = s.post(
        f"{API}/admin/connect-to-counselor",
        json={"user_id": patient["id"], "counselor_id": counselor["id"]},
        headers=admin_headers,
        timeout=20,
    )
    assert r.status_code == 200, r.text
    return r.json()["conversation_id"]


WS_HEADERS = {"User-Agent": "Mozilla/5.0 (TestRunner) websockets-test"}


async def _open_ws(conv_id: str, token: str):
    url = f"{WS_BASE}/api/ws/conversations/{conv_id}?token={token}"
    return await websockets.connect(url, additional_headers=WS_HEADERS, open_timeout=10, ping_interval=None)


async def _drain_connected(ws):
    """Receive the initial 'connected' frame so the next recv gets a message.new."""
    raw = await asyncio.wait_for(ws.recv(), timeout=5)
    data = json.loads(raw)
    assert data.get("event") == "connected"


async def _next_event(ws, expected_event="message.new", timeout=15):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        raw = await asyncio.wait_for(ws.recv(), timeout=deadline - time.monotonic())
        data = json.loads(raw)
        if data.get("event") == expected_event:
            return data
    raise AssertionError(f"Did not receive {expected_event}")


# ---------------- Auth rejection ----------------
class TestWSAuth:
    def test_ws_rejects_missing_token(self, conversation_id):
        async def go():
            url = f"{WS_BASE}/api/ws/conversations/{conversation_id}"
            with pytest.raises(websockets.exceptions.InvalidStatus) as exc_info:
                async with await websockets.connect(url, additional_headers=WS_HEADERS, open_timeout=10):
                    pass
            return exc_info
        # Servers that reject during handshake raise InvalidStatus; some configs accept then close with code.
        # Try handshake first, fall back to accept-then-close.
        async def go2():
            url = f"{WS_BASE}/api/ws/conversations/{conversation_id}"
            try:
                ws = await websockets.connect(url, additional_headers=WS_HEADERS, open_timeout=10)
            except Exception as e:
                return ("handshake_reject", e)
            try:
                # If accepted, server should close with 4401
                await asyncio.wait_for(ws.recv(), timeout=5)
            except websockets.exceptions.ConnectionClosed as e:
                return ("closed", e.code)
            finally:
                try: await ws.close()
                except Exception: pass
            return ("no_close", None)

        result = asyncio.run(go2())
        # Accept either rejection style. Code (if any) should be 4401.
        assert result[0] in ("handshake_reject", "closed"), result
        if result[0] == "closed":
            assert result[1] == 4401, f"expected close code 4401, got {result[1]}"

    def _try_open_and_get_status(self, url):
        """Returns ('handshake_reject', exception) or ('closed', code) or ('opened', received_data)."""
        async def go():
            try:
                ws = await websockets.connect(url, additional_headers=WS_HEADERS, open_timeout=10)
            except Exception as e:
                return ("handshake_reject", e)
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=5)
                return ("opened", raw)
            except websockets.exceptions.ConnectionClosed as e:
                return ("closed", e.code)
            except asyncio.TimeoutError:
                return ("opened_no_data", None)
            finally:
                try: await ws.close()
                except Exception: pass
        return asyncio.run(go())

    def test_ws_rejects_invalid_token(self, conversation_id):
        url = f"{WS_BASE}/api/ws/conversations/{conversation_id}?token=bogus.invalid.jwt"
        kind, info = self._try_open_and_get_status(url)
        assert kind in ("handshake_reject", "closed"), f"expected rejection, got {kind} {info}"
        if kind == "closed":
            # 4401 expected; ingress may translate to generic 1006
            assert info in (4401, 1006), f"expected 4401, got {info}"

    def test_ws_rejects_unknown_conversation(self, patient):
        url = f"{WS_BASE}/api/ws/conversations/does-not-exist-uuid-xyz?token={patient['token']}"
        kind, info = self._try_open_and_get_status(url)
        assert kind in ("handshake_reject", "closed"), f"expected rejection, got {kind} {info}"
        if kind == "closed":
            assert info in (4404, 1006), f"expected 4404, got {info}"

    def test_ws_rejects_non_participant(self, conversation_id, other_patient):
        url = f"{WS_BASE}/api/ws/conversations/{conversation_id}?token={other_patient['token']}"
        kind, info = self._try_open_and_get_status(url)
        assert kind in ("handshake_reject", "closed"), f"expected rejection, got {kind} {info}"
        if kind == "closed":
            assert info in (4403, 1006), f"expected 4403, got {info}"


# ---------------- Broadcast ----------------
class TestWSBroadcast:
    def test_counselor_post_broadcasts_to_patient(self, s, conversation_id, patient, counselor):
        async def go():
            ws = await _open_ws(conversation_id, patient["token"])
            try:
                await _drain_connected(ws)
                # Counselor sends a message via REST
                body = "Hello from counselor (WS test)"
                r = s.post(
                    f"{API}/counselor/conversations/{conversation_id}/messages",
                    json={"body": body},
                    headers=counselor["headers"],
                    timeout=20,
                )
                assert r.status_code == 200, r.text
                expected_id = r.json()["id"]
                ev = await _next_event(ws, "message.new", timeout=15)
                msg = ev["message"]
                assert msg["id"] == expected_id
                assert msg["sender_role"] == "counselor"
                assert msg["body"] == body
                assert "emotional_state" in msg
            finally:
                await ws.close()
        asyncio.run(go())

    def test_patient_post_broadcasts_to_counselor(self, s, conversation_id, patient, counselor):
        async def go():
            ws = await _open_ws(conversation_id, counselor["token"])
            try:
                await _drain_connected(ws)
                body = "Hi counselor, I'm doing better today."
                r = s.post(
                    f"{API}/conversations/{conversation_id}/messages",
                    json={"body": body},
                    headers=patient["headers"],
                    timeout=20,
                )
                assert r.status_code == 200, r.text
                expected_id = r.json()["id"]
                ev = await _next_event(ws, "message.new", timeout=20)
                msg = ev["message"]
                assert msg["id"] == expected_id
                assert msg["sender_role"] in ("user", "patient")
                assert msg["body"] == body
            finally:
                await ws.close()
        asyncio.run(go())

    def test_multiple_clients_all_receive(self, s, conversation_id, patient, counselor):
        async def go():
            p1 = await _open_ws(conversation_id, patient["token"])
            p2 = await _open_ws(conversation_id, patient["token"])
            c1 = await _open_ws(conversation_id, counselor["token"])
            try:
                await asyncio.gather(_drain_connected(p1), _drain_connected(p2), _drain_connected(c1))
                body = "Broadcast fan-out test"
                r = s.post(
                    f"{API}/counselor/conversations/{conversation_id}/messages",
                    json={"body": body},
                    headers=counselor["headers"],
                    timeout=20,
                )
                assert r.status_code == 200
                expected_id = r.json()["id"]
                results = await asyncio.gather(
                    _next_event(p1, "message.new", 15),
                    _next_event(p2, "message.new", 15),
                    _next_event(c1, "message.new", 15),
                )
                for ev in results:
                    assert ev["message"]["id"] == expected_id
            finally:
                for w in (p1, p2, c1):
                    try: await w.close()
                    except Exception: pass
        asyncio.run(go())

    def test_disconnect_cleanup_does_not_break_broadcast(self, s, conversation_id, patient, counselor):
        async def go():
            survivor = await _open_ws(conversation_id, counselor["token"])
            ephemeral = await _open_ws(conversation_id, patient["token"])
            try:
                await asyncio.gather(_drain_connected(survivor), _drain_connected(ephemeral))
                # Close the ephemeral client and give server a tick to clean up
                await ephemeral.close()
                await asyncio.sleep(0.5)
                body = "Post-cleanup broadcast"
                r = s.post(
                    f"{API}/counselor/conversations/{conversation_id}/messages",
                    json={"body": body},
                    headers=counselor["headers"],
                    timeout=20,
                )
                assert r.status_code == 200
                ev = await _next_event(survivor, "message.new", 15)
                assert ev["message"]["body"] == body
            finally:
                try: await survivor.close()
                except Exception: pass
        asyncio.run(go())

    def test_crisis_patient_message_creates_admin_notification_and_broadcasts(
        self, s, conversation_id, patient, counselor, admin_headers
    ):
        async def go():
            ws = await _open_ws(conversation_id, counselor["token"])
            try:
                await _drain_connected(ws)
                r = s.post(
                    f"{API}/conversations/{conversation_id}/messages",
                    json={"body": CRISIS_MSG},
                    headers=patient["headers"],
                    timeout=30,
                )
                assert r.status_code == 200, r.text
                expected_id = r.json()["id"]
                ev = await _next_event(ws, "message.new", 30)
                assert ev["message"]["id"] == expected_id
                assert ev["message"]["body"] == CRISIS_MSG
                return expected_id
            finally:
                try: await ws.close()
                except Exception: pass

        msg_id = asyncio.run(go())

        # Allow background CRISIS notification creation
        found = False
        for _ in range(15):
            r = s.get(f"{API}/admin/notifications", headers=admin_headers, timeout=20)
            assert r.status_code == 200
            for n in r.json().get("notifications", []):
                meta = n.get("metadata") or {}
                if n.get("type") == "CRISIS" and meta.get("conversation_id") == conversation_id:
                    found = True
                    break
            if found:
                break
            time.sleep(2)
        assert found, "CRISIS admin notification was not created for the patient WS message"
