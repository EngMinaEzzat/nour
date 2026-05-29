# Detailed Plan: Phase 1 (Backend API Validation)

We have 51 existing backend test suites in `artifacts/api-server/src/test`. Our goal is to run them against the configured Supabase database, fix all failures, and fill in any coverage gaps using the **API Tester** and **Test Results Analyzer** skills.

## User Review Required

> [!NOTE]
> Review this detailed breakdown of Phase 1. Once approved, I will begin executing these steps sequentially.

---

### Step 1: Baseline Execution & Environment Setup
To bypass the safety locks preventing tests from running against the main database:
1. Navigate to `artifacts/api-server`.
2. Execute the test suite with the override flag: 
   ```powershell
   $env:NOUR_TEST_DATABASE_OK="true"; pnpm run test
   ```
3. Pipe the output to a temporary log file (`test-baseline.log`) so we can analyze the exact failure points without losing the output.

### Step 2: Test Results Analysis & Triage
Using the **Test Results Analyzer** methodology:
1. Parse the baseline log to categorize failures into:
   - **Environment/Config Errors:** Missing env vars (e.g., Stripe keys, AI provider keys).
   - **Data Dependency Errors:** Tests assuming a clean database or specific seed data.
   - **Actual Bugs:** Endpoints throwing 500s or logic errors.
2. Formulate a prioritized hit-list of files to fix.

### Step 3: Fixing Existing Tests
Go through the failing test suites and fix them:
1. **Mocking Third-Parties:** Ensure integrations like Paymob, Resend (email), and AI providers are properly mocked in the test environment so they don't fail due to network or credential issues.
2. **Database State Management:** Ensure tests properly clean up after themselves (teardown) since they are running on a shared development database.

### Step 4: Gap Analysis & Test Augmentation (API Tester)
Once the existing tests pass, we will augment the suite based on the **API Tester** agent's strict criteria:
1. **Security Validation:** 
   - Verify that `rate-limiters.test.ts` properly enforces abuse protection.
   - Ensure `auth.test.ts` aggressively tests missing/invalid session tokens across critical routes.
2. **Performance Validation:**
   - Add SLA assertions (e.g., expecting `< 200ms` response times) to high-traffic read endpoints like product fetching.
3. **Core Merchant Workflows:**
   - Deep-dive into `smoke-cod-flow.test.ts` and `orders.test.ts` to ensure edge cases (e.g., negative stock, invalid governorates) are thoroughly tested.

### Step 5: Final Certification
1. Run the entire suite one last time to ensure a **100% Pass Rate**.
2. Generate a `test-results-report.md` artifact detailing what was fixed, the new test coverage added, and the overall backend health.
