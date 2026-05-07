import requests
import sys
import json
import time
from datetime import datetime

class MindShieldAPITester:
    def __init__(self, base_url="https://mindshield-ai.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.pseudonym = None
        self.counselor_token = None
        self.counselor_id = None
        self.counselor_pseudonym = None
        self.booking_id = None
        self.conversation_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = self.session.headers.copy()
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        return self.run_test("Health Check", "GET", "", 200)

    def test_register(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={"pin": "1234"}
        )
        if success and 'user_id' in response:
            self.user_id = response['user_id']
            self.pseudonym = response['pseudonym']
            self.token = response['access_token']
            print(f"   Registered user: {self.pseudonym} ({self.user_id[:8]}...)")
            return True
        return False

    def test_login(self):
        """Test user login with UUID"""
        if not self.user_id:
            print("❌ Cannot test login - no user_id from registration")
            return False
            
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"user_id": self.user_id, "pin": "1234"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Logged in as: {response['pseudonym']}")
            return True
        return False

    def test_send_message(self):
        """Test sending message to AI"""
        success, response = self.run_test(
            "Send Message to AI",
            "POST",
            "messages",
            200,
            data={"message": "I'm feeling a bit anxious today", "session_id": self.user_id}
        )
        if success and 'ai_response' in response:
            print(f"   AI Response: {response['ai_response']['body'][:100]}...")
            print(f"   Emotional State: {response['ai_response']['emotional_state']}")
            return True
        return False

    def test_get_messages(self):
        """Test getting chat history"""
        if not self.user_id:
            return False
            
        success, response = self.run_test(
            "Get Chat History",
            "GET",
            f"messages/{self.user_id}",
            200
        )
        if success and 'messages' in response:
            print(f"   Found {len(response['messages'])} messages")
            return True
        return False

    def test_forum_posts(self):
        """Test forum functionality"""
        # Get forum posts
        success, response = self.run_test(
            "Get Forum Posts",
            "GET",
            "forum/posts",
            200
        )
        if not success:
            return False
            
        print(f"   Found {len(response.get('posts', []))} forum posts")
        
        # Create a new forum post
        success, post_response = self.run_test(
            "Create Forum Post",
            "POST",
            "forum/posts",
            200,
            data={"topic": "General", "body": "This is a test post for the community"}
        )
        if not success or 'id' not in post_response:
            return False
            
        post_id = post_response['id']
        print(f"   Created post with ID: {post_id}")
        
        # Reply to the post
        success, reply_response = self.run_test(
            "Reply to Forum Post",
            "POST",
            f"forum/posts/{post_id}/reply",
            200,
            data={"body": "This is a test reply"}
        )
        if success and 'id' in reply_response:
            print(f"   Created reply with ID: {reply_response['id']}")
            return True
        return False

    def test_mood_tracking(self):
        """Test mood logging and history"""
        # Log a mood entry
        success, response = self.run_test(
            "Log Mood Entry",
            "POST",
            "mood/log",
            200,
            data={"mood_score": 7, "notes": "Feeling good today after testing APIs"}
        )
        if not success:
            return False
            
        print(f"   Logged mood: {response.get('mood_score')}/10")
        
        # Get mood history
        success, history_response = self.run_test(
            "Get Mood History",
            "GET",
            "mood/history?days=30",
            200
        )
        if success and 'mood_logs' in history_response:
            print(f"   Found {len(history_response['mood_logs'])} mood entries")
            return True
        return False

    def test_appointments(self):
        """Test appointment booking system"""
        # Get counselors
        success, response = self.run_test(
            "Get Counselors",
            "GET",
            "appointments/counselors",
            200
        )
        if not success or 'counselors' not in response:
            return False
            
        counselors = response['counselors']
        print(f"   Found {len(counselors)} counselors")
        
        if len(counselors) == 0:
            print("   No counselors available for booking test")
            return True
            
        # Book an appointment with first counselor
        counselor = counselors[0]
        success, booking_response = self.run_test(
            "Create Appointment",
            "POST",
            "appointments",
            200,
            data={
                "counselor_id": counselor['id'],
                "scheduled_at": "2024-12-20T10:00:00Z",
                "notes": "Test appointment booking"
            }
        )
        if success and 'id' in booking_response:
            print(f"   Booked appointment with {counselor['pseudonym']}")
            return True
        return False

    def test_resources(self):
        """Test mental health resources"""
        # Get all resources
        success, response = self.run_test(
            "Get All Resources",
            "GET",
            "resources",
            200
        )
        if not success:
            return False
            
        all_resources = response.get('resources', [])
        print(f"   Found {len(all_resources)} total resources")
        
        # Test category filtering
        success, cbt_response = self.run_test(
            "Get CBT Resources",
            "GET",
            "resources?category=CBT",
            200
        )
        if success:
            cbt_resources = cbt_response.get('resources', [])
            print(f"   Found {len(cbt_resources)} CBT resources")
            return True
        return False

    def test_mood_insights(self):
        """Test AI mood insights (requires multiple mood entries)"""
        # Log a few more mood entries first
        for i, (score, note) in enumerate([(6, "Okay day"), (8, "Great day"), (5, "Meh day")]):
            self.run_test(
                f"Log Mood Entry {i+2}",
                "POST",
                "mood/log",
                200,
                data={"mood_score": score, "notes": note}
            )
            time.sleep(0.5)  # Small delay between requests
        
        # Now try to get insights
        success, response = self.run_test(
            "Get AI Mood Insights",
            "POST",
            "mood/insights",
            200
        )
        if success and 'insight' in response:
            print(f"   AI Insight: {response['insight'][:100]}...")
            return True
        return False

    # ========== COUNSELOR PORTAL TESTS ==========
    
    def test_counselor_register_wrong_code(self):
        """Test counselor registration with wrong access code"""
        success, response = self.run_test(
            "Counselor Registration (Wrong Code)",
            "POST",
            "auth/counselor/register",
            403,
            data={
                "access_code": "WRONG-CODE",
                "specialty": "Anxiety & Stress Management",
                "bio": "Test counselor",
                "pin": "5678"
            }
        )
        return success

    def test_counselor_register(self):
        """Test counselor registration with correct access code"""
        success, response = self.run_test(
            "Counselor Registration",
            "POST",
            "auth/counselor/register",
            200,
            data={
                "access_code": "MINDSHIELD-COUNSELOR",
                "specialty": "Anxiety & Stress Management",
                "bio": "Test counselor for API testing",
                "pin": "5678"
            }
        )
        if success and 'user_id' in response:
            self.counselor_id = response['user_id']
            self.counselor_pseudonym = response['pseudonym']
            self.counselor_token = response['access_token']
            print(f"   Registered counselor: {self.counselor_pseudonym} ({self.counselor_id[:8]}...)")
            return True
        return False

    def test_counselor_login(self):
        """Test counselor login"""
        if not self.counselor_id:
            print("❌ Cannot test counselor login - no counselor_id from registration")
            return False
            
        success, response = self.run_test(
            "Counselor Login",
            "POST",
            "auth/counselor/login",
            200,
            data={"user_id": self.counselor_id, "pin": "5678"}
        )
        if success and 'access_token' in response:
            self.counselor_token = response['access_token']
            print(f"   Logged in as counselor: {response['pseudonym']}")
            return True
        return False

    def test_counselor_get_bookings(self):
        """Test getting counselor bookings"""
        if not self.counselor_token:
            print("❌ Cannot test - no counselor token")
            return False
        
        # Save current token and use counselor token
        patient_token = self.token
        self.token = self.counselor_token
        
        success, response = self.run_test(
            "Get Counselor Bookings",
            "GET",
            "counselor/bookings",
            200
        )
        
        # Restore patient token
        self.token = patient_token
        
        if success and 'bookings' in response:
            bookings = response['bookings']
            print(f"   Found {len(bookings)} bookings")
            # Store first booking ID if exists
            if len(bookings) > 0:
                self.booking_id = bookings[0]['id']
                print(f"   First booking ID: {self.booking_id}")
            return True
        return False

    def test_patient_book_with_counselor(self):
        """Test patient booking appointment with counselor"""
        if not self.counselor_id:
            print("❌ Cannot test - no counselor_id")
            return False
        
        success, response = self.run_test(
            "Patient Books Appointment with Counselor",
            "POST",
            "appointments",
            200,
            data={
                "counselor_id": self.counselor_id,
                "scheduled_at": "2024-12-25T14:00:00Z",
                "notes": "Test booking for counselor chat"
            }
        )
        if success and 'id' in response:
            self.booking_id = response['id']
            print(f"   Booked appointment ID: {self.booking_id}")
            return True
        return False

    def test_counselor_confirm_booking(self):
        """Test counselor confirming a booking"""
        if not self.counselor_token or not self.booking_id:
            print("❌ Cannot test - no counselor token or booking_id")
            return False
        
        # Save current token and use counselor token
        patient_token = self.token
        self.token = self.counselor_token
        
        success, response = self.run_test(
            "Counselor Confirms Booking",
            "PUT",
            f"counselor/bookings/{self.booking_id}/status",
            200,
            data={"status": "CONFIRMED"}
        )
        
        # Restore patient token
        self.token = patient_token
        
        if success:
            print(f"   Booking confirmed: {self.booking_id}")
            return True
        return False

    def test_counselor_get_conversations(self):
        """Test getting counselor conversations"""
        if not self.counselor_token:
            print("❌ Cannot test - no counselor token")
            return False
        
        # Save current token and use counselor token
        patient_token = self.token
        self.token = self.counselor_token
        
        success, response = self.run_test(
            "Get Counselor Conversations",
            "GET",
            "counselor/conversations",
            200
        )
        
        # Restore patient token
        self.token = patient_token
        
        if success and 'conversations' in response:
            conversations = response['conversations']
            print(f"   Found {len(conversations)} conversations")
            if len(conversations) > 0:
                self.conversation_id = conversations[0]['id']
                print(f"   First conversation ID: {self.conversation_id}")
            return True
        return False

    def test_patient_get_conversations(self):
        """Test getting patient conversations"""
        success, response = self.run_test(
            "Get Patient Conversations",
            "GET",
            "conversations",
            200
        )
        if success and 'conversations' in response:
            conversations = response['conversations']
            print(f"   Found {len(conversations)} patient conversations")
            if len(conversations) > 0 and not self.conversation_id:
                self.conversation_id = conversations[0]['id']
                print(f"   Using conversation ID: {self.conversation_id}")
            return True
        return False

    def test_patient_send_message_to_counselor(self):
        """Test patient sending message to counselor"""
        if not self.conversation_id:
            print("❌ Cannot test - no conversation_id")
            return False
        
        success, response = self.run_test(
            "Patient Sends Message to Counselor",
            "POST",
            f"conversations/{self.conversation_id}/messages",
            200,
            data={"body": "Hello counselor, I'm feeling very anxious today and need help."}
        )
        if success and 'id' in response:
            print(f"   Message sent with ID: {response['id']}")
            print(f"   Emotional state detected: {response.get('emotional_state', 'N/A')}")
            return True
        return False

    def test_counselor_get_conversation_messages(self):
        """Test counselor getting conversation messages"""
        if not self.counselor_token or not self.conversation_id:
            print("❌ Cannot test - no counselor token or conversation_id")
            return False
        
        # Save current token and use counselor token
        patient_token = self.token
        self.token = self.counselor_token
        
        success, response = self.run_test(
            "Counselor Gets Conversation Messages",
            "GET",
            f"counselor/conversations/{self.conversation_id}/messages",
            200
        )
        
        # Restore patient token
        self.token = patient_token
        
        if success and 'messages' in response:
            messages = response['messages']
            print(f"   Found {len(messages)} messages in conversation")
            return True
        return False

    def test_counselor_send_message(self):
        """Test counselor sending message to patient"""
        if not self.counselor_token or not self.conversation_id:
            print("❌ Cannot test - no counselor token or conversation_id")
            return False
        
        # Save current token and use counselor token
        patient_token = self.token
        self.token = self.counselor_token
        
        success, response = self.run_test(
            "Counselor Sends Message to Patient",
            "POST",
            f"counselor/conversations/{self.conversation_id}/messages",
            200,
            data={"body": "Hello, I'm here to help. Let's talk about what's making you anxious."}
        )
        
        # Restore patient token
        self.token = patient_token
        
        if success and 'id' in response:
            print(f"   Counselor message sent with ID: {response['id']}")
            return True
        return False

    def test_counselor_cancel_booking(self):
        """Test counselor cancelling a booking"""
        if not self.counselor_token:
            print("❌ Cannot test - no counselor token")
            return False
        
        # Create a new booking first
        success, booking_response = self.run_test(
            "Create Booking for Cancellation Test",
            "POST",
            "appointments",
            200,
            data={
                "counselor_id": self.counselor_id,
                "scheduled_at": "2024-12-26T10:00:00Z",
                "notes": "Test booking for cancellation"
            }
        )
        
        if not success or 'id' not in booking_response:
            return False
        
        cancel_booking_id = booking_response['id']
        
        # Save current token and use counselor token
        patient_token = self.token
        self.token = self.counselor_token
        
        success, response = self.run_test(
            "Counselor Cancels Booking",
            "PUT",
            f"counselor/bookings/{cancel_booking_id}/status",
            200,
            data={"status": "CANCELLED"}
        )
        
        # Restore patient token
        self.token = patient_token
        
        if success:
            print(f"   Booking cancelled: {cancel_booking_id}")
            return True
        return False

def main():
    print("🚀 Starting MindShield API Testing...")
    print("=" * 60)
    
    tester = MindShieldAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("User Registration", tester.test_register),
        ("User Login", tester.test_login),
        ("AI Chat - Send Message", tester.test_send_message),
        ("AI Chat - Get History", tester.test_get_messages),
        ("Forum Operations", tester.test_forum_posts),
        ("Mood Tracking", tester.test_mood_tracking),
        ("Appointment System", tester.test_appointments),
        ("Mental Health Resources", tester.test_resources),
        ("AI Mood Insights", tester.test_mood_insights),
        # NEW COUNSELOR PORTAL TESTS
        ("Counselor Registration (Wrong Code)", tester.test_counselor_register_wrong_code),
        ("Counselor Registration", tester.test_counselor_register),
        ("Counselor Login", tester.test_counselor_login),
        ("Counselor Get Bookings", tester.test_counselor_get_bookings),
        ("Patient Books with Counselor", tester.test_patient_book_with_counselor),
        ("Counselor Confirms Booking", tester.test_counselor_confirm_booking),
        ("Counselor Get Conversations", tester.test_counselor_get_conversations),
        ("Patient Get Conversations", tester.test_patient_get_conversations),
        ("Patient Sends Message to Counselor", tester.test_patient_send_message_to_counselor),
        ("Counselor Gets Conversation Messages", tester.test_counselor_get_conversation_messages),
        ("Counselor Sends Message", tester.test_counselor_send_message),
        ("Counselor Cancels Booking", tester.test_counselor_cancel_booking),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print final results
    print(f"\n{'='*60}")
    print(f"📊 FINAL RESULTS")
    print(f"{'='*60}")
    print(f"✅ Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"❌ Tests failed: {tester.tests_run - tester.tests_passed}/{tester.tests_run}")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n🎉 All tests passed!")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n📈 Success rate: {success_rate:.1f}%")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())