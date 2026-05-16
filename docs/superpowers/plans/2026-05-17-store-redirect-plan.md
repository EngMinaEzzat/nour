# Store Creation Redirect Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the post-registration redirection behavior to skip the onboarding setup wizard and drop the user directly into the Store Builder.

**Architecture:** Modify the `handleSubmit` function in the `register.tsx` page to navigate to `/store-builder` instead of `/setup`.

**Tech Stack:** React, wouter, TypeScript

---

### Task 1: Update Registration Redirect

**Files:**
- Modify: `artifacts/fashion-store/src/pages/register.tsx`

- [ ] **Step 1: Write the updated implementation**

In `artifacts/fashion-store/src/pages/register.tsx`, locate the `handleSubmit` function (around line 89) and change the `navigate("/setup");` line to `navigate("/store-builder");`:

```tsx
      await register({
        storeName: form.storeName,
        slug: form.slug || form.storeName.toLowerCase().replace(/\s+/g, "-"),
        email: form.email,
        password: form.password,
        city: form.city || undefined,
        description: form.description,
      });
      navigate("/store-builder");
```

- [ ] **Step 2: Run typecheck to verify it passes**

Run: `cd artifacts/fashion-store && pnpm tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add artifacts/fashion-store/src/pages/register.tsx
git commit -m "feat: redirect to store-builder after registration"
```
