"""
Empirical Challenge Harness by challenger_6.
Adversarial stress-testing of demo scroll invariance, burst clicking,
and container feed containment on Clara AI landing page.
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
)


class TestChallenger6Empirical(unittest.TestCase):
    """Rigorous empirical validation of scroll invariance and container containment."""

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
        self.page.wait_for_selector("#interactive-demo-iframe", state="attached")
        self.page.wait_for_timeout(400)

    def tearDown(self):
        self.context.close()
        self.browser.close()

    def _get_demo_frame(self):
        return self.page.frame(name="interactive-demo-iframe") or (
            self.page.frames[1] if len(self.page.frames) > 1 else None
        )

    def test_challenger6_01_scroll_invariance_exact_offsets(self):
        """
        Requirement 1:
        Verify clicking 'Live Agent Calls' and switching all demo tabs never displaces
        outer window scrollY (delta === 0) across exact offsets: 0, 300, 600, 1000, 1500px.
        """
        offsets = [0, 300, 600, 1000, 1500]
        outer_tabs = ["Live Agent Calls", "Dashboard", "Knowledge Base", "Analytics", "Live Agent Calls"]
        inner_tabs = ["Live Calls", "Knowledge Base", "Analytics", "Dashboard"]

        frame = self._get_demo_frame()
        self.assertIsNotNone(frame, "Demo iframe must be available")
        frame.wait_for_selector("nav", timeout=5000)

        for target_y in offsets:
            # Clear previous lock state and position page
            self.page.evaluate("() => { if (typeof releaseScrollLock === 'function') releaseScrollLock(); }")
            self.page.evaluate(f"window.scrollTo({{ top: {target_y}, behavior: 'instant' }})")
            self.page.wait_for_timeout(150)
            setup_y = self.page.evaluate("window.scrollY")
            self.assertEqual(setup_y, target_y, f"Setup scrollY failed for target {target_y}")

            # 1. Outer controls tab switching
            for tab_label in outer_tabs:
                y_before = self.page.evaluate("window.scrollY")
                clicked = self.page.evaluate(f"""() => {{
                    const btns = Array.from(document.querySelectorAll('.sandbox-controls button'));
                    const btn = btns.find(b => b.textContent.trim().toLowerCase().includes('{tab_label.lower()}'));
                    if (btn) {{
                        btn.click();
                        return true;
                    }}
                    return false;
                }}""")
                self.assertTrue(clicked, f"Outer tab button '{tab_label}' not found")

                # Sample over 500ms observation window
                for wait_ms in [50, 150, 300, 500]:
                    self.page.wait_for_timeout(50)
                    y_current = self.page.evaluate("window.scrollY")
                    delta = abs(y_current - y_before)
                    self.assertEqual(
                        delta, 0.0,
                        f"[FAILED] Outer tab '{tab_label}' displaced scrollY at offset {target_y}px! "
                        f"Before: {y_before}, Current: {y_current}, Delta: {delta}px"
                    )

            # 2. Inner demo nav tab switching inside iframe
            for inner_tab in inner_tabs:
                y_before_inner = self.page.evaluate("window.scrollY")
                inner_clicked = frame.evaluate(f"""() => {{
                    const links = Array.from(document.querySelectorAll('nav a'));
                    const link = links.find(l => l.textContent.trim().toLowerCase().includes('{inner_tab.lower()}'));
                    if (link) {{
                        link.click();
                        return true;
                    }}
                    return false;
                }}""")
                self.assertTrue(inner_clicked, f"Inner nav link '{inner_tab}' not found in demo iframe")

                for wait_ms in [50, 150, 300, 500]:
                    self.page.wait_for_timeout(50)
                    y_current_inner = self.page.evaluate("window.scrollY")
                    delta_inner = abs(y_current_inner - y_before_inner)
                    self.assertEqual(
                        delta_inner, 0.0,
                        f"[FAILED] Inner nav '{inner_tab}' displaced scrollY at offset {target_y}px! "
                        f"Before: {y_before_inner}, Current: {y_current_inner}, Delta: {delta_inner}px"
                    )

            # Ensure lock duration settles before next offset
            self.page.wait_for_timeout(350)

    def test_challenger6_02_rapid_burst_clicking_stress(self):
        """
        Requirement 2:
        Stress test with rapid burst clicking (<50ms intervals: 15ms, 25ms, 40ms)
        on demo navigation buttons.
        """
        test_intervals = [15, 25, 40]
        test_y_positions = [0, 529, 1000, 1500]

        for interval in test_intervals:
            for target_y in test_y_positions:
                self.page.evaluate("() => { if (typeof releaseScrollLock === 'function') releaseScrollLock(); }")
                self.page.evaluate(f"window.scrollTo({{ top: {target_y}, behavior: 'instant' }})")
                self.page.wait_for_timeout(100)
                y_before = self.page.evaluate("window.scrollY")

                # Dispatch 80 rapid clicks at the specified interval
                self.page.evaluate(f"""() => {{
                    const btns = Array.from(document.querySelectorAll('.sandbox-controls button'));
                    if (btns.length === 0) return;
                    for (let i = 0; i < 80; i++) {{
                        setTimeout(() => {{
                            const btn = btns[i % btns.length];
                            btn.click();
                        }}, i * {interval});
                    }}
                }}""")

                # Sample repeatedly during the burst
                burst_duration_sec = (80 * interval) / 1000.0
                sample_count = int(burst_duration_sec * 5) + 3
                for _ in range(sample_count):
                    self.page.wait_for_timeout(100)
                    y_sampled = self.page.evaluate("window.scrollY")
                    delta = abs(y_sampled - y_before)
                    self.assertEqual(
                        delta, 0.0,
                        f"[FAILED] Scroll displaced during rapid burst! Interval: {interval}ms, "
                        f"Target y: {target_y}px, Sampled: {y_sampled}, Delta: {delta}px"
                    )

                self.page.wait_for_timeout(400)
                y_after = self.page.evaluate("window.scrollY")
                self.assertEqual(
                    y_after, y_before,
                    f"[FAILED] Final scroll position shifted after burst (interval={interval}ms, target_y={target_y})! "
                    f"Expected: {y_before}, Got: {y_after}"
                )

                # Ensure no console errors occurred during the rapid fire
                self.assertEqual(
                    self.auditor.page_errors, [],
                    f"[FAILED] Uncaught exceptions during rapid burst (interval={interval}ms): {self.auditor.page_errors}"
                )

    def test_challenger6_03_overscroll_containment_and_wheel_bubbling(self):
        """
        Requirement 3:
        Test wheel scrolling inside demo transcript containers to verify
        'overscroll-behavior: contain' prevents parent scroll bubbling.
        """
        # Ensure demo is on /live page with transcript feed
        self.page.evaluate("""() => {
            if (typeof navigateDemo === 'function') navigateDemo('/live');
        }""")
        self.page.wait_for_timeout(500)

        frame = self._get_demo_frame()
        self.assertIsNotNone(frame, "Demo iframe must be available")
        frame.wait_for_selector('[class*="transcriptFeed"], [class*="rightRail"], nav', timeout=5000)

        # 1. Verify CSS overscroll-behavior: contain computed properties
        styles = frame.evaluate("""() => {
            const feed = document.querySelector('[class*="transcriptFeed"]');
            const rail = document.querySelector('[class*="rightRail"]');
            const workspace = document.querySelector('[class*="workspace"]');
            const root = document.documentElement;
            const body = document.body;
            return {
                feed: feed ? window.getComputedStyle(feed).overscrollBehavior : null,
                rail: rail ? window.getComputedStyle(rail).overscrollBehavior : null,
                workspace: workspace ? window.getComputedStyle(workspace).overscrollBehavior : null,
                root: window.getComputedStyle(root).overscrollBehavior,
                body: window.getComputedStyle(body).overscrollBehavior,
            };
        }""")

        self.assertEqual(styles["feed"], "contain", "Transcript feed must have overscroll-behavior: contain")
        self.assertEqual(styles["rail"], "contain", "Right rail must have overscroll-behavior: contain")
        self.assertEqual(styles["root"], "contain", "Iframe root element must have overscroll-behavior: contain")
        self.assertEqual(styles["body"], "contain", "Iframe body must have overscroll-behavior: contain")

        # Outer showcase container check
        outer_overscroll = self.page.evaluate("""() => {
            const showcase = document.getElementById('interactive-frontend-showcase');
            const iframe = document.getElementById('interactive-demo-iframe');
            return {
                showcase: showcase ? window.getComputedStyle(showcase).overscrollBehavior : null,
                iframe: iframe ? window.getComputedStyle(iframe).overscrollBehavior : null
            };
        }""")
        self.assertEqual(outer_overscroll["showcase"], "contain", "Outer showcase container must have overscroll-behavior: contain")
        self.assertEqual(outer_overscroll["iframe"], "contain", "Iframe element must have overscroll-behavior: contain")

        # 2. Wheel event stress testing across multiple parent scroll positions
        for parent_y in [0, 300, 600, 1000, 1500]:
            self.page.evaluate("() => { if (typeof releaseScrollLock === 'function') releaseScrollLock(); }")
            self.page.evaluate(f"window.scrollTo({{ top: {parent_y}, behavior: 'instant' }})")
            self.page.wait_for_timeout(100)
            initial_parent_y = self.page.evaluate("window.scrollY")
            self.assertEqual(initial_parent_y, parent_y)

            # Test A: Downward wheel burst into transcriptFeed (+2000 delta)
            frame.evaluate("""() => {
                const feed = document.querySelector('[class*="transcriptFeed"]') || document.body;
                for (let i = 0; i < 30; i++) {
                    feed.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true }));
                }
            }""")
            self.page.wait_for_timeout(200)
            y_after_down = self.page.evaluate("window.scrollY")
            self.assertEqual(
                y_after_down, parent_y,
                f"[FAILED] Downward wheel bubbling displaced parent window from {parent_y} to {y_after_down}!"
            )

            # Test B: Upward wheel burst into transcriptFeed at boundary (-2000 delta)
            frame.evaluate("""() => {
                const feed = document.querySelector('[class*="transcriptFeed"]') || document.body;
                feed.scrollTop = 0; // ensure at top boundary
                for (let i = 0; i < 30; i++) {
                    feed.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, bubbles: true, cancelable: true }));
                }
            }""")
            self.page.wait_for_timeout(200)
            y_after_up = self.page.evaluate("window.scrollY")
            self.assertEqual(
                y_after_up, parent_y,
                f"[FAILED] Upward wheel bubbling at top boundary displaced parent window from {parent_y} to {y_after_up}!"
            )

            # Test C: Downward wheel burst into transcriptFeed at bottom boundary
            frame.evaluate("""() => {
                const feed = document.querySelector('[class*="transcriptFeed"]') || document.body;
                feed.scrollTop = feed.scrollHeight; // ensure at bottom boundary
                for (let i = 0; i < 30; i++) {
                    feed.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, bubbles: true, cancelable: true }));
                }
            }""")
            self.page.wait_for_timeout(200)
            y_after_bottom = self.page.evaluate("window.scrollY")
            self.assertEqual(
                y_after_bottom, parent_y,
                f"[FAILED] Downward wheel bubbling at bottom boundary displaced parent window from {parent_y} to {y_after_bottom}!"
            )

            # Test D: Right rail boundary wheel stress
            frame.evaluate("""() => {
                const rail = document.querySelector('[class*="rightRail"]') || document.body;
                rail.scrollTop = rail.scrollHeight;
                for (let i = 0; i < 30; i++) {
                    rail.dispatchEvent(new WheelEvent('wheel', { deltaY: 400, bubbles: true, cancelable: true }));
                }
                rail.scrollTop = 0;
                for (let i = 0; i < 30; i++) {
                    rail.dispatchEvent(new WheelEvent('wheel', { deltaY: -400, bubbles: true, cancelable: true }));
                }
            }""")
            self.page.wait_for_timeout(200)
            y_after_rail = self.page.evaluate("window.scrollY")
            self.assertEqual(
                y_after_rail, parent_y,
                f"[FAILED] Right rail boundary wheel bubbling displaced parent window from {parent_y} to {y_after_rail}!"
            )

    def test_challenger6_04_user_scroll_freedom_during_lock(self):
        """
        Verify deliberate user scroll gestures immediately invoke releaseScrollLock()
        and are never trapped or fought by the scroll-lock rAF loop.
        """
        for trigger_event in ["wheel", "touchmove", "pointerdown", "keydown"]:
            # Scroll to 1000px
            self.page.evaluate("window.scrollTo({ top: 1000, behavior: 'instant' })")
            self.page.wait_for_timeout(100)

            # Engage scroll lock by navigating demo
            self.page.evaluate("""() => {
                if (typeof navigateDemo === 'function') navigateDemo('/analytics');
            }""")

            # Simulate deliberate user scroll gesture at 20ms
            if trigger_event == "wheel":
                self.page.evaluate("""() => {
                    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 150 }));
                    window.scrollTo({ top: 1300, behavior: 'instant' });
                }""")
            elif trigger_event == "pointerdown":
                self.page.evaluate("""() => {
                    window.dispatchEvent(new PointerEvent('pointerdown'));
                    window.scrollTo({ top: 1300, behavior: 'instant' });
                }""")
            elif trigger_event == "touchmove":
                self.page.evaluate("""() => {
                    window.dispatchEvent(new TouchEvent('touchmove'));
                    window.scrollTo({ top: 1300, behavior: 'instant' });
                }""")
            elif trigger_event == "keydown":
                self.page.evaluate("""() => {
                    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown' }));
                    window.scrollTo({ top: 1300, behavior: 'instant' });
                }""")

            # Wait 400ms (longer than the 300ms lock duration)
            self.page.wait_for_timeout(400)
            final_y = self.page.evaluate("window.scrollY")
            self.assertEqual(
                final_y, 1300,
                f"[FAILED] User scroll gesture ({trigger_event}) was trapped or fought! Expected: 1300, Got: {final_y}"
            )


if __name__ == "__main__":
    unittest.main()
