"""
Shared Test Utilities & Lifecycle Management for Clara AI E2E Test Suite.
"""

import os
import sys
import time
import socket
import urllib.request
import urllib.error
import subprocess
import atexit
from typing import Optional, List, Dict, Any, Callable
from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext

BASE_URL = os.environ.get("CLARA_BASE_URL", "http://127.0.0.1:3000")
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))

_server_process: Optional[subprocess.Popen] = None
_server_started_by_tests = False


def is_port_in_use(port: int = 3000, host: str = "127.0.0.1") -> bool:
    """Check if port is already bound."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def wait_for_http(url: str, timeout: float = 8.0) -> bool:
    """Poll URL until it responds with HTTP 200 or timeout expires."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "E2E-HealthCheck"})
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.status == 200:
                    return True
        except (urllib.error.URLError, ConnectionResetError, socket.timeout):
            pass
        time.sleep(0.2)
    return False


def start_server_if_needed() -> None:
    """Ensure the Clara AI Express server is running on port 3000."""
    global _server_process, _server_started_by_tests

    # Check if already responsive
    if wait_for_http(f"{BASE_URL}/", timeout=0.8):
        return

    # Check if port is open but not yet responding to HTTP
    if is_port_in_use(3000):
        if wait_for_http(f"{BASE_URL}/", timeout=4.0):
            return

    # Boot server.js from repository root
    server_path = os.path.join(REPO_ROOT, "server.js")
    if not os.path.isfile(server_path):
        raise FileNotFoundError(f"server.js not found at {server_path}")

    import shutil
    node_bin = shutil.which("node") or ("/usr/local/bin/node" if os.path.exists("/usr/local/bin/node") else "node")
    _server_process = subprocess.Popen(
        [node_bin, "server.js"],
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    _server_started_by_tests = True

    if not wait_for_http(f"{BASE_URL}/", timeout=8.0):
        # Dump stderr if server failed to start
        err = ""
        if _server_process and _server_process.stderr:
            try:
                err = _server_process.stderr.read()
            except Exception:
                pass
        stop_server()
        raise RuntimeError(f"Failed to start server on {BASE_URL}: {err}")


def stop_server() -> None:
    """Terminate the server process if it was started by tests."""
    global _server_process, _server_started_by_tests
    if _server_started_by_tests and _server_process:
        try:
            _server_process.terminate()
            _server_process.wait(timeout=3.0)
        except Exception:
            try:
                _server_process.kill()
            except Exception:
                pass
        _server_process = None
        _server_started_by_tests = False


atexit.register(stop_server)


class PageAuditContext:
    """Captures and filters console errors and page errors."""

    def __init__(self, page: Page):
        self.page = page
        self.console_errors: List[str] = []
        self.page_errors: List[str] = []
        self._attach()

    def _attach(self):
        self.page.on("pageerror", lambda err: self.page_errors.append(str(err)))
        self.page.on("console", self._handle_console)

    def _handle_console(self, msg):
        if msg.type == "error":
            text = msg.text
            # Filter known third-party warnings (e.g. Google Calendar CSP report-only and storage access)
            if "calendar.google.com" in text or "requestStorageAccess" in text:
                return
            self.console_errors.append(text)


def init_browser_context(playwright_instance, width: int = 1440, height: int = 900):
    """Launch headless Chromium with specified viewport and return browser, context, page, and auditor."""
    browser = playwright_instance.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-setuid-sandbox"]
    )
    context = browser.new_context(
        viewport={"width": width, "height": height},
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    )
    page = context.new_page()
    auditor = PageAuditContext(page)
    return browser, context, page, auditor


def assert_scroll_invariance(page: Page, trigger_fn: Callable[[], None], tolerance_px: float = 1.0, wait_ms: int = 400):
    """
    Evaluates window.scrollY before trigger, executes trigger, samples scroll over wait_ms,
    and asserts displacement does not exceed tolerance_px.
    """
    initial_y = page.evaluate("window.scrollY")
    trigger_fn()
    
    # Sample scroll multiple times during the settling window
    intervals = [50, 100, 200, wait_ms]
    for delay in intervals:
        page.wait_for_timeout(50)
        current_y = page.evaluate("window.scrollY")
        delta = abs(current_y - initial_y)
        assert delta <= tolerance_px, (
            f"Scroll shift detected! Before: {initial_y}px, At +{delay}ms: {current_y}px, "
            f"Delta: {delta}px (exceeds {tolerance_px}px threshold)"
        )


def check_horizontal_overflow(page: Page) -> Dict[str, Any]:
    """Inspects the page DOM for horizontal overflow beyond window.innerWidth."""
    return page.evaluate("""() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const innerWidth = window.innerWidth;
        const overflowing = [];

        document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.right > innerWidth + 1.5 || rect.left < -1.5) {
                overflowing.push({
                    tag: el.tagName,
                    id: el.id,
                    className: el.className ? String(el.className).slice(0, 50) : '',
                    right: Math.round(rect.right),
                    left: Math.round(rect.left),
                    width: Math.round(rect.width)
                });
            }
        });

        return {
            hasOverflow: scrollWidth > innerWidth + 1 || bodyScrollWidth > innerWidth + 1,
            scrollWidth: Math.max(scrollWidth, bodyScrollWidth),
            innerWidth: innerWidth,
            offenders: overflowing.slice(0, 5)
        };
    }""")
