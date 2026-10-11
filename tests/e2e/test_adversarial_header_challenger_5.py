"""
Adversarial Empirical Challenge Suite: Sticky Glassmorphic Header
Conducted by challenger_5 (teamwork_preview_challenger).

Mission:
Empirically and adversarially stress-test the sticky glassmorphic header behavior:
1. Pinned positioning across a wide spectrum of scroll offsets:
   [0, 50, 51, 60, 100, 150, 300, 500, 800, 1200, 2000, max_scroll]
2. Strict verification that document.getElementById('site-header').getBoundingClientRect().top
   never deviates from 0 when scrolled.
3. Glassmorphic styling transition and secondary CTA reveal trigger & settling reliability.
4. Continuous high-resolution scroll sampling (0 to 2500px in 25px steps = 100 sample points).
5. Rapid high-speed scrolling, jitter, wheel sweeps, and return-to-top reset.
6. Responsive viewport resize while scrolled (1440, 1024, 1023, 768, 375, 320, 1920px).
7. Desktop nav anchor navigation clicks and brand logo home-return.
8. 50px boundary hysteresis oscillation stress-test.
9. Mobile drawer open/close interaction while page is deeply scrolled.
10. Page error and console audit.
"""

import os
import sys
import time
import unittest
from typing import Dict, Any, List
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


class TestAdversarialStickyHeaderChallenger5(unittest.TestCase):
    """Empirical challenge suite for the sticky glassmorphic header."""

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
        self.page.wait_for_selector("#site-header", state="attached")
        self.page.wait_for_timeout(300)

    def tearDown(self):
        self.context.close()
        self.browser.close()

    def _get_header_metrics(self) -> Dict[str, Any]:
        """Fetch real-time DOM metrics for #site-header and secondary CTA."""
        return self.page.evaluate("""() => {
            const h = document.getElementById('site-header');
            if (!h) return null;
            const rect = h.getBoundingClientRect();
            const cs = window.getComputedStyle(h);
            const cta = h.querySelector('.header-cta-secondary');
            const ctaCS = cta ? window.getComputedStyle(cta) : null;
            return {
                scrollY: window.scrollY,
                rect: {
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                    width: rect.width,
                    height: rect.height,
                    y: rect.y
                },
                classList: Array.from(h.classList),
                isScrolled: h.classList.contains('scrolled'),
                computed: {
                    position: cs.position,
                    top: cs.top,
                    zIndex: cs.zIndex,
                    backgroundColor: cs.backgroundColor,
                    backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter || '',
                    borderBottomColor: cs.borderBottomColor,
                    borderBottomWidth: cs.borderBottomWidth,
                    boxShadow: cs.boxShadow,
                    height: cs.height
                },
                cta: cta ? {
                    display: ctaCS.display,
                    visibility: ctaCS.visibility,
                    opacity: parseFloat(ctaCS.opacity || '0'),
                    pointerEvents: ctaCS.pointerEvents,
                    transform: ctaCS.transform
                } : null
            };
        }""")

    # =========================================================================
    # Test 1: Wide Spectrum of Scroll Offsets & Strict Zero-Top Invariance
    # =========================================================================
    def test_challenge_01_scroll_offsets_spectrum_and_zero_top_invariance(self):
        """
        Verify sticky header positioning and styling across:
        scrollY in [0, 50, 51, 60, 100, 150, 300, 500, 800, 1200, 2000, max_scroll].
        Assert getBoundingClientRect().top is strictly 0 (+/- 0.5px) for every offset.
        """
        max_scroll = self.page.evaluate(
            "() => document.documentElement.scrollHeight - window.innerHeight"
        )
        test_offsets = [0, 50, 51, 60, 100, 150, 300, 500, 800, 1200, 2000, max_scroll]

        print(f"\n[Test 1] Testing scroll spectrum: {test_offsets}")

        for y in test_offsets:
            self.page.evaluate(f"window.scrollTo(0, {y})")
            self.page.evaluate("window.dispatchEvent(new Event('scroll'))")
            self.page.wait_for_timeout(100)

            m = self._get_header_metrics()
            self.assertIsNotNone(m, f"Header metrics must not be null at scrollY={y}")

            actual_scrollY = m["scrollY"]
            top = m["rect"]["top"]
            box_y = m["rect"]["y"]
            height = m["rect"]["height"]
            width = m["rect"]["width"]

            # Strict Top Invariance Check
            self.assertAlmostEqual(
                top, 0.0, delta=0.5,
                msg=f"Header getBoundingClientRect().top deviated from 0 at requested y={y} (actual scrollY={actual_scrollY}): got top={top}"
            )
            self.assertAlmostEqual(
                box_y, 0.0, delta=0.5,
                msg=f"Header getBoundingClientRect().y deviated from 0 at requested y={y}: got y={box_y}"
            )
            self.assertAlmostEqual(
                height, 73.0, delta=2.0,
                msg=f"Header height must remain 73px (+/- 2px) at scrollY={actual_scrollY}: got height={height}"
            )
            self.assertAlmostEqual(
                width, 1440.0, delta=1.0,
                msg=f"Header width must span full viewport width (1440px) at scrollY={actual_scrollY}: got width={width}"
            )

            # State checks based on scroll threshold (scrollY > 50)
            if actual_scrollY <= 50:
                self.assertFalse(
                    m["isScrolled"],
                    f"Header must NOT have .scrolled class at scrollY={actual_scrollY}"
                )
                self.assertIn(
                    m["computed"]["backgroundColor"],
                    ["rgba(0, 0, 0, 0)", "transparent"],
                    f"Header must have transparent background at scrollY={actual_scrollY}, got {m['computed']['backgroundColor']}"
                )
                if m["cta"]:
                    self.assertEqual(
                        m["cta"]["opacity"], 0.0,
                        f"Secondary CTA must have opacity=0 at scrollY={actual_scrollY}, got {m['cta']['opacity']}"
                    )
                    self.assertEqual(
                        m["cta"]["pointerEvents"], "none",
                        f"Secondary CTA pointer-events must be 'none' at scrollY={actual_scrollY}"
                    )
            else:
                self.assertTrue(
                    m["isScrolled"],
                    f"Header MUST have .scrolled class at scrollY={actual_scrollY}"
                )
                bg = m["computed"]["backgroundColor"]
                self.assertTrue(
                    "255, 255, 255" in bg or "rgba(255" in bg,
                    f"Header background must be white rgba at scrollY={actual_scrollY}, got {bg}"
                )
                self.assertTrue(
                    "blur" in m["computed"]["backdropFilter"],
                    f"Header backdropFilter must have blur at scrollY={actual_scrollY}, got {m['computed']['backdropFilter']}"
                )
                if m["cta"]:
                    self.assertEqual(
                        m["cta"]["opacity"], 1.0,
                        f"Secondary CTA must have opacity=1 at scrollY={actual_scrollY}, got {m['cta']['opacity']}"
                    )
                    self.assertEqual(
                        m["cta"]["pointerEvents"], "auto",
                        f"Secondary CTA pointer-events must be 'auto' at scrollY={actual_scrollY}"
                    )

    # =========================================================================
    # Test 2: Continuous High-Resolution rAF Scroll Sampling (100 sample points)
    # =========================================================================
    def test_challenge_02_continuous_scroll_sampling_no_drift(self):
        """
        Step-scroll through 100 points from y=0 to y=2500 in 25px increments.
        Assert getBoundingClientRect().top is 0 at every single intermediate position.
        """
        deviations = []
        for step_y in range(0, 2525, 25):
            self.page.evaluate(f"window.scrollTo(0, {step_y})")
            top = self.page.evaluate(
                "() => document.getElementById('site-header').getBoundingClientRect().top"
            )
            if abs(top) > 0.5:
                deviations.append((step_y, top))

        self.assertEqual(
            len(deviations), 0,
            f"Detected {len(deviations)} getBoundingClientRect().top deviations during continuous 25px stepping: {deviations[:5]}"
        )

    # =========================================================================
    # Test 3: Rapid High-Speed Scrolling, Burst Jitter & Return-to-Top Reset
    # =========================================================================
    def test_challenge_03_rapid_scrolling_burst_and_return_to_top_reset(self):
        """
        Execute burst jumps across erratic scroll offsets in rapid succession.
        Verify that header remains pinned, does not get stuck, and resets cleanly on return to 0.
        """
        erratic_sequence = [0, 1800, 30, 2400, 500, 120, 2100, 45, 900, 0, 1500, 0]

        for target_y in erratic_sequence:
            self.page.evaluate(f"window.scrollTo(0, {target_y})")
            self.page.evaluate("window.dispatchEvent(new Event('scroll'))")
            # Minimal pause to simulate erratic rapid scrolling
            self.page.wait_for_timeout(35)
            top = self.page.evaluate(
                "() => document.getElementById('site-header').getBoundingClientRect().top"
            )
            self.assertAlmostEqual(
                top, 0.0, delta=0.5,
                msg=f"Header top drifted during erratic scroll to {target_y}: got {top}"
            )

        # Allow final settle at y=0
        self.page.evaluate("window.scrollTo(0, 0)")
        self.page.evaluate("window.dispatchEvent(new Event('scroll'))")
        self.page.wait_for_timeout(200)

        settled = self._get_header_metrics()
        self.assertAlmostEqual(
            settled["rect"]["top"], 0.0, delta=0.5,
            msg="Header top must be 0 after returning to top"
        )
        self.assertFalse(
            settled["isScrolled"],
            "Header must remove .scrolled class after returning to scrollY=0"
        )
        self.assertIn(
            settled["computed"]["backgroundColor"],
            ["rgba(0, 0, 0, 0)", "transparent"],
            "Header background must return to transparent at scrollY=0"
        )
        if settled["cta"]:
            self.assertEqual(
                settled["cta"]["opacity"], 0.0,
                "Secondary CTA must return to opacity 0 at scrollY=0"
            )
            self.assertEqual(
                settled["cta"]["pointerEvents"], "none",
                "Secondary CTA pointer-events must return to 'none' at scrollY=0"
            )

    # =========================================================================
    # Test 4: Viewport Resize Events While Page is Deeply Scrolled
    # =========================================================================
    def test_challenge_04_resize_events_while_scrolled(self):
        """
        Scroll page to 800px (glassmorphic active).
        Resize dynamically across 7 device viewport sizes:
        [1440x900, 1024x768, 1023x768, 768x1024, 375x667, 320x568, 1920x1080].
        Assert header top remains 0, header width matches viewport, and zero horizontal overflow.
        """
        # Scroll deep first
        self.page.evaluate("window.scrollTo(0, 800)")
        self.page.evaluate("window.dispatchEvent(new Event('scroll'))")
        self.page.wait_for_timeout(150)

        viewports = [
            (1440, 900),
            (1024, 768),
            (1023, 768),
            (768, 1024),
            (375, 667),
            (320, 568),
            (1920, 1080),
        ]

        for width, height in viewports:
            self.page.set_viewport_size({"width": width, "height": height})
            self.page.wait_for_timeout(100)

            m = self._get_header_metrics()
            self.assertIsNotNone(m, f"Header metrics must be available at {width}x{height}")

            # Top must remain 0
            self.assertAlmostEqual(
                m["rect"]["top"], 0.0, delta=0.5,
                msg=f"Header top drifted to {m['rect']['top']} upon resize to {width}x{height} while scrolled"
            )
            # Width must match viewport width
            self.assertAlmostEqual(
                m["rect"]["width"], float(width), delta=1.5,
                msg=f"Header width {m['rect']['width']} does not match viewport {width}"
            )
            # Scrolled class must persist
            self.assertTrue(
                m["isScrolled"],
                f"Header must retain .scrolled class after resize to {width}x{height}"
            )

            # Horizontal overflow check
            overflow_result = check_horizontal_overflow(self.page)
            self.assertFalse(
                overflow_result["hasOverflow"],
                f"Horizontal overflow detected at {width}x{height} while scrolled! Offenders: {overflow_result['offenders']}"
            )

            # Responsive navigation element checks
            toggle_visible = self.page.is_visible("#nav-toggle")
            desktop_nav_visible = self.page.is_visible("header nav.hidden.lg\\:flex, header nav")
            if width >= 1024:
                self.assertFalse(
                    toggle_visible,
                    f"#nav-toggle must be hidden at desktop breakpoint {width}px"
                )
            else:
                self.assertTrue(
                    toggle_visible,
                    f"#nav-toggle must be visible at mobile/tablet breakpoint {width}px"
                )

    # =========================================================================
    # Test 5: Desktop Nav Anchor Navigation Clicks & Brand Logo Home Return
    # =========================================================================
    def test_challenge_05_anchor_navigation_clicks_and_logo_reset(self):
        """
        Click through all navigation anchors:
        #capabilities, #interactive-demo, #infrastructure, #integrations, #founder, #faq.
        Assert that after each anchor navigation, header remains pinned at top=0.
        Then click brand logo (#hero) and verify viewport returns to top and header resets.
        """
        anchors = [
            ("#capabilities", "Capabilities"),
            ("#interactive-demo", "Live Showcase"),
            ("#infrastructure", "Infrastructure"),
            ("#integrations", "Integrations"),
            ("#founder", "Our Story"),
            ("#faq", "FAQ"),
        ]

        for href, text in anchors:
            # Click anchor in desktop nav
            selector = f"header nav a[href='{href}']"
            self.page.wait_for_selector(selector, state="visible")
            self.page.click(selector)
            # Wait for smooth scroll settling
            self.page.wait_for_timeout(600)

            current_y = self.page.evaluate("window.scrollY")
            top = self.page.evaluate(
                "() => document.getElementById('site-header').getBoundingClientRect().top"
            )
            is_scrolled = self.page.evaluate(
                "() => document.getElementById('site-header').classList.contains('scrolled')"
            )

            self.assertGreater(
                current_y, 50,
                f"Clicking anchor {href} must scroll page past 50px, got scrollY={current_y}"
            )
            self.assertAlmostEqual(
                top, 0.0, delta=0.5,
                msg=f"Header top drifted after navigating to anchor {href}: got {top}"
            )
            self.assertTrue(
                is_scrolled,
                f"Header must have .scrolled class after navigating to anchor {href}"
            )

        # Click brand logo to return home
        self.page.click("header a[href='#hero']")
        self.page.wait_for_timeout(600)

        final_y = self.page.evaluate("window.scrollY")
        final_top = self.page.evaluate(
            "() => document.getElementById('site-header').getBoundingClientRect().top"
        )
        final_is_scrolled = self.page.evaluate(
            "() => document.getElementById('site-header').classList.contains('scrolled')"
        )

        self.assertAlmostEqual(
            final_y, 0, delta=5,
            msg=f"Clicking brand logo must scroll back to top, got scrollY={final_y}"
        )
        self.assertAlmostEqual(
            final_top, 0.0, delta=0.5,
            msg=f"Header top must remain 0 at top of page, got {final_top}"
        )
        self.assertFalse(
            final_is_scrolled,
            "Header must remove .scrolled class when returning to top"
        )

    # =========================================================================
    # Test 6: 50px Boundary Hysteresis & Secondary CTA Settle Reliability
    # =========================================================================
    def test_challenge_06_boundary_hysteresis_and_secondary_cta_settling(self):
        """
        Adversarially oscillate scroll position tightly around the 50px boundary:
        [48, 52, 49, 51, 50, 53, 47, 55, 45, 60, 40].
        Assert that .scrolled class strictly tracks window.scrollY > 50,
        never enters a stuck or corrupted state, and settles reliably.
        """
        oscillation_path = [48, 52, 49, 51, 50, 53, 47, 55, 45, 60, 40]

        for y in oscillation_path:
            self.page.evaluate(f"window.scrollTo(0, {y})")
            self.page.evaluate("window.dispatchEvent(new Event('scroll'))")
            self.page.wait_for_timeout(50)

            actual_y = self.page.evaluate("window.scrollY")
            top = self.page.evaluate(
                "() => document.getElementById('site-header').getBoundingClientRect().top"
            )
            is_scrolled = self.page.evaluate(
                "() => document.getElementById('site-header').classList.contains('scrolled')"
            )

            expected_scrolled = (actual_y > 50)
            self.assertAlmostEqual(
                top, 0.0, delta=0.5,
                msg=f"Header top drifted during boundary oscillation at y={y}: got {top}"
            )
            self.assertEqual(
                is_scrolled, expected_scrolled,
                f"Boundary state mismatch at scrollY={actual_y}: expected scrolled={expected_scrolled}, got {is_scrolled}"
            )

        # Settle at y=150 and test secondary CTA interaction
        self.page.evaluate("window.scrollTo(0, 150)")
        self.page.evaluate("window.dispatchEvent(new Event('scroll'))")
        self.page.wait_for_timeout(300)

        cta_metrics = self.page.evaluate("""() => {
            const btn = document.querySelector('.header-cta-secondary');
            if (!btn) return null;
            const cs = window.getComputedStyle(btn);
            return {
                opacity: parseFloat(cs.opacity || '0'),
                pointerEvents: cs.pointerEvents,
                visible: btn.offsetWidth > 0 && btn.offsetHeight > 0
            };
        }""")
        self.assertIsNotNone(cta_metrics, "Secondary CTA button must exist in header")
        self.assertEqual(cta_metrics["opacity"], 1.0, "Secondary CTA opacity must settle at 1.0")
        self.assertEqual(cta_metrics["pointerEvents"], "auto", "Secondary CTA pointerEvents must settle at 'auto'")
        self.assertTrue(cta_metrics["visible"], "Secondary CTA must be visually rendered")

        # Click the secondary CTA and verify booking modal triggers without displacing header
        self.page.click(".header-cta-secondary")
        self.page.wait_for_timeout(300)

        modal_open = self.page.evaluate("""() => {
            const modal = document.getElementById('booking-modal') || document.querySelector('[data-modal]');
            if (!modal) return false;
            const cs = window.getComputedStyle(modal);
            return !modal.classList.contains('hidden') && cs.display !== 'none';
        }""")
        # If modal opened, verify header top remains 0
        header_top_with_modal = self.page.evaluate(
            "() => document.getElementById('site-header').getBoundingClientRect().top"
        )
        self.assertAlmostEqual(
            header_top_with_modal, 0.0, delta=0.5,
            msg=f"Header top shifted while modal open: got {header_top_with_modal}"
        )

        # Close modal if open
        self.page.keyboard.press("Escape")
        self.page.wait_for_timeout(200)

    # =========================================================================
    # Test 7: Mobile Drawer Open/Close Interaction While Page is Deeply Scrolled
    # =========================================================================
    def test_challenge_07_mobile_drawer_while_scrolled(self):
        """
        At mobile viewport (375x667), scroll to 600px.
        Open mobile drawer, verify header top remains 0 and drawer overlays cleanly.
        Close drawer via scrim, verify scroll lock releases and header top remains 0.
        """
        self.page.set_viewport_size({"width": 375, "height": 667})
        self.page.evaluate("window.scrollTo(0, 600)")
        self.page.evaluate("window.dispatchEvent(new Event('scroll'))")
        self.page.wait_for_timeout(150)

        # Header pinned at mobile
        mobile_m = self._get_header_metrics()
        self.assertAlmostEqual(
            mobile_m["rect"]["top"], 0.0, delta=0.5,
            msg=f"Header top drifted at mobile 375px: got {mobile_m['rect']['top']}"
        )
        self.assertTrue(
            mobile_m["isScrolled"],
            "Header must have .scrolled class at mobile scrollY=600"
        )

        # Open drawer
        self.page.click("#nav-toggle")
        self.page.wait_for_timeout(300)

        drawer_state = self.page.evaluate("""() => {
            const drawer = document.getElementById('mobile-drawer');
            const scrim = document.getElementById('mobile-drawer-scrim');
            const bodyHasClass = document.body.classList.contains('nav-drawer-open');
            return {
                drawerOpen: drawer && drawer.classList.contains('open'),
                scrimOpen: scrim && scrim.classList.contains('open'),
                bodyLocked: bodyHasClass
            };
        }""")
        self.assertTrue(drawer_state["drawerOpen"], "Mobile drawer must be open")
        self.assertTrue(drawer_state["scrimOpen"], "Mobile drawer scrim must be open")
        self.assertTrue(drawer_state["bodyLocked"], "Body must have nav-drawer-open class")

        # Header top while drawer open
        top_during_drawer = self.page.evaluate(
            "() => document.getElementById('site-header').getBoundingClientRect().top"
        )
        self.assertAlmostEqual(
            top_during_drawer, 0.0, delta=0.5,
            msg=f"Header top shifted while mobile drawer open: got {top_during_drawer}"
        )

        # Close drawer by clicking scrim
        self.page.click("#mobile-drawer-scrim", position={"x": 10, "y": 10}, force=True)
        self.page.wait_for_timeout(300)

        closed_state = self.page.evaluate("""() => {
            const drawer = document.getElementById('mobile-drawer');
            const bodyHasClass = document.body.classList.contains('nav-drawer-open');
            return {
                drawerClosed: drawer && !drawer.classList.contains('open'),
                bodyUnlocked: !bodyHasClass
            };
        }""")
        self.assertTrue(closed_state["drawerClosed"], "Mobile drawer must close on scrim click")
        self.assertTrue(closed_state["bodyUnlocked"], "Body scroll lock must release")

        # Final header check
        final_top = self.page.evaluate(
            "() => document.getElementById('site-header').getBoundingClientRect().top"
        )
        self.assertAlmostEqual(
            final_top, 0.0, delta=0.5,
            msg=f"Header top shifted after drawer closed: got {final_top}"
        )

    # =========================================================================
    # Test 8: Console Error and Unhandled Exception Audit
    # =========================================================================
    def test_challenge_08_console_and_page_error_audit(self):
        """
        Verify that no unhandled page errors, syntax exceptions, or critical console errors occurred.
        """
        self.assertEqual(
            len(self.auditor.page_errors), 0,
            f"Page errors occurred during header challenge: {self.auditor.page_errors}"
        )
        self.assertEqual(
            len(self.auditor.console_errors), 0,
            f"Console errors occurred during header challenge: {self.auditor.console_errors}"
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
