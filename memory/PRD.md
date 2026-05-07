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

## Credentials
- Admin: username=admin, password=mindshield_admin_2024
- Counselor Access Code: MINDSHIELD-COUNSELOR (fallback) or admin-generated invite codes

## Prioritized Backlog
### P1
- WebSocket for true real-time chat
- Counselor availability/scheduling management
- Session summary reports for counselors

### P2
- Dark/Light theme toggle
- Multi-language (Yoruba, Igbo, Hausa)
- AI-moderated forum content auto-flagging
- Data export for mood history
- Push notifications
