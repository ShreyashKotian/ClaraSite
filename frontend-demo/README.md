# 🖥️ ClaraAI — Standalone Frontend Demo (No Backend Required)

This folder contains a **100% self-contained frontend demo** of the ClaraAI Dashboard, decoupled from all backends, databases, vector stores, and external API services.

It is designed specifically for **landing page demonstrations, portfolio showcases, marketing embeds, and UI previews**.

---

## ✨ Features Included in the Demo

1. **Full Interactive Dashboard**:
   - Live KPI cards: Total Conversations, Qualified Leads, Close Rate, Talk Balance.
   - Interactive date range presets (`7d`, `30d`, `90d`, custom date picker).
   - Dynamic outcome filters: Filter calls by *Qualified*, *Follow-up*, *At Risk*, or view *All*.
   - Lead mix donut chart with conversion band verdicts.
   - Buying Signals vs. Objections theme breakdown.
   - Weekly call volume trends.
   - Sales talk habits & coaching performance radar.

2. **Call Review & Audio Peek Modal**:
   - Click any call row or play icon to open the **Call Peek Modal** or navigate to the full **Call Review page**.
   - Simulated audio player with animated waveform amplitude bars and timeline scrubber.
   - Full transcript with speech bubbles, speaker roles (*Rep* vs. *Customer*), and timestamps.
   - AI-generated suggestion tags and post-call analysis report.

3. **Interactive Live Call Simulator (`/live`)**:
   - Click **"New Session"** or navigate to **Live Calls**.
   - Click **"Start session"** to launch an interactive live sales call simulation.
   - Realistic customer dialogue arrives in real-time.
   - Clara AI suggestions trigger automatically in response to customer questions (e.g., pricing, maintenance, floor plans).
   - "Ask AI anything" bar provides instant grounded real estate answers.

4. **Knowledge Base UI (`/knowledge`)**:
   - Preview uploaded property brochures, pricing lists, and customer FAQs.
   - Interactive file upload, sync, and delete simulations directly in local memory.

5. **Zero Login Barrier**:
   - Pre-configured with a default authenticated user (`Alex Morgan`).
   - Landing on the website immediately opens the dashboard without asking for credentials.
   - Includes an optional "Instant Demo Access" shortcut on the login/signup screens.

---

## 🚀 How to Run Locally

### 1. Development Mode
```bash
cd frontend-demo
npm install
npm run dev
```
Open **`http://localhost:5174`** in your browser.

### 2. Static Production Build
```bash
cd frontend-demo
npm run build
npm run preview
```
The output in `dist/` is pure static HTML/CSS/JS and can be hosted anywhere (Vercel, Netlify, Cloudflare Pages, GitHub Pages, AWS S3) or embedded into any landing page as an `<iframe>`.
