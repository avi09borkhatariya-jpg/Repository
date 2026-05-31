# LectureAI Publish Checklist

## Required Inputs

- Groq API key: starts with `gsk_`. Used in the professor browser for transcription and deeper notes.
- Razorpay Key ID: starts with `rzp_test_` for testing or `rzp_live_` for launch.
- Razorpay Key Secret: keep this only in your hosting provider environment variables.

## Razorpay Setup

1. Open Razorpay Dashboard.
2. Use Test Mode first.
3. Go to **Account & Settings** -> **API Keys**.
4. Generate/copy the Key ID and Key Secret.
5. Put the Key ID in the LectureAI app Setup screen.
6. Put both values in your deployment environment:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`

## Deploy On Vercel

1. Upload this folder to a Git repo or import it into Vercel.
2. Set the two Razorpay environment variables above.
3. Deploy.
4. Open the site root `/` (a `vercel.json` rewrite serves the app there; `/LectureAI_Working.html` also works).
5. In Setup, enter the Groq key, Razorpay Key ID, profile, and lecture rights confirmation.
6. Create a short test lecture from pasted transcript.
7. Generate a share link and open it in a fresh browser tab.
8. Pay with Razorpay test payment details.
9. Confirm the notes download only after payment verification succeeds.

## Local Checks

This folder has no package dependencies. If `npm` is available, run:

```bash
npm run check
npm run dev
```

If `npm` is not available but `node` is, run:

```bash
node scripts/check-html.mjs
node scripts/smoke-api.mjs
node scripts/local-server.mjs
```

Then open:

```text
http://localhost:4173/LectureAI_Working.html
```

For local live Razorpay order testing, start the server with:

```bash
RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx node scripts/local-server.mjs
```

## Razorpay Connector (optional — for inspection only)

The Razorpay MCP/connector lets an assistant *read* your live payments, orders and
settlements. It is **not required for the product to take payments** — the app uses
Razorpay's public Checkout plus your own keys, which is a separate path. As of the last
check (2026-05-31) the connector reported its session was invalidated and needs to be
reconnected before any live-account inspection can be done.
