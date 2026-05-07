# MindShield - AI-Enhanced Mental Health Platform

## Original Problem Statement
Build a complete, production-ready AI-Enhanced Mental Health Platform called MindShield for a final-year CS project at University of Ilorin. The platform addresses the global mental health treatment gap with secure, anonymous, AI-driven support.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + Zustand (in-memory state)
- **Backend**: FastAPI (Python) + MongoDB
- **AI**: Anthropic Claude (via emergentintegrations) for crisis detection
- **Auth**: UUID-based anonymous sessions + JWT
- **Design**: "Deep Forest Glow" dark theme (Manrope + Figtree fonts)

## User Personas
1. **Students/Young Adults**: Anonymous mental health support seekers in Nigeria/West Africa
2. **Counselors**: Professional therapists managing bookings and real-time patient chat

## Core Requirements (Static)
- Anonymous UUID-based authentication (no email, no phone)
- AI-powered chat with crisis detection (NORMAL/MILD_DISTRESS/CRISIS)
- Nigerian crisis helplines integration
- Community forums (anonymous peer support)
- Mood tracking with 30-day trend charts + AI insights
- Appointment booking system
- Mental health resources library (CBT, Coping, Crisis, Psychoeducation)
- Counselor portal with separate auth, booking management, real-time patient chat

## What's Been Implemented (2026-03-24)
- [x] Full backend API (18+ endpoints) with MongoDB
- [x] Anonymous UUID auth (register + login)
- [x] AI Chat with Claude integration (NORMAL/MILD_DISTRESS/CRISIS detection)
- [x] Crisis Alert system with Nigerian helplines
- [x] Community Forum with topic boards + replies
- [x] Mood Tracker with Recharts charts + AI insights
- [x] Appointment booking system with 4 pre-seeded counselors
- [x] Resources library (8 articles: CBT, Coping, Crisis, Psychoeducation)
- [x] Counselor Portal (2026-03-24): Registration with access code, booking management, real-time patient chat, emotional state badges
- [x] Patient-Counselor conversation system (auto-created on booking confirmation)

## Prioritized Backlog
### P0 (Critical)
- All core features implemented

### P1 (Important)
- WebSocket for true real-time chat (currently polling every 3s)
- Data export for user mood history
- Counselor availability management

### P2 (Nice to have)
- Dark/Light theme toggle
- Multi-language support (Yoruba, Igbo, Hausa)
- Push notifications for new messages
- AI-moderated forum content flagging
- Session summary reports for counselors

## Next Tasks
1. Enhance real-time with WebSockets
2. Add counselor scheduling/availability management
3. Add forum content moderation
4. Add accessibility improvements
