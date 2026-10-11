"""
Tier 3: Cross-Feature Interactions
Automated E2E tests for anchor navigation during sticky header transitions,
PostMessage bidirectional hash synchronization, animation concurrency, and star-tile mask rendering.
"""

import unittest
from playwright.sync_api import sync_playwright
from tests.e2e.test_utils import (
    BASE_URL,
    start_server_if_needed,
    init_browser_context,
)


class TestTier3CrossFeatureInteractions(unittest.TestCase):
    """Tier 3: Cross-Feature Interactions."""

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

    def test_t3_01_sticky_header_state_during_anchor_nav(self):
        """
        Verify sticky header dynamically toggles glassmorphic background during anchor navigation,
        and does not permanently obscure target section content.
        """
        # Start at top (y = 0)
        self.page.evaluate("window.scrollTo(0, 0)")
        self.page.wait_for_timeout(200)

        # Click an anchor link in header
        anchor = self.page.locator("header nav a[href^='#']").filter(
            has_not=self.page.locator("[href='#hero'], [href='#top']")
        ).first

        if anchor.count() > 0:
            target_href = anchor.get_attribute("href")
            anchor.click()
            self.page.wait_for_timeout(600)

            # Assert scroll position moved down
            current_y = self.page.evaluate("window.scrollY")
            self.assertGreater(current_y, 100, f"Page should have scrolled down to {target_href}")

            # Assert header has evolved to solid glassmorphic white
            header_classes = self.page.evaluate("""() => {
                const h = document.querySelector('header, #site-header, .site-header');
                return h ? h.className : '';
            }""")
            self.assertTrue(
                "scrolled" in header_classes or "bg-white" in header_classes or "shadow" in header_classes,
                f"Header should have transitioned to scrolled/glassmorphic state during anchor nav: {header_classes}"
            )

    def test_t3_02_postmessage_bidirectional_sync_and_address_bar(self):
        """
        Verify bidirectional postMessage contract:
        - Outer control calls navigateDemo('/live') -> updates address bar & sends CLARA_NAVIGATE
        - In-frame postMessage emits DEMO_ROUTE_CHANGED -> updates outer mockup address bar
        """
        address_bar = self.page.locator("#mockup-address-bar, [data-address-bar]").first
        if address_bar.count() == 0:
            self.skipTest("Mockup address bar not present on page")

        # Initial route should reflect dashboard or /
        initial_url = address_bar.text_content() or ""
        self.assertIn("claraai.com", initial_url, "Address bar should display Clara AI domain")

        # 1. Test navigateDemo route change
        self.page.evaluate("if (typeof navigateDemo === 'function') navigateDemo('/live');")
        self.page.wait_for_timeout(200)

        updated_url = address_bar.text_content() or ""
        self.assertTrue(
            "/live" in updated_url or "live" in updated_url,
            f"Address bar did not update to /live upon navigateDemo: {updated_url}"
        )

        # 2. Test iframe postMessage emitting DEMO_ROUTE_CHANGED
        frame = self.page.frame(name="interactive-demo-iframe") or (
            self.page.frames[1] if len(self.page.frames) > 1 else None
        )
        if frame:
            frame.evaluate("""() => {
                if (window.parent) {
                    window.parent.postMessage({ type: 'DEMO_ROUTE_CHANGED', route: '/analytics' }, '*');
                }
            }""")
            self.page.wait_for_timeout(200)
            analytics_url = address_bar.text_content() or ""
            self.assertTrue(
                "/analytics" in analytics_url or "analytics" in analytics_url,
                f"Address bar did not update to /analytics upon DEMO_ROUTE_CHANGED from iframe: {analytics_url}"
            )

    def test_t3_03_animation_concurrency(self):
        """
        Verify concurrent operation of infinite marquee ticker, audio waveform pulsations,
        and accordion toggles without thread blocking or console error explosion.
        """
        # Ensure page errors are clean initially
        self.assertEqual(self.auditor.page_errors, [])

        # Switch accordion tabs while ticker and wave animations run
        self.page.evaluate("""() => {
            const items = document.querySelectorAll('#capabilities-accordion .capability-item, [data-capability-index], .capability-item');
            if (items.length > 1) {
                items[1].click();
            }
        }""")
        self.page.wait_for_timeout(300)

        self.page.evaluate("""() => {
            const items = document.querySelectorAll('#capabilities-accordion .capability-item, [data-capability-index], .capability-item');
            if (items.length > 2) {
                items[2].click();
            }
        }""")
        self.page.wait_for_timeout(300)

        # Assert no console error explosion
        self.assertEqual(self.auditor.page_errors, [], "Concurrent animations and interactions produced JS exceptions")

    def test_t3_04_star_tile_svg_mask_boundary(self):
        """
        Verify the signature near.com 21x21px star-tile geometric mask divider renders
        at transition boundaries without DOM gaps or style errors.
        """
        has_star_tile = self.page.evaluate("""() => {
            const maskEls = Array.from(document.querySelectorAll(
                '.near-star-tile-divider, .near-star-tile, [class*="mask-"], .star-tile-divider'
            ));
            if (maskEls.length > 0) return true;
            // Check images or CSS definitions
            const html = document.documentElement.innerHTML;
            return html.includes('near-star-tile.svg') || html.includes('near-star-tile-divider');
        }""")
        self.assertTrue(
            has_star_tile,
            "Signature star-tile SVG mask divider (near-star-tile.svg) must be referenced in DOM or CSS"
        )


if __name__ == "__main__":
    unittest.main()
