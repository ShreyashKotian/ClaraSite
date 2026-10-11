#!/usr/bin/env python3
"""
Central E2E & Contract Test Runner for Clara AI (Near.com Architecture).
Usage:
    python3 tests/e2e/runner.py                  # Runs all E2E test tiers (1-4)
    python3 tests/e2e/runner.py --tier 1         # Run only Tier 1
    python3 tests/e2e/runner.py --tier 2         # Run only Tier 2
    python3 tests/e2e/runner.py --tier 3         # Run only Tier 3
    python3 tests/e2e/runner.py --tier 4         # Run only Tier 4
    python3 tests/e2e/runner.py --contract       # Include Node.js contract tests
"""

import sys
import os
import argparse
import unittest
import time
import subprocess

# Ensure repo root and tests directory are in Python path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from tests.e2e.test_utils import start_server_if_needed, stop_server, BASE_URL
from tests.e2e.test_tier1_features import TestTier1Features
from tests.e2e.test_tier2_boundary import TestTier2BoundaryCases
from tests.e2e.test_tier3_cross import TestTier3CrossFeatureInteractions
from tests.e2e.test_tier4_flows import TestTier4RealWorldFlows


def run_contract_tests() -> int:
    """Run Node.js native contract tests using node --test."""
    print("\n" + "=" * 70)
    print("▶ RUNNING NODE.JS CONTRACT TESTS (node:test)")
    print("=" * 70)
    cmd = ["node", "--test", "tests/contract/*.test.js"]
    try:
        proc = subprocess.run(cmd, cwd=REPO_ROOT, text=True)
        return proc.returncode
    except Exception as e:
        print(f"Error running contract tests: {e}")
        return 1


def main():
    parser = argparse.ArgumentParser(description="Clara AI E2E Test Runner")
    parser.add_argument(
        "--tier",
        type=str,
        default="all",
        choices=["1", "2", "3", "4", "all"],
        help="Specific tier to run (1, 2, 3, 4, or all)",
    )
    parser.add_argument(
        "--contract",
        action="store_true",
        help="Run Node.js contract tests before Playwright E2E suite",
    )
    parser.add_argument(
        "--filter",
        type=str,
        default=None,
        help="Pattern to filter test names",
    )
    args = parser.parse_args()

    start_time = time.time()
    print("=" * 70)
    print("  CLARA AI E2E TEST SUITE — NEAR.COM ARCHITECTURAL VERIFICATION")
    print(f"  Target URL: {BASE_URL}")
    print(f"  Tier Filter: {args.tier.upper()}")
    print("=" * 70)

    contract_status = 0
    if args.contract:
        contract_status = run_contract_tests()
        if contract_status != 0:
            print("\n❌ Contract tests failed.")

    # 1. Start server if needed
    print("\n[Harness] Initializing server lifecycle...")
    start_server_if_needed()
    print(f"[Harness] Server ready and verified at {BASE_URL}")

    # 2. Build test suite
    suite = unittest.TestSuite()
    tier_map = {
        "1": [TestTier1Features],
        "2": [TestTier2BoundaryCases],
        "3": [TestTier3CrossFeatureInteractions],
        "4": [TestTier4RealWorldFlows],
    }

    test_classes = []
    if args.tier == "all":
        test_classes = [
            TestTier1Features,
            TestTier2BoundaryCases,
            TestTier3CrossFeatureInteractions,
            TestTier4RealWorldFlows,
        ]
    else:
        test_classes = tier_map.get(args.tier, [])

    loader = unittest.TestLoader()
    for tc in test_classes:
        tests = loader.loadTestsFromTestCase(tc)
        if args.filter:
            filtered = unittest.TestSuite()
            for test in tests:
                if args.filter.lower() in test.id().lower():
                    filtered.addTest(test)
            suite.addTest(filtered)
        else:
            suite.addTest(tests)

    total_tests = suite.countTestCases()
    print(f"[Harness] Discovered {total_tests} test cases across requested tiers.\n")

    # 3. Execute suite
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    duration = time.time() - start_time

    # 4. Print summary
    print("\n" + "=" * 70)
    print("  TEST RUN SUMMARY")
    print("=" * 70)
    print(f"  Total tests executed: {result.testsRun}")
    print(f"  Passes:               {result.testsRun - len(result.failures) - len(result.errors) - len(result.skipped)}")
    print(f"  Failures:             {len(result.failures)}")
    print(f"  Errors:               {len(result.errors)}")
    print(f"  Skipped:              {len(result.skipped)}")
    print(f"  Total duration:       {duration:.2f}s")
    print("=" * 70)

    # 5. Teardown
    stop_server()

    success = result.wasSuccessful() and (contract_status == 0)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
