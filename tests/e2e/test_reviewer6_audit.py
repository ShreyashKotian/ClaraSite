#!/usr/bin/env python3
"""
Independent Reviewer 6 Verification & Adversarial Stress Suite.
Thoroughly tests:
1. Responsive behavior (1440px, 1024px, 768px, 375px, 320px) & zero horizontal scroll
2. Mobile navigation drawer (open, close, backdrop scrim, Escape key, link nav, desktop resize cleanup)
3. Interactive elements (4-item capabilities accordion + live preview card updates, FAQ accordion, booking modal)
4. Console hygiene & asset link integrity
"""

import sys
import os
import time
import unittest
from playwright.sync_api import sync_playwright

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from tests.e2e.test_utils import (
    BASE_URL,
    start_server_if_needed,
    init_browser_context,
    check_horizontal_overflow,
)


class TestReviewer6IndependentAudit(unittest.TestCase):
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

    # -------------------------------------------------------------------------
    # 1. RESPONSIVE BEHAVIOR ACROSS 5 BREAKPOINTS
    # -------------------------------------------------------------------------
    def test_01_responsive_viewports_zero_horizontal_scroll(self):
        """Inspect responsive behavior across 1440px, 1024px, 768px, 375px, and 320px."""
        viewports = [
            ("Desktop", 1440, 900),
            ("Laptop", 1024, 768),
            ("Tablet", 768, 1024),
            ("Mobile", 375, 812),
            ("Compact", 320, 568),
        ]

        for name, width, height in viewports:
            with self.subTest(viewport=name, width=width, height=height):
                self.page.set_viewport_size({"width": width, "height": height})
                self.page.wait_for_timeout(200)

                # Scroll down and check at multiple scroll offsets
                for scroll_y in [0, 400, 1000, 2500]:
                    self.page.evaluate(f"window.scrollTo(0, {scroll_y})")
                    self.page.wait_for_timeout(100)
                    
                    overflow_res = check_horizontal_overflow(self.page)
                    self.assertFalse(
                        overflow_res["hasOverflow"],
                        f"Horizontal overflow detected at {name} ({width}x{height}) scrollY={scroll_y}! "
                        f"scrollWidth={overflow_res['scrollWidth']}, innerWidth={overflow_res['innerWidth']}, "
                        f"offenders={overflow_res['offenders']}"
                    )
                    
                    scroll_x = self.page.evaluate("window.scrollX")
                    self.assertEqual(
                        scroll_x, 0,
                        f"window.scrollX must remain 0 at {name} ({width}px), got {scroll_x}"
                    )

    # -------------------------------------------------------------------------
    # 2. MOBILE NAVIGATION DRAWER
    # -------------------------------------------------------------------------
    def test_02_mobile_drawer_interactions(self):
        """Verify mobile navigation drawer: open, close button, backdrop click, Escape key, link navigation."""
        self.page.set_viewport_size({"width": 375, "height": 812})
        self.page.wait_for_timeout(200)

        toggle_btn = self.page.locator("#nav-toggle")
        close_btn = self.page.locator("#nav-close")
        scrim = self.page.locator("#mobile-drawer-scrim")
        drawer = self.page.locator("#mobile-drawer")

        self.assertTrue(toggle_btn.is_visible(), "#nav-toggle must be visible on mobile")

        # Flow A: Open and close via close button (#nav-close)
        toggle_btn.click()
        self.page.wait_for_timeout(300)
        self.assertTrue(drawer.evaluate("el => el.classList.contains('open')"), "Drawer must have 'open' class")
        self.assertEqual(drawer.get_attribute("aria-hidden"), "false", "aria-hidden must be 'false'")
        self.assertTrue(scrim.evaluate("el => el.classList.contains('open')"), "Scrim must have 'open' class")
        self.assertTrue(self.page.evaluate("() => document.body.classList.contains('nav-drawer-open')"), "Body must have 'nav-drawer-open'")

        close_btn.click()
        self.page.wait_for_timeout(300)
        self.assertFalse(drawer.evaluate("el => el.classList.contains('open')"), "Drawer must close via #nav-close")
        self.assertEqual(drawer.get_attribute("aria-hidden"), "true", "aria-hidden must be 'true'")
        self.assertFalse(self.page.evaluate("() => document.body.classList.contains('nav-drawer-open')"), "Body lock must clear")

        # Flow B: Open and close via backdrop click (scrim)
        toggle_btn.click()
        self.page.wait_for_timeout(300)
        self.assertTrue(drawer.evaluate("el => el.classList.contains('open')"))
        # Click scrim programmatically or via coordinate
        scrim.click(position={"x": 10, "y": 10})
        self.page.wait_for_timeout(300)
        self.assertFalse(drawer.evaluate("el => el.classList.contains('open')"), "Drawer must close via scrim click")
        self.assertFalse(self.page.evaluate("() => document.body.classList.contains('nav-drawer-open')"))

        # Flow C: Open and close via Escape key
        toggle_btn.click()
        self.page.wait_for_timeout(300)
        self.assertTrue(drawer.evaluate("el => el.classList.contains('open')"))
        self.page.keyboard.press("Escape")
        self.page.wait_for_timeout(300)
        self.assertFalse(drawer.evaluate("el => el.classList.contains('open')"), "Drawer must close via Escape key")
        self.assertFalse(self.page.evaluate("() => document.body.classList.contains('nav-drawer-open')"))

        # Flow D: Open and click link navigation
        toggle_btn.click()
        self.page.wait_for_timeout(300)
        link = self.page.locator("#mobile-nav-links a[href='#capabilities']").first
        self.assertTrue(link.is_visible())
        link.click()
        self.page.wait_for_timeout(400)
        self.assertFalse(drawer.evaluate("el => el.classList.contains('open')"), "Drawer must auto-dismiss when link is clicked")
        self.assertFalse(self.page.evaluate("() => document.body.classList.contains('nav-drawer-open')"))

        # Flow E: Resize boundary auto-cleanup (mobile to desktop)
        toggle_btn.click()
        self.page.wait_for_timeout(300)
        self.assertTrue(drawer.evaluate("el => el.classList.contains('open')"))
        self.page.set_viewport_size({"width": 1024, "height": 768})
        self.page.wait_for_timeout(300)
        self.assertFalse(drawer.evaluate("el => el.classList.contains('open')"), "Drawer must close on desktop resize")
        self.assertFalse(self.page.evaluate("() => document.body.classList.contains('nav-drawer-open')"), "Body lock must clear on desktop resize")

    # -------------------------------------------------------------------------
    # 3. INTERACTIVE ELEMENTS: CAPABILITIES ACCORDION & PREVIEW CANVAS
    # -------------------------------------------------------------------------
    def test_03_capabilities_accordion_and_dynamic_preview_card(self):
        """Verify 4-item capabilities accordion and real-time updates to dynamic dark preview card."""
        items = self.page.locator("#capabilities-accordion .capability-item")
        self.assertEqual(items.count(), 4, "Must have exactly 4 capabilities accordion items")

        expected_states = [
            {
                "index": 0,
                "status": "IN CALL • 02:47",
                "caller": "Sarah Jenkins — VP Revenue Operations",
                "intent": "Pricing & Inbound Qualification",
                "action": "Autonomous Execution Active",
            },
            {
                "index": 1,
                "status": "IN CALL • 04:12",
                "caller": "David Vance — Head of Inside Sales",
                "intent": "Positive (+0.84 Delta)",
                "action": "Dynamic Pitch Modulation",
            },
            {
                "index": 2,
                "status": "SYNCED • 00:01",
                "caller": "Elena Rostova — VP Strategic Accounts",
                "intent": "HubSpot Enterprise + Salesforce",
                "action": "Automated Bi-Directional Sync",
            },
            {
                "index": 3,
                "status": "MULTIMODAL ACTIVE",
                "caller": "Marcus Brody — Managing Director",
                "intent": "VIP Brochure & Scheduling Link",
                "action": "Voice + SMS Parallel Handoff",
            },
        ]

        # Verify initial active state (index 0)
        self.assertTrue(items.nth(0).evaluate("el => el.classList.contains('active')"), "Item 0 must be initially active")
        self.assertEqual(items.nth(0).get_attribute("aria-expanded"), "true")

        # Test clicking through all 4 items
        for expected in expected_states:
            idx = expected["index"]
            items.nth(idx).click()
            self.page.wait_for_timeout(250)  # Allow 100ms transition + DOM update

            # Verify accordion item state
            self.assertTrue(items.nth(idx).evaluate("el => el.classList.contains('active')"), f"Item {idx} must be active")
            self.assertEqual(items.nth(idx).get_attribute("aria-expanded"), "true")

            # Check dynamic dark preview card updates
            status = self.page.locator("#preview-status").text_content()
            caller = self.page.locator("#preview-caller").text_content()
            metric1 = self.page.locator("#preview-metric-val-1").text_content()
            action = self.page.locator("#preview-action-tag").text_content()

            self.assertIn(expected["status"], status, f"Preview status mismatch for item {idx}")
            self.assertIn(expected["caller"], caller, f"Preview caller mismatch for item {idx}")
            self.assertIn(expected["intent"], metric1, f"Preview intent metric mismatch for item {idx}")
            self.assertIn(expected["action"], action, f"Preview action tag mismatch for item {idx}")

        # Verify soundwave visualizer animation bars
        wave_bars = self.page.locator(".soundwave-container .soundwave-bar")
        self.assertEqual(wave_bars.count(), 10, "Soundwave container must have 10 animation bars")

    # -------------------------------------------------------------------------
    # 4. INTERACTIVE ELEMENTS: FAQ ACCORDION
    # -------------------------------------------------------------------------
    def test_04_faq_accordion_interactions(self):
        """Verify FAQ accordion expands, rotates icon, collapses on toggle and maintains clean accordion state."""
        faq_items = self.page.locator(".faq-item")
        self.assertEqual(faq_items.count(), 6, "Must have 6 FAQ items")

        # Click FAQ 0 to open
        faq_items.nth(0).locator(".faq-button").click()
        self.page.wait_for_timeout(250)
        self.assertTrue(faq_items.nth(0).evaluate("el => el.classList.contains('open')"), "FAQ 0 must be open")
        
        # Verify icon rotation class or computed style
        icon_rotation = faq_items.nth(0).locator(".faq-icon").evaluate(
            "el => window.getComputedStyle(el).transform"
        )
        self.assertNotEqual(icon_rotation, "none", "FAQ icon must have active rotation transform")

        # Click FAQ 1 -> FAQ 0 should close, FAQ 1 should open
        faq_items.nth(1).locator(".faq-button").click()
        self.page.wait_for_timeout(250)
        self.assertTrue(faq_items.nth(1).evaluate("el => el.classList.contains('open')"), "FAQ 1 must be open")
        self.assertFalse(faq_items.nth(0).evaluate("el => el.classList.contains('open')"), "FAQ 0 must close when FAQ 1 opens")

        # Click FAQ 1 again -> should toggle closed
        faq_items.nth(1).locator(".faq-button").click()
        self.page.wait_for_timeout(250)
        self.assertFalse(faq_items.nth(1).evaluate("el => el.classList.contains('open')"), "FAQ 1 must close when clicked again")

    # -------------------------------------------------------------------------
    # 5. INTERACTIVE ELEMENTS: BOOKING MODAL
    # -------------------------------------------------------------------------
    def test_05_booking_modal_interactions_and_submission(self):
        """Verify booking modal open/close (button, backdrop, Escape) and lead form submission."""
        modal = self.page.locator("#booking-modal")
        form = self.page.locator("#demo-form")

        # Flow A: Open via openBookingModal() and close via close button
        self.page.evaluate("openBookingModal()")
        self.page.wait_for_timeout(250)
        self.assertTrue(modal.evaluate("el => el.classList.contains('open')"), "Modal must be open")
        self.assertEqual(modal.get_attribute("aria-hidden"), "false")
        self.assertTrue(self.page.evaluate("() => document.body.classList.contains('nav-drawer-open')"))

        close_btn = modal.locator("button[aria-label='Close modal']")
        close_btn.click()
        self.page.wait_for_timeout(250)
        self.assertFalse(modal.evaluate("el => el.classList.contains('open')"), "Modal must close via close button")
        self.assertEqual(modal.get_attribute("aria-hidden"), "true")
        self.assertFalse(self.page.evaluate("() => document.body.classList.contains('nav-drawer-open')"))

        # Flow B: Open and close via backdrop click
        self.page.evaluate("openBookingModal()")
        self.page.wait_for_timeout(250)
        # Click outside modal-panel on backdrop
        self.page.evaluate("""() => {
            const modal = document.getElementById('booking-modal');
            modal.click();
        }""")
        self.page.wait_for_timeout(250)
        self.assertFalse(modal.evaluate("el => el.classList.contains('open')"), "Modal must close via backdrop click")

        # Flow C: Open and close via Escape key
        self.page.evaluate("openBookingModal()")
        self.page.wait_for_timeout(250)
        self.page.keyboard.press("Escape")
        self.page.wait_for_timeout(250)
        self.assertFalse(modal.evaluate("el => el.classList.contains('open')"), "Modal must close via Escape key")

        # Flow D: Form submission with validation and API response
        self.page.evaluate("openBookingModal()")
        self.page.wait_for_timeout(250)

        form.locator("input[name='name']").fill("Auditor Reviewer")
        form.locator("input[name='email']").fill("reviewer6@clara.test")
        form.locator("input[name='phone']").fill("+1 555 987 6543")
        form.locator("input[name='company']").fill("Quality Assurance Corp")
        form.locator("select[name='team_size']").select_option("51-200 reps")
        form.locator("textarea[name='message']").fill("Verifying lead capture endpoint.")

        # Submit form
        form.locator("button[type='submit']").click()
        self.page.wait_for_timeout(600)

        status_text = self.page.locator("#form-status").text_content()
        self.assertIn("Demo scheduled!", status_text, f"Expected success message in #form-status, got: '{status_text}'")

    # -------------------------------------------------------------------------
    # 6. CONSOLE HYGIENE & BROKEN ASSET AUDIT
    # -------------------------------------------------------------------------
    def test_06_console_hygiene_and_broken_assets(self):
        """Audit console errors, page exceptions, and verify 100% of referenced local assets return HTTP 200."""
        # 1. Check for unhandled exceptions or console errors
        self.assertEqual(self.auditor.page_errors, [], f"Uncaught page exceptions detected: {self.auditor.page_errors}")
        self.assertEqual(self.auditor.console_errors, [], f"Console errors detected: {self.auditor.console_errors}")

        # 2. Extract all local image, script, stylesheet, and SVG references
        urls = self.page.evaluate("""() => {
            const list = [];
            document.querySelectorAll('img[src], script[src], link[rel="stylesheet"][href], link[rel="icon"][href]').forEach(el => {
                const src = el.getAttribute('src') || el.getAttribute('href');
                if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('data:') && !src.startsWith('#')) {
                    list.push(src);
                }
            });
            // Also add mask divider asset
            list.push('/images/near-star-tile.svg');
            list.push('/images/favicon.png');
            return Array.from(new Set(list));
        }""")

        for asset_url in urls:
            clean_url = asset_url.split('?')[0].split('#')[0].lstrip('/')
            full_req_url = f"{BASE_URL}/{clean_url}"
            res = self.page.request.get(full_req_url)
            self.assertEqual(
                res.status, 200,
                f"Asset '{asset_url}' failed with HTTP {res.status} at {full_req_url}"
            )


if __name__ == "__main__":
    unittest.main()
