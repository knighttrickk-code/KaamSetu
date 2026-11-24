# KaamSetu — direct hiring for blue-collar work

"LinkedIn meets Tinder for blue-collar workers." Households and local businesses connect directly with maids, cooks, caretakers, gardeners, plumbers, electricians, security guards, drivers and showroom staff — no placement agency. Workers keep 100% of their earnings.

**Stack:** React 18 + Vite · Tailwind CSS · framer-motion (swipe cards) · react-leaflet + OpenStreetMap (no API key) · recharts (admin) · Supabase (auth, DB, storage, realtime, RLS).

---

## 1. Run it (2 minutes)

```bash
npm install
npm run dev        # open http://localhost:5173
```

That's it. The app runs fully in **demo mode** out of the box:

- Login OTP is always `123456`
- Or tap **Try demo as Worker / Household / Business / Admin** on the login page
- All data (20 workers, 8 employers, 8 jobs, chats, requests) lives in the browser's localStorage
- **Realtime across tabs:** open two browser tabs, log in as *Household* in one and *Worker* in the other — requests, accepts and chat messages appear instantly in both
- Seeded (non-demo) profiles auto-respond to your requests after ~6 seconds, so one person can test the whole flow
- *Profile → Settings → Reset demo data* restores the original data

Build for production: `npm run build` → upload the `dist/` folder to Vercel / Netlify (set the SPA fallback to `index.html`).

## 2. End-to-end test script

1. Login → **Household** demo (Priya Agrawal, Mathura).
2. **People** tab: drag a card right (green CONNECT stamp) or tap 💚. Drag left = PASS (hidden for 30 days). ↩ = undo, ⭐ = save.
3. Wait ~6 s → 🔔 "X accepted your request". Priya's first connection is already used, so 1 credit is deducted and the phone appears.
4. 💬 → **Chats** → open the chat → Call / WhatsApp buttons, quick-reply chips, voice input 🎤.
5. Connect with another worker → no credits left → **Unlock phone number** → mock payment (₹99 / ₹249) → phone revealed.
6. **Mark as hired** → **Rate now** → stars + tags → the worker's rating and badges update.
7. Login as **Worker** (Ramesh) → 💬 Received: 4 pending requests, 🔊 Listen reads them aloud, Accept / Decline.
8. **Discover** tab: map with role pins, radius circle, filter chips, list view, bottom-sheet preview.
9. **Job Profile**: change role / budget / distance → "N matches near you" and the feed update instantly. Post a job with ₹49 Urgent boost.
10. **Profile**: preview card, edit with voice, camera photo, ID upload (last 4 digits only), referral code, wallet & transactions.
11. Login as **Admin** (desktop): charts, heat-map, verification queue (approve / reject with reason), reports (warn / suspend / dismiss), users / jobs / reviews, CSV export.

## 3. Connect real Supabase

1. Create a Supabase project. In **SQL editor**, run `supabase/schema.sql`, then `supabase/seed.sql` (regenerate any time with `npm run seed:sql`).
2. Copy `.env.example` → `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Enable **Phone** auth (needs an SMS provider such as Twilio / MSG91) and **Email** auth in Supabase → Authentication.
4. Restart `npm run dev`. Login now sends a real OTP (`src/lib/supabase.js`).
5. Data layer: every action in `src/lib/store.js` maps 1:1 to a table / RPC in `schema.sql` (`respondRequest` → `accept_request()` RPC, `sendMessage` → `messages` + realtime, etc.). Replace each function body with the Supabase call to move the data from localStorage to Postgres. Screens don't need to change.
6. Make an admin: `update profiles set role = 'admin' where user_id = '<auth uuid>';`
7. Schedule request expiry: `select cron.schedule('*/30 * * * *', 'select expire_requests()');`

**Privacy built into the schema:**
- Phone numbers are in `private_contacts` — readable only by the employer side of an accepted request where the credit was paid.
- Exact lat/lng are readable only by the owner; others get `public_profiles` (rounded ~1 km) and `nearby_workers()` (distance rounded to 0.5 km). Map pins are also offset 150–350 m in the UI.
- Verification images go to the private `verification-docs` bucket (admin-only). Only ID type + last 4 digits are stored — never the full Aadhaar.
- Reviews can only be inserted by the employer of an accepted / hired connection.

## 4. Payments (Razorpay later)

`processPayment()` in `src/lib/store.js` is the single mock gateway. Replace its body with Razorpay Checkout and keep the same return shape `{ ok, paymentId }`. Pricing lives in `PACKS` in the same file:
- Workers: free forever. Swiping & requests: free.
- Households: first connection free, then ₹99 / connection or ₹249 for 5 (60 days).
- Business: Basic ₹499/month (20 connections, 2 posts) · Pro ₹1,499/month (unlimited).
- Urgent boost: ₹49 for 48 hours.

## 5. Adding a language

`src/i18n.js` → add a new key (e.g. `bn: {...}`) with the same keys as `en`, and add it to `LANGS` with its speech code (e.g. `bn-IN`).

## 6. File map

```
index.html                 SEO + OG meta tags
public/                    favicon.svg, og-image.png
src/main.jsx, App.jsx      entry + routes
src/i18n.js                English / हिंदी strings, roles, languages
src/lib/store.js           data layer, matching score, credits, payments, demo auto-responses
src/lib/seed.js            demo data
src/lib/geo.js             haversine, privacy offset, areas
src/lib/useApp.js          hook: state + current user + translations
src/lib/supabase.js        optional Supabase OTP
src/lib/image.js           photo downscaling
src/components/            AppShell (header, bottom nav, phone frame), ProfileCard, PaymentModal, ui kit
src/pages/                 Landing, Safety, Login, Onboarding, People, Discover, JobProfile, Profile,
                           Requests, Chat, Notifications, Admin
supabase/schema.sql        tables, RLS policies, RPCs, storage buckets, realtime
supabase/seed.sql          generated demo data
scripts/gen-seed-sql.mjs   regenerates seed.sql from src/lib/seed.js
```
