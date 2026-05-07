# MindShield Test Credentials

## Admin
- URL: `/admin`
- Username: `admin`
- Password: `mindshield_admin_2024`

## Counselor
- Counselor accounts are registered through invite codes generated from the Admin → Management page.
- Fallback access code (no invite): `MINDSHIELD-COUNSELOR`
- After registration the counselor receives a `user_id` (UUID) shown once on screen — they must save it for login.
- Login URL: `/counselor/login` — requires the UUID and the PIN they set during registration (or no PIN if they skipped).

## Patient (Anonymous User)
- URL: `/onboarding`
- No credentials needed — registration generates a UUID + pseudonym automatically.
- PIN is optional during registration.
