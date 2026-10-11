# ClaraAI — "Hidden Cost of Every Sales Conversation" Landing Page

## Project Goal
A persuasive, emotionally-driven landing page section for **ClaraAI**, a real-time AI sales co-pilot.
Instead of leading with features, the page follows a story-first sequence:

1. **The Problem** — the hidden cost of every sales conversation (typing headline + challenge list + live animated AI dashboard demo)
2. **What Managers Struggle With** — icon cards + a bold highlighted statement
3. **Founder Story** — "One Observation. One Question. One Mission." (placed right after the problem sections, per UX recommendation)
4. **The Solution** — Without ClaraAI vs. With ClaraAI comparison table
5. **Book a Live Demo** — lead-capture CTA form

This sequence builds emotional connection ("this is exactly our problem") before presenting ClaraAI as the solution.

## Currently Completed Features

- **Sticky glassmorphism navigation** with smooth-scroll anchor links and a mobile hamburger menu.
- **Typing-animation headline** ("Your Sales Team Isn't Losing Deals Because They Can't Sell... They're Losing Deals Because They Don't Have the Right Information at the Right Time.") built with vanilla JS, no external animation library.
- **Challenges list** (9 pain points) with staggered scroll-triggered reveal animation.
- **Animated AI dashboard mock** on the right side of the problem section: simulates a live customer objection ("Why should I choose your project instead of another builder?") followed by 6 auto-animating AI response cards (Competitor Comparison, Objection Handling, Payment Plan, Key USPs, Confidence Score with animated counter, Suggested Response). The sequence loops automatically once scrolled into view.
- **"What Managers Struggle With Every Day"** — 6 icon cards (No Visibility, No Live Assistance, No Standardization, Difficult Coaching, No Customer Intent Insights, No Performance Intelligence) plus a large highlighted closing statement: *"Sales Managers don't need more reports. They need real-time intelligence."*
- **Founder Story section** with a cinematic dark background, founder photo (Vitus Rodrigo), narrative copy, an embedded pull-quote, and a closing signature quote — positioned immediately after the problem/manager sections per the recommended UX flow.
- **Comparison section** ("How ClaraAI Solves Every One of These Problems") as a clean Without/With split table (not a features list), with red ✗ / green ✓ indicators.
- **Book a Live Demo section** with a lead-capture form (Name, Email, Company, Phone, Team Size, Message) that persists submissions to the `demo_requests` table via the RESTful Table API.
- **Scroll-reveal animations** throughout using `IntersectionObserver` for a polished, modern feel.
- Fully **responsive** layout (mobile nav, stacked grids, adjusted comparison table on small screens).

## Functional Entry Points

| Path / Anchor | Purpose |
|---|---|
| `index.html` | Main (and only) page |
| `#problem` | The Hidden Cost of Every Sales Conversation section |
| `#managers` | What Managers Struggle With Every Day section |
| `#founder` | Founder Story section |
| `#solution` | How ClaraAI Solves Every Problem (comparison table) |
| `#demo` | Book a Live Demo lead-capture form |

### API Endpoint Used
- `POST tables/demo_requests` — creates a new lead record when the demo form is submitted.
- `GET tables/demo_requests` — (available, not yet wired to a UI) for future admin/CRM view of submitted leads.

## Data Model

**Table: `demo_requests`**

| Field | Type | Description |
|---|---|---|
| `id` | text | Unique identifier (client-generated) |
| `name` | text | Full name of the lead |
| `email` | text | Work email address |
| `company` | text | Company / brand name |
| `phone` | text | Phone number |
| `team_size` | text | Approx. size of the sales team |
| `message` | rich_text | Additional message / requirements |
| `status` | text (enum: new, contacted, demo_scheduled, closed) | Lead status |

Plus auto-managed system fields: `gs_project_id`, `gs_table_name`, `created_at`, `updated_at`.

## Not Yet Implemented

- No admin dashboard to view/manage submitted `demo_requests` leads (data is stored and retrievable via the Table API, but no UI screen exists yet).
- No additional marketing sections beyond what was scoped (e.g., pricing, testimonials/case studies, FAQ, integrations logos) — can be added as separate sections if needed.
- No actual live product screenshots/video of ClaraAI in action (dashboard is an illustrative animated mock-up, not connected to a live backend).
- No blog/resources section or multi-page navigation.
- No authentication or gated content — the whole page is public marketing content.

## Recommended Next Steps

1. Add an internal "Leads" admin view (simple table listing of `demo_requests`) if the team wants to review submissions without leaving the browser.
2. Add real product screenshots/video once available, replacing the animated illustrative dashboard.
3. Add testimonials/case studies section beneath the comparison table to reinforce social proof before the demo CTA.
4. Add a FAQ section addressing common objections (data security, CRM integration, pricing) right before the final CTA.
5. Connect the demo form to an email notification workflow (e.g., via a user-provided CORS-enabled, auth-free webhook) if real-time alerting on new leads is desired.
6. When ready to go live, publish via the **Publish tab**.

## Tech Stack

- Static HTML5 + CSS3 (custom, dark theme, `Inter` + `Space Grotesk` via Google Fonts)
- Tailwind CSS (CDN, utility helpers)
- Font Awesome 6 (CDN, icons)
- Vanilla JavaScript (typing animation, scroll reveal, dashboard animation, form submission) — no frameworks
- RESTful Table API for lead persistence

## Images Used
- `images/founder-vitus.jpg` — founder portrait (CC/PD-licensed stock photo)
- `images/dubai-skyline-bg.jpg` — cinematic UAE-skyline background for the Founder Story section
- `images/sales-team-bg.jpg` — reserved for future use (not currently referenced on the page)

## Deployment

To deploy this website and make it live, go to the **Publish tab** — it will handle all deployment steps automatically and provide a live URL.
