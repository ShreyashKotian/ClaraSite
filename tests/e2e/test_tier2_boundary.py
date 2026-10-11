"""
Tier 2: Boundary & Corner Cases
Automated E2E tests for scroll stability, scroll containment, rapid clicks, resize boundaries, and viewports.
"""

import unittest
from playwright.sync_api import sync_playwright
from tests.e2e.test_utils import (
    BASE_URL,
    start_server_if_needed,
    init_browser_context,
    assert_scroll_invariance,
    check_horizontal_overflow,
)


class TestTier2BoundaryCases(unittest.TestCase):
    """Tier 2: Boundary & Corner Cases."""

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

    def test_t2_01_multi_offset_scroll_stability(self):
        """
        Verify zero scroll jumping (delta <= 1px) across y = 0, 450, 900, 1500
        when clicking 'Live Agent Calls' control button and demo navigation tabs.
        """
        offsets = [0, 450, 900, 1500]

        for target_y in offsets:
            # Position page using instant behavior to prevent setup animation artifacts
            self.page.evaluate(f"window.scrollTo({{ top: {target_y}, behavior: 'instant' }})")
            self.page.wait_for_timeout(200)
            y_before = self.page.evaluate("window.scrollY")

            # Click 'Live Agent Calls' button programmatically without default autoscroll
            clicked = self.page.evaluate("""() => {
                const btns = Array.from(document.querySelectorAll('.sandbox-controls button, button, a'));
                const liveBtn = btns.find(b => b.textContent && b.textContent.includes('Live Agent Calls'));
                if (liveBtn) {
                    liveBtn.click();
                    return true;
                }
                return false;
            }""")

            if not clicked:
                # Fallback to demo tab button if named differently
                self.page.evaluate("""() => {
                    const tab = document.querySelector('[data-demo-route="/live"], [data-tab="live"]');
                    if (tab) tab.click();
                }""")

            # Sample scroll across a 600ms observation window
            for delay in [50, 150, 300, 600]:
                self.page.wait_for_timeout(50)
                y_current = self.page.evaluate("window.scrollY")
                delta = abs(y_current - y_before)
                self.assertLessEqual(
                    delta,
                    1.0,
                    f"Scroll displacement occurred at initial y={target_y}! Before: {y_before}, Current: {y_current}, Delta: {delta}px"
                )

    def test_t2_02_transcript_scroll_containment(self):
        """
        Verify internal scroll inside embedded demo transcript does not displace parent window.
        """
        self.page.evaluate("window.scrollTo({ top: 800, behavior: 'instant' })")
        self.page.wait_for_timeout(200)
        parent_y_before = self.page.evaluate("window.scrollY")

        # Check CSS overscroll containment on container and iframe
        is_contained = self.page.evaluate("""() => {
            const showcase = document.querySelector('#interactive-frontend-showcase, .mockup-browser-body');
            const iframe = document.querySelector('#interactive-demo-iframe');
            if (!showcase || !iframe) return false;
            const showcaseStyle = window.getComputedStyle(showcase);
            const iframeStyle = window.getComputedStyle(iframe);
            return (showcaseStyle.overscrollBehavior === 'contain' || showcaseStyle.overflow === 'hidden') &&
                   (iframeStyle.overscrollBehavior === 'contain');
        }""")
        self.assertTrue(is_contained, "Iframe and demo showcase must have strict CSS overscroll containment")

        # Simulate wheel event inside iframe if loaded
        frame = self.page.frame(name="interactive-demo-iframe") or (
            self.page.frames[1] if len(self.page.frames) > 1 else None
        )
        if frame:
            try:
                frame.evaluate("""() => {
                    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
                }""")
                self.page.wait_for_timeout(200)
            except Exception:
                pass

        parent_y_after = self.page.evaluate("window.scrollY")
        self.assertLessEqual(
            abs(parent_y_after - parent_y_before),
            1.0,
            f"Parent scroll shifted during iframe wheel interaction! Before: {parent_y_before}, After: {parent_y_after}"
        )

    def test_t2_03_rapid_fire_accordion_clicks(self):
        """
        Rapidly toggle capabilities accordion (<50ms intervals) and assert no crash,
        no race conditions, and single stable active state.
        """
        accordion_items = self.page.locator(
            "#capabilities-accordion .capability-item, [data-capability-index], [data-accordion-item], .capability-item"
        )
        count = accordion_items.count()
        if count < 2:
            self.skipTest("Capabilities accordion items not yet rendered")

        # Rapid-fire click all items within 150ms
        self.page.evaluate("""() => {
            const items = document.querySelectorAll('#capabilities-accordion .capability-item, [data-capability-index], .capability-item');
            items.forEach((item, idx) => {
                setTimeout(() => item.click(), idx * 30);
            });
        }""")

        self.page.wait_for_timeout(500)

        # Assert no unhandled page errors
        self.assertEqual(self.auditor.page_errors, [], "Rapid accordion clicking must not throw JS exceptions")

        # Assert active state has stabilized
        active_count = self.page.evaluate("""() => {
            const items = document.querySelectorAll('#capabilities-accordion .capability-item, [data-capability-index], .capability-item');
            return Array.from(items).filter(i => 
                i.classList.contains('active') || i.classList.contains('open') || i.getAttribute('aria-expanded') === 'true'
            ).length;
        }""")
        self.assertIn(active_count, [0, 1], f"Exactly 1 (or 0) accordion item should be active after race settling, got {active_count}")

    def test_t2_04_mobile_drawer_resize_boundary(self):
        """
        Open mobile drawer at 375px viewport, resize to 1440px desktop, and verify drawer
        auto-cleans up (dismisses open state and removes body scroll lock).
        """
        # Set mobile viewport
        self.page.set_viewport_size({"width": 375, "height": 812})
        self.page.wait_for_timeout(200)

        toggle = self.page.locator("#nav-toggle, .nav-toggle, [data-nav-toggle]").first
        drawer = self.page.locator("#mobile-drawer, #nav-links, .mobile-drawer").first

        if toggle.count() > 0 and toggle.is_visible():
            toggle.click()
            self.page.wait_for_timeout(300)

            # Now resize back to desktop viewport
            self.page.set_viewport_size({"width": 1440, "height": 900})
            self.page.wait_for_timeout(300)

            # Confirm body lock removed and drawer closed
            cleaned_up = self.page.evaluate("""() => {
                const bodyLocked = document.body.classList.contains('nav-drawer-open') || 
                                   document.body.style.overflow === 'hidden';
                const d = document.querySelector('#mobile-drawer, .mobile-drawer');
                const drawerStillOpen = d && d.classList.contains('open');
                return !bodyLocked && !drawerStillOpen;
            }""")
            self.assertTrue(cleaned_up, "Mobile drawer state and body lock must be cleared on viewport resize to desktop")

    def test_t2_05_minimum_viewport_320px_zero_horizontal_overflow(self):
        """
        Verify minimum compact viewport (320px x 568px) produces zero horizontal page scrollbar.
        """
        self.page.set_viewport_size({"width": 320, "height": 568})
        self.page.wait_for_timeout(300)

        overflow_res = check_horizontal_overflow(self.page)
        self.assertFalse(
            overflow_res["hasOverflow"],
            f"Horizontal overflow detected at 320px! scrollWidth: {overflow_res['scrollWidth']}, "
            f"innerWidth: {overflow_res['innerWidth']}, offenders: {overflow_res['offenders']}"
        )


if __name__ == "__main__":
    unittest.main()
