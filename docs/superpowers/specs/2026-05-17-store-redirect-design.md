# Store Creation Redirect Flow

## Overview
Change the post-registration redirection behavior to skip the onboarding setup wizard and drop the user directly into the Store Builder so they can immediately see and edit what their store looks like.

## Changes
- In `artifacts/fashion-store/src/pages/register.tsx`, modify the successful registration handler to redirect to `/store-builder` instead of `/setup`.

## Rationale
The user chose to bypass the wizard entirely in favor of an immediate, visual "Store Builder" experience upon store creation.

## Testing
1. Complete the registration form with valid data.
2. Ensure that upon submission and success, the app navigates to `/store-builder`.
