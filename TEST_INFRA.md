# Test Infrastructure Specification: Clara AI Website (Near.com Architecture)

## 1. Test Philosophy & Design Principles

### 1.1 Opaque-Box & Requirement-Driven Verification
All automated tests in this harness operate strictly as **opaque-box** evaluators. The test suite does not mock internal components, inject artificial spies into business logic, or rely on internal implementation variables. Every assertion derives directly from observable user behaviors and external interface contracts specified in `ORIGINAL_REQUEST.md` and `PROJECT.md`:
- Documented CSS design tokens and layout properties (Figtree typography, hairline 1280px container borders, neon mint `#00EC97` / `#65FBAA` color scheme).
- Viewport stability and scroll invariance (`window.scrollY` delta <= 1px during demo navigation).
- Live DOM state changes (accordion panel expansion, dynamic card preview updates, FAQ chevron rotation).
- Frame communication (`postMessage` hash syncing and address bar updates).
- HTTP network contracts (`POST /tables/demo_requests` receiving 200 responses).

### 1.2 Anti-Cheat & Test Integrity Rules
1. **No Facade Tests**: Every test interacts with actual rendered elements, checks computed styles, simulates genuine user pointer/keyboard events, or sends real HTTP requests.
2. **Explicit Expected Output Derivation**: Expected values are grounded in the authoritative reverse-engineering specifications (`spec_miner_survey_1` handoff and `ORIGINAL_REQUEST.md`).
3. **Zero Tolerance for Viewport Disruption**: Any vertical scroll shift (> 1px) during demo navigation constitutes an immediate test failure.
4. **Idempotence & Complete Isolation**: Every test initiates its own browser context or resets page state, preventing test order dependencies.

---

## 2. Feature Inventory & Verification Matrix

The test matrix maps all 24 project features across the 4 automated testing tiers:

| Feature ID | Feature Name | Test Tier | Test Function | Authoritative Specification Source | Pass Criteria |
|---|---|---|---|---|---|
| F01 | Figtree Typography Scale | Tier 1 | `test_f01_figtree_typography` | ORIGINAL_REQUEST.md § R1, PROJECT.md #1 | Font family links/imports Figtree; H1, H2, Subtitles render correct font stack |
| F02 | 1280px Hairline Grid Layout | Tier 1 | `test_f02_hairline_grid_layout` | ORIGINAL_REQUEST.md § R1, PROJECT.md #2 | `max-w-7xl` container with hairline vertical borders (`border-black/11` light, `border-white/11` dark) |
| F03 | Dual-Theme Color Transition | Tier 1 | `test_f03_dual_theme_colors` | ORIGINAL_REQUEST.md § R1, PROJECT.md #3 | White upper flow transitions into deep slate (`#171717`/`#0d0f14`) infrastructure sections |
| F04 | Star-Tile Geometric Mask | Tier 1 & 3 | `test_f04_star_tile_divider` | ORIGINAL_REQUEST.md § 19:40:48Z, PROJECT.md #4 | SVG geometry in `/images/near-star-tile.svg` applied as repeating mask divider at transitions |
| F05 | Sticky Glassmorphic Header | Tier 1 | `test_f05_sticky_header_scroll` | ORIGINAL_REQUEST.md § R2, PROJECT.md #5 | 73px header; transparent at `scrollY=0`, solid white glassmorphic at `scrollY > 50px` |
| F06 | Secondary CTA Header Reveal | Tier 1 | `test_f06_header_secondary_cta` | ORIGINAL_REQUEST.md § 19:40:48Z, PROJECT.md #6 | Secondary CTA fades in smoothly once scrolled past fold (>50px) |
| F07 | Mobile Drawer Navigation | Tier 1 & 2 | `test_f07_mobile_drawer_interactions` | ORIGINAL_REQUEST.md § R6, PROJECT.md #7 | Drawer opens on `#nav-toggle`, closes on ESC, backdrop click, or link click; body scroll lock |
| F08 | Staggered Hero Animation | Tier 1 | `test_f08_hero_staggered_entrance` | ORIGINAL_REQUEST.md § R2, PROJECT.md #8 | Headline and subtext entrance keyframes rendered cleanly |
| F09 | Hero Ambient Glow Container | Tier 1 | `test_f09_hero_ambient_glow` | ORIGINAL_REQUEST.md § R2, PROJECT.md #9 | High-impact neon mint glow backdrop framing `#interactive-demo-iframe` mockup |
| F10 | Quick-Start Pill Badge | Tier 1 | `test_f10_quick_start_badge` | PROJECT.md #10 | Pill badge with pulsing mint indicator: "Next-Gen Autonomous Voice Workforce" |
| F11 | Embedded Demo Initialization | Tier 1 | `test_f11_embedded_demo_initialization` | ORIGINAL_REQUEST.md § R2, PROJECT.md #11 | `#interactive-demo-iframe` loads `/demo/#/` with Clara AI dashboard & mock address bar |
| F12 | Zero-Scroll-Disruption Controls | Tier 2 | `test_f12_zero_scroll_demo_navigation` | ORIGINAL_REQUEST.md § R1-R3, PROJECT.md #12 | Clicking "Live Agent Calls" and demo tabs maintains `delta <= 1px` across y=0, 450, 900, 1500 |
| F13 | PostMessage Hash Sync | Tier 3 | `test_f13_postmessage_bidirectional_sync` | PROJECT.md #13 | `CLARA_NAVIGATE` routes iframe; `DEMO_ROUTE_CHANGED` updates `#mockup-address-bar` |
| F14 | 2-Column Capabilities Accordion | Tier 1 | `test_f14_capabilities_accordion` | ORIGINAL_REQUEST.md § R3, PROJECT.md #14 | 4 accordion items toggle active states and expand corresponding panel descriptions |
| F15 | Dynamic Live Preview Canvas | Tier 1 | `test_f15_preview_canvas_dynamic_update` | ORIGINAL_REQUEST.md § R3, PROJECT.md #15 | Vibrant mint canvas hosting dynamic dark card updating stats on accordion switch |
| F16 | Dynamic Audio Wave Indicator | Tier 1 & 3 | `test_f16_audio_wave_indicator` | PROJECT.md #16 | Pulse/animated soundwave bars inside preview card render and sync with state |
| F17 | Modular 3-Card Infrastructure | Tier 1 | `test_f17_infrastructure_3card_grid` | ORIGINAL_REQUEST.md § R4, PROJECT.md #17 | 1px hairline border grid: Enterprise Security, Sub-500ms Latency, Human-in-the-Loop |
| F18 | Marquee Integration Ticker | Tier 1 & 3 | `test_f18_marquee_integration_ticker` | ORIGINAL_REQUEST.md § R4, PROJECT.md #18 | Continuous marquee ticker displaying HubSpot, Salesforce, Zendesk, Twilio, Stripe, Zapier |
| F19 | Performance Metric Counters | Tier 1 | `test_f19_volume_performance_counters` | ORIGINAL_REQUEST.md § R4, PROJECT.md #19 | 3-column stats counters: `10M+`, `<450ms`, `99.99%` |
| F20 | Split-Layout FAQ Accordion | Tier 1 | `test_f20_faq_expandable_accordion` | ORIGINAL_REQUEST.md § R5, PROJECT.md #20 | Sticky left title/contact button; 6 expandable right questions with rotating SVG icons |
| F21 | Neon Mint Closing CTA Banner | Tier 1 | `test_f21_closing_cta_banner` | ORIGINAL_REQUEST.md § R5, PROJECT.md #21 | Full-bleed green gradient banner ("Your AI voice workforce is minutes away") + dark button |
| F22 | Multi-Column Dark Footer | Tier 1 | `test_f22_dark_structured_footer` | ORIGINAL_REQUEST.md § R5, PROJECT.md #22 | Slate footer (`bg-gray-800`), ambient top glow, multi-column links, contact details, watermark |
| F23 | Lead Booking Form & Mock API | Tier 1 | `test_f23_lead_booking_form_submission` | PROJECT.md #23 | Form submission dispatches `POST /tables/demo_requests`, displays success feedback |
| F24 | Responsive Parity (1440-320px) | Tier 2 | `test_f24_responsive_no_horizontal_overflow`| ORIGINAL_REQUEST.md § R6, PROJECT.md #24 | Zero horizontal scroll overflow across 1440px, 1024px, 768px, 375px, and 320px |

---

## 3. Test Architecture & Tier Stratification

The test infrastructure employs a dual-engine architecture:
1. **Node.js Native Contract Engine (`node:test`)**: High-speed, dependency-free static and API validation (`tests/contract/*.test.js`).
2. **Playwright Browser E2E Engine (Python 3.13 + Chromium 148)**: Full headless browser automation executing Tiers 1 through 4 (`tests/e2e/*.py`).

```
                              [ Central Test Harness ]
                             python3 tests/e2e/runner.py
                                          |
                +-------------------------+-------------------------+
                |                                                   |
     [ Node:test Contract Suite ]                         [ Playwright E2E Suite ]
     - tests/contract/build.test.js                       - tests/e2e/test_tier1_features.py
     - tests/contract/api.test.js                         - tests/e2e/test_tier2_boundary.py
     - tests/contract/links.test.js                       - tests/e2e/test_tier3_cross.py
                                                          - tests/e2e/test_tier4_flows.py
```

### Tier 1: Feature Coverage (Core UI & Happy Paths)
- **Objective**: Validate baseline DOM structure, styles, typography, and functional happy paths of every near.com module and Clara AI embed.
- **Key Assertions**:
  - Figtree typography linked and applied.
  - Header height 73px; transparent at top, solid glassmorphic white when scrolled >50px.
  - Hero headline, ambient glow wrapper, and quick-start badge render.
  - `#interactive-demo-iframe` correctly embedded inside `#interactive-frontend-showcase`.
  - 4-item capabilities accordion toggles active states; preview canvas card reflects selected capability.
  - 3-card dark infrastructure border grid (`bg-white/11`) displays security, latency, and human handoff cards.
  - Marquee ticker renders integration partner names (HubSpot, Salesforce, Zendesk, Twilio, Stripe, Zapier).
  - 3-column stats counters (`10M+`, `<450ms`, `99.99%`) present.
  - Split FAQ accordion toggles open/closed with SVG icon rotation.
  - Neon mint closing CTA banner and dark footer with ambient top blur and contact info.
  - Lead booking form dispatches to mock API with valid response.

### Tier 2: Boundary & Corner Cases
- **Objective**: Verify edge conditions, stress scenarios, extreme inputs, and viewport extremes.
- **Key Assertions**:
  - **Multi-Offset Scroll Stability**: `window.scrollY` delta <= 1px when clicking demo controls at starting offsets `y = 0`, `y = 450`, `y = 900`, and `y = 1500`.
  - **Iframe Internal Scroll Containment**: Scrolling live call transcript inside iframe causes zero ancestor displacement.
  - **Rapid-Fire Accordion Clicking**: Successive clicks (<50ms apart) cycle smoothly without race conditions or uncaught errors.
  - **Viewport Resize Drawer Boundary**: Opening mobile drawer at 375px and resizing viewport to 1440px cleanly auto-dismisses drawer and restores body scroll.
  - **Minimum Viewport (320px)**: Compact mobile devices render with zero horizontal overflow (`scrollWidth <= innerWidth`).
  - **Form Validation Boundaries**: Empty input submissions and invalid email formats trigger HTML5 validation without broken states.

### Tier 3: Cross-Feature Interactions
- **Objective**: Test concurrent subsystems, cross-frame messaging, and animation interplay.
- **Key Assertions**:
  - **Header Scroll State During Anchor Navigation**: Clicking navigation anchors (e.g. `#capabilities`, `#faq`) smoothly shifts header glassmorphic background state in flight.
  - **PostMessage Bidirectional Synchronization**: Outer demo button click triggers `CLARA_NAVIGATE` -> iframe route updates -> iframe emits `DEMO_ROUTE_CHANGED` -> outer `#mockup-address-bar` updates.
  - **Animation Concurrency**: Simultaneous infinite marquee scroll, audio wave bar pulsations, and accordion transitions maintain smooth rendering without thread lock.
  - **Star-Tile SVG Mask Boundary**: Repeating 21x21px star-tile divider mask renders without white/dark seam artifacts between light and dark sections.

### Tier 4: Real-World Conversion Workflows
- **Objective**: Execute multi-step user conversion journeys replicating real end-user behaviors.
- **Key Scenarios**:
  1. **Desktop Enterprise Buyer Journey** (1440x900): Landing -> Hero reading -> Demo navigation (Dashboard -> Live Calls -> Knowledge Base -> Analytics) with invariant scroll -> Capabilities accordion review -> Infrastructure & Security evaluation -> FAQ review -> Lead booking submission.
  2. **Mobile Prospect Journey** (375x812): Landing -> Mobile drawer opening -> Nav link click -> Hero inspection -> Mobile preview card -> Capabilities accordion review -> FAQ expansion -> Booking CTA interaction.
  3. **Developer Evaluator Flow**: Console error audit (0 exceptions, 0 unexpected console errors), static asset integrity audit (all local assets HTTP 200), and PostMessage contract verification.

---

## 4. Execution Environment & Tooling

- **Operating System**: macOS (ARM64 Apple Silicon)
- **Node.js**: v22.14.0 (Natively supports `node:test` and `node:assert`)
- **Python**: 3.13 (`/Library/Frameworks/Python.framework/Versions/3.13/bin/python3`)
- **Browser Automation**: Playwright Python with Google Chrome for Testing (Chromium 148.0.7778.96 pre-installed at `~/Library/Caches/ms-playwright/chromium-1223`)
- **Local Server**: Express 4 server on `http://localhost:3000/` (`server.js`)
- **Server Lifecycle**: Automated management via `tests/e2e/runner.py` (checks for existing server on port 3000; boots daemon if inactive; shuts down daemon on completion).

---

## 5. Coverage Thresholds & Quality Gates

| Quality Metric | Required Threshold | Verification Mechanism |
|---|---|---|
| Total Feature Coverage | 100% of 24 specified features | Automated checks in Tier 1 |
| Scroll Invariance Delta | `Math.abs(afterY - beforeY) <= 1px` | Multi-offset assertions across y=0, 450, 900, 1500 |
| Page Errors / Exceptions | Exactly 0 `pageerror` events | Intercepted via Playwright `page.on('pageerror')` |
| Unexpected Console Errors | Exactly 0 (ignoring known 3rd-party calendar sandbox CSP) | Intercepted via Playwright `page.on('console')` |
| Asset Integrity | 100% local images, scripts, stylesheets return HTTP 200 | Crawled and fetched via Playwright request context |
| Horizontal Overflow | `scrollWidth <= innerWidth` across 1440px, 1024px, 768px, 375px, 320px | Evaluated via DOM `getBoundingClientRect` audit |
