# MindShield - AI-Enhanced Mental Health Platform

## Original Problem Statement
Build a complete, production-ready AI-Enhanced Mental Health Platform called MindShield for a final-year CS project at University of Ilorin. The platform addresses the global mental health treatment gap with secure, anonymous, AI-driven support.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + Zustand (in-memory state)
- **Backend**: FastAPI (Python) + MongoDB
- **AI**: Anthropic Claude (via emergentintegrations) for crisis detection
- **Auth**: UUID-based anonymous sessions + JWT (role-based: user/counselor/admin)
- **Design**: "Deep Forest Glow" dark theme (Manrope + Figtree fonts)

## User Personas
1. **Students/Young Adults**: Anonymous mental health support seekers in Nigeria/West Africa
2. **Counselors**: Professional therapists with invite-based registration, booking management, real-time patient chat
3. **Admin**: Platform administrator with analytics, user/counselor management, content moderation

## What's Been Implemented
### Phase 1 (2026-03-24) - Core Platform
- [x] Anonymous UUID auth (register + login)
- [x] AI Chat with Claude (NORMAL/MILD_DISTRESS/CRISIS detection)
- [x] Crisis Alert with Nigerian helplines
- [x] Community Forum with topic boards
- [x] Mood Tracker with Recharts charts + AI insights
- [x] Appointment booking with counselors
- [x] Resources library (8 articles)

### Phase 2 (2026-03-24) - Counselor Portal
- [x] Separate counselor auth with access code
- [x] Booking management (view/confirm/cancel)
- [x] Real-time counselor-patient chat (3s polling)
- [x] Emotional state badges on patient messages
- [x] UUID credentials display on registration

### Phase 3 (2026-05-07) - Admin Panel
- [x] Admin login with hardcoded credentials
- [x] Platform analytics dashboard (12 stats + 3 recent activity metrics)
- [x] User management (list/remove with full data cleanup)
- [x] Counselor management (list/remove)
- [x] One-time invite code system for counselor registration
- [x] Content moderation (flag/unflag/delete forum posts)
- [x] Crisis alerts log with user pseudonyms

### Phase 4 (2026-05-07) - Real-time Safety & Counselor Self-Service
- [x] Admin Crisis Notification System (5s poll, badge, dropdown panel)
- [x] CRISIS notifications triggered from AI chat AND counselor conversations
- [x] One-click "Connect to Counselor" from a CRISIS notification (auto-picks least-loaded counselor, idempotent)
- [x] Mark single / mark-all-read for notifications
- [x] AI Auto-Flagging of forum posts (Claude background task) → FLAGGED_POST admin notification + flag_reason surfaced in AdminModeration UI
- [x] Counselor Availability Editor in CounselorDashboard (add/remove slots, save) backed by GET /api/counselor/profile + PUT /api/counselor/availability

### Phase 5 (2026-05-07) - Realtime Push & Notification Polish
- [x] Replaced 5s polling with WebSocket (`/api/ws/admin/notifications?token=`) — instant push of new CRISIS / FLAGGED_POST events to connected admins
- [x] Auto-reconnect with 3s backoff on disconnect
- [x] Live/Offline status badge in panel header
- [x] Toast popup on every incoming WS notification
- [x] DELETE /api/admin/notifications + "Clear all" button in panel for resetting

## Credentials
- Admin: username=admin, password=mindshield_admin_2024
- Counselor Access Code: MINDSHIELD-COUNSELOR (fallback) or admin-generated invite codes

## Prioritized Backlog
### P1
- Persist Zustand auth state across hard reload (wrap `useStore` with `zustand/middleware` `persist`) — currently F5 logs the user out
- WebSocket for true real-time **counselor↔patient chat** (replace 3s message polling, like notifications)
- Session summary reports for counselors

### P2
- Dark/Light theme toggle
- Multi-language (Yoruba, Igbo, Hausa)
- Forum/messages pagination
- Data export for mood history
- Push notifications
- Visibility-aware notification polling pause
