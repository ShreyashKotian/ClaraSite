"""
Adversarial Stress Verification Suite for Clara AI.
Conducted by challenger_4 to stress-test scroll invariance, burst clicking,
overscroll containment, and scroll chaining prevention.
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


class TestAdversarialStressSuite(unittest.TestCase):
    """Adversarial stress-testing of demo scroll stability and overscroll isolation."""

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
        # Ensure demo iframe is loaded
        self.page.wait_for_selector("#interactive-demo-iframe", state="attached")
        self.page.wait_for_timeout(500)

    def tearDown(self):
        self.context.close()
        self.browser.close()

    def _get_demo_frame(self):
        return self.page.frame(name="interactive-demo-iframe") or (
            self.page.frames[1] if len(self.page.frames) > 1 else None
        )

    def test_stress_01_rapid_burst_clicking_outer_controls(self):
        """
        Stress-test: 60 rapid burst clicks alternating across outer demo buttons
        with 15ms interval. Assert window.scrollY delta remains strictly 0.
        """
        offsets = [0, 529, 1000, 1800]
        for target_y in offsets:
            self.page.evaluate(f"window.scrollTo({{ top: {target_y}, behavior: 'instant' }})")
            self.page.wait_for_timeout(100)
            initial_y = self.page.evaluate("window.scrollY")

            # Fire 60 rapid clicks in 900ms
            self.page.evaluate("""() => {
                const buttons = Array.from(document.querySelectorAll('.sandbox-controls button'));
                if (buttons.length === 0) return;
                for (let i = 0; i < 60; i++) {
                    setTimeout(() => {
                        const btn = buttons[i % buttons.length];
                        btn.click();
                    }, i * 15);
                }
            }""")

            # Sample continuously during the burst
            for _ in range(12):
                self.page.wait_for_timeout(100)
                current_y = self.page.evaluate("window.scrollY")
                delta = abs(current_y - initial_y)
                self.assertEqual(
                    delta, 0.0,
                    f"Scroll displacement during outer burst at initial y={target_y}! "
                    f"Current: {current_y}, Delta: {delta}px"
                )

            self.page.wait_for_timeout(300)
            final_y = self.page.evaluate("window.scrollY")
            self.assertEqual(
                final_y, initial_y,
                f"Final scrollY altered after outer burst at target {target_y}: got {final_y}"
            )

    def test_stress_02_rapid_burst_clicking_inner_controls(self):
        """
        Stress-test: 40 rapid burst clicks directly on inner iframe nav items.
        Assert window.scrollY delta remains strictly 0.
        """
        frame = self._get_demo_frame()
        self.assertIsNotNone(frame, "Demo iframe must be available")

        # Wait for inner nav to render
        frame.wait_for_selector("nav", timeout=5000)

        for target_y in [0, 600, 1200]:
            self.page.evaluate(f"window.scrollTo({{ top: {target_y}, behavior: 'instant' }})")
            self.page.wait_for_timeout(100)
            initial_y = self.page.evaluate("window.scrollY")

            frame.evaluate("""() => {
                const links = Array.from(document.querySelectorAll('nav a'));
                if (links.length === 0) return;
                for (let i = 0; i < 40; i++) {
                    setTimeout(() => {
                        const link = links[i % links.length];
                        link.click();
                    }, i * 20);
                }
            }""")

            for _ in range(10):
                self.page.wait_for_timeout(100)
                current_y = self.page.evaluate("window.scrollY")
                delta = abs(current_y - initial_y)
                self.assertEqual(
                    delta, 0.0,
                    f"Scroll displacement during inner burst at initial y={target_y}! Delta: {delta}px"
                )

            final_y = self.page.evaluate("window.scrollY")
            self.assertEqual(final_y, initial_y)

    def test_stress_03_interleaved_outer_and_inner_burst(self):
        """
        Stress-test: Alternating rapid clicks between outer buttons and inner nav links.
        Assert window.scrollY delta remains strictly 0.
        """
        frame = self._get_demo_frame()
        self.assertIsNotNone(frame)
        frame.wait_for_selector("nav", timeout=5000)

        self.page.evaluate("window.scrollTo({ top: 850, behavior: 'instant' })")
        self.page.wait_for_timeout(100)
        initial_y = self.page.evaluate("window.scrollY")

        for round_idx in range(15):
            # Click outer
            self.page.evaluate(f"""() => {{
                const btns = Array.from(document.querySelectorAll('.sandbox-controls button'));
                if (btns.length) btns[{round_idx} % btns.length].click();
            }}""")
            # Click inner immediately
            frame.evaluate(f"""() => {{
                const links = Array.from(document.querySelectorAll('nav a'));
                if (links.length) links[{round_idx} % links.length].click();
            }}""")
            self.page.wait_for_timeout(30)
            current_y = self.page.evaluate("window.scrollY")
            self.assertEqual(current_y, initial_y, f"Displacement at interleaved round {round_idx}")

        self.page.wait_for_timeout(400)
        final_y = self.page.evaluate("window.scrollY")
        self.assertEqual(final_y, initial_y)

    def test_stress_04_overscroll_containment_and_wheel_isolation(self):
        """
        Stress-test: Verify CSS overscroll-behavior: contain on all internal containers,
        and dispatch extreme wheel deltas (+5000px and -5000px) directly onto
        .transcriptFeed and .rightRail to verify zero scroll bubbling to parent.
        """
        # Navigate demo to /live to reveal transcript and right rail
        self.page.evaluate("""() => {
            if (typeof navigateDemo === 'function') navigateDemo('/live');
        }""")
        self.page.wait_for_timeout(500)

        frame = self._get_demo_frame()
        self.assertIsNotNone(frame)

        # 1. Verify CSS rules
        overscroll_status = frame.evaluate("""() => {
            const feed = document.querySelector('[class*="transcriptFeed"]');
            const rail = document.querySelector('[class*="rightRail"]');
            const page = document.querySelector('[class*="page"]');
            return {
                feed: feed ? window.getComputedStyle(feed).overscrollBehavior : null,
                rail: rail ? window.getComputedStyle(rail).overscrollBehavior : null,
                page: page ? window.getComputedStyle(page).overscrollBehavior : null,
                html: window.getComputedStyle(document.documentElement).overscrollBehavior,
                body: window.getComputedStyle(document.body).overscrollBehavior
            };
        }""")

        self.assertEqual(overscroll_status["feed"], "contain", "Transcript feed must have overscroll-behavior: contain")
        self.assertEqual(overscroll_status["rail"], "contain", "Right rail must have overscroll-behavior: contain")
        self.assertEqual(overscroll_status["page"], "contain", "Demo page must have overscroll-behavior: contain")
        self.assertEqual(overscroll_status["html"], "contain", "Demo html must have overscroll-behavior: contain")
        self.assertEqual(overscroll_status["body"], "contain", "Demo body must have overscroll-behavior: contain")

        # 2. Wheel Bubbling Stress at scrollY = 1200
        self.page.evaluate("window.scrollTo({ top: 1200, behavior: 'instant' })")
        self.page.wait_for_timeout(150)
        parent_y_before = self.page.evaluate("window.scrollY")

        # Massive downward wheel barrage on transcript feed
        frame.evaluate("""() => {
            const feed = document.querySelector('[class*="transcriptFeed"]');
            if (feed) {
                for (let i = 0; i < 20; i++) {
                    feed.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, bubbles: true, cancelable: true }));
                }
            }
        }""")
        self.page.wait_for_timeout(200)
        parent_y_after = self.page.evaluate("window.scrollY")
        self.assertEqual(parent_y_after, parent_y_before, "Massive downward wheel on transcript feed leaked to parent!")

        # Massive upward wheel barrage (hitting top boundary)
        frame.evaluate("""() => {
            const feed = document.querySelector('[class*="transcriptFeed"]');
            if (feed) {
                for (let i = 0; i < 20; i++) {
                    feed.dispatchEvent(new WheelEvent('wheel', { deltaY: -500, bubbles: true, cancelable: true }));
                }
            }
        }""")
        self.page.wait_for_timeout(200)
        parent_y_after_up = self.page.evaluate("window.scrollY")
        self.assertEqual(parent_y_after_up, parent_y_before, "Massive upward wheel on transcript feed leaked to parent!")

        # Massive downward wheel barrage on right rail
        frame.evaluate("""() => {
            const rail = document.querySelector('[class*="rightRail"]');
            if (rail) {
                for (let i = 0; i < 20; i++) {
                    rail.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, bubbles: true, cancelable: true }));
                }
            }
        }""")
        self.page.wait_for_timeout(200)
        parent_y_rail = self.page.evaluate("window.scrollY")
        self.assertEqual(parent_y_rail, parent_y_before, "Massive downward wheel on right rail leaked to parent!")

    def test_stress_05_scroll_into_view_and_focus_containment(self):
        """
        Stress-test: scrollIntoView and programmatic focus calls within demo
        must not cause ancestor or parent window displacement.
        """
        self.page.evaluate("window.scrollTo({ top: 700, behavior: 'instant' })")
        self.page.wait_for_timeout(100)
        base_y = self.page.evaluate("window.scrollY")

        frame = self._get_demo_frame()
        self.assertIsNotNone(frame)

        # Call scrollIntoView with various alignment parameters
        frame.evaluate("""() => {
            const elements = document.querySelectorAll('*');
            elements.forEach(el => {
                if (el.scrollIntoView) {
                    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }
            });
        }""")
        self.page.wait_for_timeout(250)
        y_after_siv = self.page.evaluate("window.scrollY")
        self.assertEqual(y_after_siv, base_y, "scrollIntoView shifted parent window scroll!")

        # Programmatic focus stress on every focusable element inside iframe
        frame.evaluate("""() => {
            const focusables = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
            focusables.forEach(f => f.focus());
        }""")
        self.page.wait_for_timeout(250)
        y_after_focus = self.page.evaluate("window.scrollY")
        self.assertEqual(y_after_focus, base_y, "Focus traversal inside demo shifted parent window scroll!")

    def test_stress_06_sticky_header_scroll_pinning_invariance(self):
        """
        Stress-test: Confirm worker_2's sticky header fix is rock-solid.
        Header bounding box y must remain 0 (+/- 1) across deep and rapid scroll offsets.
        """
        header = self.page.locator("#site-header")
        self.assertTrue(header.count() > 0)

        test_offsets = [0, 50, 51, 100, 200, 350, 529, 800, 1200, 1800, 2500, 3200]
        for y in test_offsets:
            self.page.evaluate(f"window.scrollTo({{ top: {y}, behavior: 'instant' }})")
            self.page.evaluate("window.dispatchEvent(new Event('scroll'))")
            self.page.wait_for_timeout(50)

            top = self.page.evaluate("() => document.getElementById('site-header').getBoundingClientRect().top")
            box = header.bounding_box()
            self.assertIsNotNone(box)

            # At y=0 header is at top: 0. At y > 50 header must stay pinned at top: 0.
            self.assertAlmostEqual(
                top, 0.0, delta=1.0,
                msg=f"Sticky header getBoundingClientRect().top detached at scrollY={y}: got {top}"
            )
            self.assertAlmostEqual(
                box["y"], 0.0, delta=1.0,
                msg=f"Sticky header bounding_box()['y'] detached at scrollY={y}: got {box['y']}"
            )


if __name__ == "__main__":
    unittest.main()
