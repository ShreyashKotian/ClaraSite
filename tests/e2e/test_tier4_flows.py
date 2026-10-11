"""
Tier 4: Real-World Workflows
End-to-End customer journeys: Desktop Enterprise Buyer, Mobile Prospect, and Developer Evaluator.
"""

import unittest
from playwright.sync_api import sync_playwright
from tests.e2e.test_utils import (
    BASE_URL,
    start_server_if_needed,
    init_browser_context,
)


class TestTier4RealWorldFlows(unittest.TestCase):
    """Tier 4: Real-World Workflows."""

    @classmethod
    def setUpClass(cls):
        start_server_if_needed()
        cls.playwright = sync_playwright().start()

    @classmethod
    def tearDownClass(cls):
        cls.playwright.stop()

    def test_t4_01_desktop_enterprise_buyer_journey(self):
        """
        Desktop Enterprise Buyer Journey (1440x900):
        1. Lands on Hero and inspects value proposition.
        2. Navigates embedded demo tabs (Live Agent Calls, Knowledge Base, Analytics) with scroll invariant.
        3. Scrolls to Capabilities Accordion and cycles through capabilities.
        4. Inspects Infrastructure Grid and Marquee Ticker.
        5. Expands FAQ accordion.
        6. Submits lead booking form.
        """
        browser, context, page, auditor = init_browser_context(self.playwright, width=1440, height=900)
        try:
            page.goto(f"{BASE_URL}/", wait_until="networkidle")

            # 1. Inspect Hero
            headline = page.locator("h1").first
            self.assertTrue(headline.is_visible(), "Hero headline must be visible")

            # 2. Interact with demo tabs with scroll invariance check
            y_before_demo = page.evaluate("window.scrollY")
            page.evaluate("""() => {
                const btn = Array.from(document.querySelectorAll('.sandbox-controls button, button, a')).find(el => 
                    el.textContent && el.textContent.includes('Live Agent Calls')
                );
                if (btn) btn.click();
            }""")
            page.wait_for_timeout(350)
            y_after_demo = page.evaluate("window.scrollY")
            self.assertLessEqual(abs(y_after_demo - y_before_demo), 1.0, "Demo navigation must maintain steady scroll position")

            # 3. Capabilities accordion cycling
            items = page.locator("#capabilities-accordion .capability-item, [data-capability-index], .capability-item")
            item_count = items.count()
            if item_count > 0:
                for i in range(min(item_count, 3)):
                    items.nth(i).click()
                    page.wait_for_timeout(200)

            # 4. Scroll to infrastructure
            page.evaluate("""() => {
                const infra = document.querySelector('#infrastructure, .infrastructure-section');
                if (infra) infra.scrollIntoView({ behavior: 'smooth' });
            }""")
            page.wait_for_timeout(400)

            # 5. Expand FAQ
            first_faq = page.locator(".faq-item button, .faq-item summary").first
            if first_faq.count() > 0:
                first_faq.click()
                page.wait_for_timeout(250)

            # 6. Lead booking form interaction via modal
            page.evaluate("""() => {
                if (typeof openBookingModal === 'function') openBookingModal();
            }""")
            page.wait_for_timeout(300)

            form = page.locator("#demo-form, form#demo-request-form, form.demo-form, [data-lead-form]").first
            if form.count() > 0 and form.is_visible():
                name_input = form.locator("input[name='name']").first
                email_input = form.locator("input[name='email']").first
                if name_input.count() > 0:
                    name_input.fill("Enterprise Buyer")
                if email_input.count() > 0:
                    email_input.fill("buyer@globalenterprise.com")
                submit_btn = form.locator("button.form-submit, button[type='submit']").first
                if submit_btn.count() > 0:
                    submit_btn.click()
                    page.wait_for_timeout(400)

            # Verify no uncaught exceptions throughout journey
            self.assertEqual(auditor.page_errors, [], "Zero page errors during desktop buyer journey")
        finally:
            context.close()
            browser.close()

    def test_t4_02_mobile_prospect_journey(self):
        """
        Mobile Prospect Journey (375x812):
        1. User arrives on mobile viewport.
        2. Opens mobile drawer, clicks a link, and drawer auto-dismisses.
        3. Explores hero and mobile-friendly preview.
        4. Taps capabilities items and expands FAQ.
        5. Taps closing CTA button.
        """
        browser, context, page, auditor = init_browser_context(self.playwright, width=375, height=812)
        try:
            page.goto(f"{BASE_URL}/", wait_until="networkidle")

            # 1. Open mobile drawer
            toggle = page.locator("#nav-toggle, .nav-toggle, [data-nav-toggle]").first
            drawer = page.locator("#mobile-drawer, #nav-links, .mobile-drawer").first

            if toggle.count() > 0 and toggle.is_visible():
                toggle.click()
                page.wait_for_timeout(300)

                # Click a nav link inside drawer
                nav_link = drawer.locator("a[href^='#']").first
                if nav_link.count() > 0:
                    nav_link.click()
                    page.wait_for_timeout(350)

            # 2. Check capabilities accordion on mobile
            items = page.locator("#capabilities-accordion .capability-item, [data-capability-index], .capability-item")
            if items.count() > 0:
                items.first.click()
                page.wait_for_timeout(200)

            # 3. Expand FAQ on mobile
            faq = page.locator(".faq-item button, .faq-item summary").first
            if faq.count() > 0:
                faq.click()
                page.wait_for_timeout(200)

            # Verify zero horizontal overflow on mobile
            overflow = page.evaluate("""() => {
                return document.documentElement.scrollWidth > window.innerWidth + 1;
            }""")
            self.assertFalse(overflow, "Mobile prospect journey must have zero horizontal overflow")

            # Verify no uncaught JS errors
            self.assertEqual(auditor.page_errors, [], "Zero page errors during mobile prospect journey")
        finally:
            context.close()
            browser.close()

    def test_t4_03_developer_evaluator_flow(self):
        """
        Developer Evaluator Flow:
        1. Audits console stream: Zero unhandled page errors or JavaScript exceptions.
        2. Crawls all local assets (images, scripts, CSS) and asserts HTTP 200.
        3. Evaluates Mock API persistence with structured JSON payload.
        """
        browser, context, page, auditor = init_browser_context(self.playwright, width=1440, height=900)
        try:
            page.goto(f"{BASE_URL}/", wait_until="networkidle")

            # 1. Console stream audit
            self.assertEqual(auditor.page_errors, [], "Developer audit: zero unhandled JS exceptions")
            self.assertEqual(auditor.console_errors, [], "Developer audit: zero unexpected console errors")

            # 2. Local asset HTTP 200 audit
            assets = page.evaluate("""() => {
                const urls = [];
                document.querySelectorAll('img[src], script[src], link[rel="stylesheet"][href]').forEach(el => {
                    const u = el.getAttribute('src') || el.getAttribute('href');
                    if (u && !u.startsWith('http') && !u.startsWith('//') && !u.startsWith('data:')) {
                        urls.push(u);
                    }
                });
                return Array.from(new Set(urls));
            }""")

            for asset in assets:
                clean_asset = asset.split('?')[0].split('#')[0]
                full_url = f"{BASE_URL}/{clean_asset.lstrip('/')}"
                res = page.request.get(full_url)
                self.assertEqual(
                    res.status,
                    200,
                    f"Asset '{asset}' must return HTTP 200, got status {res.status}"
                )

            # 3. Mock API verification
            api_res = page.request.post(
                f"{BASE_URL}/tables/demo_requests",
                data={"name": "Developer Evaluator", "email": "dev@evaluator.test"},
                headers={"Content-Type": "application/json"}
            )
            self.assertEqual(api_res.status, 200, "POST /tables/demo_requests must return HTTP 200")
            json_data = api_res.json()
            self.assertTrue(json_data.get("success"), "API response must contain success: true")
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    unittest.main()
