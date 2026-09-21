SALE PAINT — PHASE 4 HARDENING PACKAGE

These are the files changed from the supplied sales-management (3).zip.

Implemented:
- Production API client rejects anonymous/localStorage pseudo-credentials.
- Client-side backend switching through SALEPAINT_DATA_BACKEND is disabled.
- Cloudflare Worker cryptographically verifies Firebase ID tokens (RS256/JWK), or can verify Supabase access tokens when AUTH_BACKEND=supabase.
- Worker no longer accepts arbitrary bearer strings or anonymous-pc.
- Worker no longer falls back to mock.supabase.co/mock-key.
- Live Supabase is required for production API operations.
- Server dual-write refuses production writes when live Supabase is unavailable unless ALLOW_MOCK_DB=true (test-only).
- Express gateway no longer returns Mock DB data for production reads; it returns 503 when live Supabase is unavailable.
- Added scripts/verify-phase4-live.ts for real Supabase verification.
- Added production environment controls to .env.example.

NOT claimed by this package:
- A live Supabase project was not verified because credentials are not contained in the ZIP.
- Firebase Auth -> Supabase Auth cannot be declared complete from source files alone. The current app still has direct Firestore listeners/writes, so changing primary authentication without completing the data-layer cutover would break Firestore access. Keep Firebase Auth during this transition.
- Firebase/Firestore are not deleted.
- Commission logic is untouched.

Verification command after dependencies and real server credentials are available:
  npm run verify:phase4-live

For production:
  ALLOW_MOCK_DB=false
  AUTH_BACKEND=firebase
  FIREBASE_PROJECT_ID=<actual Firebase project id>
  SUPABASE_URL=<actual Supabase URL>
  SUPABASE_SERVICE_ROLE_KEY=<server/Worker secret>
  ALLOWED_ORIGINS=<actual app origin(s)>
