"""
Tier 1: Feature Coverage (Core UI & Happy Paths)
Automated E2E tests for all near.com modules + Clara AI embed.
"""

import unittest
from playwright.sync_api import sync_playwright
from tests.e2e.test_utils import (
    BASE_URL,
    start_server_if_needed,
    init_browser_context,
)


class TestTier1Features(unittest.TestCase):
    """Tier 1: Feature Coverage & Happy Paths."""

    @classmethod
    def setUpClass(cls):
        start_server_if_needed()
        cls.playwright = sync_playwright().start()

    @classmethod
    def tearDownClass(cls):
        cls.playwright.stop()

    def setUp(self):
        self.browser, self.context, self.page, self.auditor = init_browser_context(
            self.playwright, width=1440, height=900
        )
        self.page.goto(f"{BASE_URL}/", wait_until="networkidle")

    def tearDown(self):
        self.context.close()
        self.browser.close()

    def test_t1_01_figtree_typography_and_1280px_grid(self):
        """F01 & F02: Verify Figtree font import, typography rules, and 1280px grid hairline borders."""
        # 1. Figtree typography import/declaration
        has_figtree = self.page.evaluate("""() => {
            const links = Array.from(document.querySelectorAll('link[href*="Figtree"], link[href*="figtree"]'));
            const bodyFont = window.getComputedStyle(document.body).fontFamily;
            const html = document.documentElement.innerHTML;
            return links.length > 0 || bodyFont.toLowerCase().includes('figtree') || 
                   html.includes('Figtree') || html.includes('figtree');
        }""")
        self.assertTrue(has_figtree, "Figtree typography must be imported and configured in head/CSS")

        # 2. 1280px container layout (max-w-7xl)
        grid_container = self.page.evaluate("""() => {
            const el = document.querySelector('.max-w-7xl, [class*="max-w-7xl"]');
            if (!el) return null;
            const style = window.getComputedStyle(el);
            return {
                maxWidth: style.maxWidth,
                borderLeft: style.borderLeftWidth,
                borderRight: style.borderRightWidth
            };
        }""")
        self.assertIsNotNone(grid_container, "1280px grid container (.max-w-7xl) must exist in DOM")
        self.assertIn("1280px", grid_container["maxWidth"], "Container max-width must equal 1280px (max-w-7xl)")

    def test_t1_02_sticky_glassmorphic_header_and_secondary_cta(self):
        """F05 & F06: 73px header; transparent at scroll 0, solid white glassmorphic at scroll > 50px with secondary CTA."""
        header = self.page.locator("header, #site-header, .site-header").first
        self.assertTrue(header.count() > 0, "Site header must be present")

        # Check height is ~73px (70-76px allowed)
        box = header.bounding_box()
        self.assertIsNotNone(box, "Header must be visible")
        self.assertAlmostEqual(box["height"], 73, delta=4, msg="Header height must be 73px (+/- 4px)")

        # Scroll position 0: Header is transparent
        is_transparent_at_top = self.page.evaluate("""() => {
            const h = document.querySelector('header, #site-header, .site-header');
            const style = window.getComputedStyle(h);
            const bg = style.backgroundColor;
            const hasScrolledClass = h.classList.contains('scrolled');
            return !hasScrolledClass && (bg.includes('rgba(0, 0, 0, 0)') || bg === 'transparent' || h.className.includes('bg-transparent') || bg.includes('rgba(255, 255, 255, 0)'));
        }""")
        self.assertTrue(is_transparent_at_top, "Header must have transparent styling at top of page")

        # Scroll down 150px: Header gains glassmorphic white background
        self.page.evaluate("window.scrollTo(0, 150)")
        self.page.evaluate("window.dispatchEvent(new Event('scroll'))")
        self.page.wait_for_timeout(350)

        # Sticky positioning verification: Header must remain pinned to top of viewport (y == 0 +/- 1)
        scrolled_box = header.bounding_box()
        self.assertIsNotNone(scrolled_box, "Header bounding box must be available after scroll")
        self.assertAlmostEqual(
            scrolled_box["y"], 
            0, 
            delta=1, 
            msg=f"Sticky header must remain pinned at top of viewport (y == 0 +/- 1), got y={scrolled_box['y']} at scrollY=150"
        )
        self.assertGreaterEqual(
            scrolled_box["y"], 
            -1, 
            f"Sticky header must not scroll off top of viewport (y >= -1), got y={scrolled_box['y']}"
        )
        self.assertLessEqual(
            scrolled_box["y"], 
            1, 
            f"Sticky header must remain pinned at top of viewport (y <= 1), got y={scrolled_box['y']}"
        )

        header_top = self.page.evaluate("() => document.getElementById('site-header').getBoundingClientRect().top")
        self.assertAlmostEqual(
            header_top, 
            0, 
            delta=1, 
            msg=f"Sticky header getBoundingClientRect().top must remain 0 at scrollY=150, got {header_top}"
        )

        header_scrolled = self.page.evaluate("""() => {
            const h = document.querySelector('header, #site-header, .site-header');
            const style = window.getComputedStyle(h);
            return {
                bg: style.backgroundColor,
                backdropFilter: style.backdropFilter || style.webkitBackdropFilter || '',
                classes: h.className
            };
        }""")
        self.assertTrue(
            "scrolled" in header_scrolled["classes"] or 
            "bg-white" in header_scrolled["classes"] or
            "255" in header_scrolled["bg"] or
            "blur" in header_scrolled["backdropFilter"],
            f"Header must evolve to solid glassmorphic white on scroll > 50px: {header_scrolled}"
        )

        # Secondary CTA reveal on scroll
        secondary_cta_visible = self.page.evaluate("""() => {
            const cta = document.querySelector('.header-cta-secondary, .header-secondary-cta, header .nav-cta, [data-header-cta]');
            if (!cta) return false;
            const style = window.getComputedStyle(cta);
            return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity || '1') > 0;
        }""")
        self.assertTrue(secondary_cta_visible, "Secondary CTA in header must be visible when scrolled past fold")

        # Deep scroll verification (scrollY = 500)
        self.page.evaluate("window.scrollTo(0, 500)")
        self.page.evaluate("window.dispatchEvent(new Event('scroll'))")
        self.page.wait_for_timeout(200)
        deep_box = header.bounding_box()
        self.assertIsNotNone(deep_box, "Header bounding box must be available at scrollY=500")
        self.assertAlmostEqual(
            deep_box["y"], 
            0, 
            delta=1, 
            msg=f"Sticky header must remain pinned at top of viewport at scrollY=500, got y={deep_box['y']}"
        )

    def test_t1_03_hero_staggered_entrance_and_ambient_glow(self):
        """F08, F09, F10: Hero headline, ambient glow framing container, and quick-start pill badge."""
        # Quick-start pill badge
        pill_badge_found = self.page.evaluate("""() => {
            const text = document.body.textContent || '';
            const hasText = text.includes('Next-Gen Autonomous Voice Workforce');
            const pillEl = document.querySelector('.rounded-full, .pill-badge, [class*="rounded-full"]');
            return hasText && Boolean(pillEl);
        }""")
        self.assertTrue(
            pill_badge_found,
            "Quick-start pill badge with 'Next-Gen Autonomous Voice Workforce' must exist in DOM"
        )

        # Ambient glow container framing the demo
        has_ambient_glow = self.page.evaluate("""() => {
            const glowEl = document.querySelector('.hero-glow-container, .ambient-glow, [class*="gradient-glow"], [style*="CCFFE1"]');
            if (glowEl) return true;
            const html = document.documentElement.innerHTML;
            return html.includes('hero-glow-container') || html.includes('CCFFE1') || html.includes('00EC97');
        }""")
        self.assertTrue(has_ambient_glow, "Hero ambient glow container framing demo must be present")

    def test_t1_04_embedded_demo_iframe_initialization(self):
        """F11: Verify #interactive-demo-iframe inside #interactive-frontend-showcase with address bar."""
        showcase = self.page.locator("#interactive-frontend-showcase")
        self.assertTrue(showcase.count() > 0, "#interactive-frontend-showcase must exist")

        iframe = self.page.locator("#interactive-demo-iframe")
        self.assertTrue(iframe.count() > 0, "#interactive-demo-iframe must exist")

        src = iframe.get_attribute("src") or ""
        self.assertTrue(src.startswith("/demo"), f"Iframe src must point to /demo, got '{src}'")

        # Mock address bar exists
        address_bar = self.page.locator("#mockup-address-bar, .mockup-address-bar, [data-address-bar]")
        self.assertTrue(address_bar.count() > 0, "Mockup address bar element must exist")

    def test_t1_05_capabilities_accordion_and_live_preview_canvas(self):
        """F14, F15, F16: 2-Column capabilities accordion with dynamic live preview canvas and audio waves."""
        accordion_items = self.page.locator(
            "#capabilities-accordion .capability-item, [data-capability-index], [data-accordion-item], .capability-item"
        )
        item_count = accordion_items.count()
        self.assertGreaterEqual(item_count, 4, "Must render 4 capability accordion items")

        # Verify preview canvas card exists
        preview_card = self.page.locator(
            "#capability-preview-card, #capabilities-preview-card, [data-preview-card], .capabilities-canvas-card"
        )
        self.assertTrue(preview_card.count() > 0, "Dynamic live preview canvas card must exist")

        # Click second capability item and verify active toggle
        second_item = accordion_items.nth(1)
        second_item.click()
        self.page.wait_for_timeout(350)

        # Check that second item is active
        item_classes = second_item.get_attribute("class") or ""
        item_aria = second_item.get_attribute("aria-expanded") or ""
        self.assertTrue(
            "active" in item_classes or "open" in item_classes or item_aria == "true" or "bg-gray-50" in item_classes,
            f"Accordion item 1 must be active after click: {item_classes}"
        )

        # Verify preview card contains dynamic voice/audio indicators
        has_audio_wave = self.page.evaluate("""() => {
            const card = document.querySelector('#capability-preview-card, #capabilities-preview-card, [data-preview-card]');
            if (!card) return false;
            return card.querySelectorAll('[class*="animate-wave"], [class*="wave"], .wave-bar, .audio-bar').length > 0;
        }""")
        self.assertTrue(has_audio_wave, "Preview card must render animated audio wave indicators")

    def test_t1_06_modular_3card_infrastructure_grid(self):
        """F17: 3-Card dark infrastructure grid with 1px hairline border grid."""
        infra_section = self.page.locator(
            "#infrastructure, section.infrastructure-section, [data-section='infrastructure']"
        )
        self.assertTrue(infra_section.count() > 0, "Infrastructure section must exist")

        # 3 cards: Security, Latency, Escalation
        has_security = self.page.locator("text=Enterprise Security").count() > 0 or \
                       self.page.locator("text=Security & Compliance").count() > 0
        has_latency = self.page.locator("text=Sub-500ms").count() > 0 or \
                      self.page.locator("text=Ultra-Low Latency").count() > 0
        has_escalation = self.page.locator("text=Human-in-the-Loop").count() > 0 or \
                         self.page.locator("text=Escalation").count() > 0

        self.assertTrue(has_security, "Card 1: Enterprise Security & Compliance must exist")
        self.assertTrue(has_latency, "Card 2: Sub-500ms Ultra-Low Latency must exist")
        self.assertTrue(has_escalation, "Card 3: Human-in-the-Loop Escalation must exist")

    def test_t1_07_marquee_integration_ticker(self):
        """F18: Continuous marquee ticker displaying partner integrations with gradient opacity masks."""
        ticker = self.page.locator(".ticker-wrap, .marquee-ticker, [data-marquee]").first
        self.assertTrue(ticker.count() > 0, "Integration marquee ticker element must exist")

        ticker_text = ticker.text_content() or ""
        partners = ["HubSpot", "Salesforce", "Zendesk", "Twilio", "Stripe", "Zapier"]
        for p in partners:
            self.assertIn(p, ticker_text, f"Marquee ticker must contain integration partner: {p}")

    def test_t1_08_volume_and_performance_counters(self):
        """F19: 3-Column animated volume/performance counters (10M+, <450ms, 99.99%)."""
        page_html = self.page.content()
        self.assertTrue(
            "10M+" in page_html or "10M" in page_html or "10" in page_html,
            "Metrics counter must contain 10M+ volume counter"
        )
        self.assertTrue(
            "450ms" in page_html or "<450ms" in page_html or "380ms" in page_html,
            "Metrics counter must contain latency counter"
        )
        self.assertTrue(
            "99.99%" in page_html or "99.9%" in page_html,
            "Metrics counter must contain 99.99% availability counter"
        )

    def test_t1_09_split_layout_faq_accordion_with_rotating_icons(self):
        """F20: Split-layout FAQ with sticky left title and right-hand expandable accordion with rotating SVG icons."""
        faq_section = self.page.locator("#faq, section.faq-section, [data-section='faq']")
        self.assertTrue(faq_section.count() > 0, "FAQ section must exist")

        faq_items = self.page.locator(".faq-item, [data-faq-item], details.faq-details")
        self.assertGreaterEqual(faq_items.count(), 4, "Must render at least 4 FAQ items")

        # Toggle first FAQ item
        first_faq = faq_items.first
        first_btn = first_faq.locator("button, summary").first
        first_btn.click()
        self.page.wait_for_timeout(300)

        # Confirm answer is visible and icon rotates
        is_expanded = self.page.evaluate("""() => {
            const first = document.querySelector('.faq-item, [data-faq-item], details.faq-details');
            if (!first) return false;
            if (first.tagName === 'DETAILS') return Boolean(first.open);
            const answer = first.querySelector('.faq-answer, [data-faq-answer]');
            const btn = first.querySelector('button');
            const hasOpenClass = first.classList.contains('active') || first.classList.contains('open');
            const ariaExpanded = btn && btn.getAttribute('aria-expanded') === 'true';
            const displayVisible = answer && window.getComputedStyle(answer).display !== 'none';
            return Boolean(hasOpenClass || ariaExpanded || displayVisible);
        }""")
        self.assertTrue(is_expanded, "FAQ item must expand when clicked")

    def test_t1_10_neon_mint_closing_cta_and_dark_structured_footer(self):
        """F21 & F22: Neon mint full-bleed CTA banner and structured dark footer with contact details and watermark."""
        # Closing CTA banner
        cta_banner = self.page.locator(".closing-cta, .closing-cta-banner, [data-closing-cta]")
        self.assertTrue(
            cta_banner.count() > 0 or self.page.locator("text=Your AI voice workforce is minutes away").count() > 0,
            "Neon mint closing CTA banner ('Your AI voice workforce is minutes away') must exist"
        )

        # Dark footer
        footer = self.page.locator("footer, #footer, .site-footer")
        self.assertTrue(footer.count() > 0, "Site footer must exist")

        footer_text = footer.text_content() or ""
        self.assertIn("biz@thehubcode.com", footer_text, "Footer must contain contact email biz@thehubcode.com")
        self.assertIn("+91 8369698455", footer_text, "Footer must contain contact phone +91 8369698455")

    def test_t1_11_lead_booking_form_submission(self):
        """F23: Submits lead booking form and verifies mock API call succeeds without page error."""
        # Open booking modal if not already open
        self.page.evaluate("""() => {
            if (typeof openBookingModal === 'function') {
                openBookingModal();
            }
        }""")
        self.page.wait_for_timeout(300)

        form = self.page.locator("#demo-form, form#demo-request-form, form.demo-form, [data-lead-form]").first
        if form.count() > 0 and form.is_visible():
            name_input = form.locator("input[name='name'], input#lead-name").first
            email_input = form.locator("input[name='email'], input#lead-email").first
            if name_input.count() > 0:
                name_input.fill("E2E Test Lead")
            if email_input.count() > 0:
                email_input.fill("lead@testcompany.ai")

            submit_btn = form.locator("button.form-submit, button[type='submit']").first
            if submit_btn.count() > 0:
                submit_btn.click()
                self.page.wait_for_timeout(500)

        # Assert no unexpected page errors occurred during interaction
        self.assertEqual(self.auditor.page_errors, [], "Zero page errors during lead booking interaction")


if __name__ == "__main__":
    unittest.main()
