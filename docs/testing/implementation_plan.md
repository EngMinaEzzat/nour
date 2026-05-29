# Comprehensive Testing Strategy Plan

The goal is to fully verify the application, identify any gaps, and cover missing test cases using our comprehensive suite of `@[skills/testing]`. 

## Addressed Questions & Decisions

- **Test Database:** We will use the existing, configured Supabase database URL since the app is not yet in production. To bypass the backend's safety check that expects a dedicated test database name, we will set `NOUR_TEST_DATABASE_OK=true` when running the tests.
- **Frontend & E2E Tooling:** We will proceed with setting up Vitest for frontend unit/component tests and Playwright for E2E testing from scratch.
- **CI/CD Integration:** Postponed for now. We will focus purely on local/manual test execution.

---

## Proposed Changes and Testing Phases

Our testing strategy will leverage our specialized testing agents to identify and close the gaps across the stack.

### Phase 1: Environment and Backend Validation (API Tester)

Currently, the `artifacts/api-server/src/test` directory contains a robust suite of over 30 test files, but they were blocked from running due to safety checks.

*   **Setup:** Use the existing `.env` configuration (Supabase URL). Configure the test runner to use `NOUR_TEST_DATABASE_OK=true` to allow testing against the shared development database.
*   **Execution:** Run the backend test suite using `pnpm test`.
*   **Analysis:** Use the **Test Results Analyzer** to review the Vitest output. Identify any endpoints that lack coverage or fail due to recent changes.
*   **Gaps to fill:**
    *   Validate rate limiting and API security.
    *   Verify edge cases in the Cash on Delivery (COD) checkout flow.
    *   Test third-party integrations (e.g., AI providers, Paymob, WhatsApp) using mock servers.

### Phase 2: Frontend Unit and Component Testing (Workflow Optimizer)

The frontend `artifacts/fashion-store` is completely untested.

*   **Setup:** Configure Vitest and React Testing Library in `artifacts/fashion-store`.
*   **Execution:** Write critical path component tests.
*   **Gaps to fill:**
    *   Component testing for complex UI parts (cart, product variants).
    *   Unit testing for hooks and API integration layer (`api-client-react`).

### Phase 3: Accessibility Auditing (Accessibility Auditor)

The application has not been formally audited for WCAG 2.2 AA compliance.

*   **Setup:** Integrate `axe-core` into the test suite.
*   **Execution:** Run automated accessibility scans on all major routes (Homepage, Product Page, Cart, Checkout, Admin Dashboard).
*   **Manual Testing:** The agent will review keyboard navigation, focus management, and screen reader compatibility for custom components (like modals and carousels).
*   **Gaps to fill:**
    *   Missing ARIA labels on dynamic elements.
    *   Color contrast checks for the brand theme.

### Phase 4: End-to-End Reality Check (Reality Checker & Evidence Collector)

We need overwhelming evidence that the full user journey works across the stack.

*   **Setup:** Install and configure Playwright in the project root or a new `e2e` workspace.
*   **Execution:** Automate the following critical user journeys:
    *   *Merchant Journey:* Log in, create a product using AI, configure shipping rules.
    *   *Customer Journey:* Browse store, add to cart, fill out the Egyptian shipping form, and complete a COD order.
*   **Evidence:** The **Evidence Collector** will capture screenshots and videos of these flows, ensuring cross-device compatibility (desktop, tablet, mobile).
*   **Reality Check:** The **Reality Checker** will certify whether the UX matches the expected "premium" feel and reject any "fantasy approvals".

### Phase 5: Performance Benchmarking (Performance Benchmarker)

*   **Execution:** Run Lighthouse and custom performance scripts against the running Vite build.
*   **Gaps to fill:**
    *   Ensure storefront First Contentful Paint (FCP) and Largest Contentful Paint (LCP) are under acceptable thresholds.
    *   Validate API latency (P95 < 200ms) under simulated load.

---

## Verification Plan

We will know the app is fully verified when:
1. The backend API test suite passes with a green status using the development database.
2. The **Accessibility Auditor** generates a report with zero critical/serious WCAG violations.
3. The **Reality Checker** generates a final report containing visual screenshot evidence of successful end-to-end user journeys without regressions.
4. All test reports are compiled by the **Evidence Collector** into the `artifacts/` folder for your review.
