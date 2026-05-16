# Luxara Component Library

This document serves as the central reference for the reusable UI components used across the Luxara enterprise SaaS platform. These components are designed to be themeable, supporting the Modern Egyptian Elegance, Digital Oasis, and New-Vintage Souq design systems.

## 1. Global Navigation

### Top Navigation Bar (Merchant Dashboard)
*   **Purpose:** Primary workspace navigation and brand identity.
*   **Elements:** Product Logo, Global Search, Notification Center, User Profile.
*   **States:** Default, Hover, Active.
*   **Themes:** 
    *   *Modern Egyptian Elegance:* Deep Emerald accents, serif typography.
    *   *Digital Oasis:* Dark glassmorphism, electric blue highlights.

### Side Navigation Bar
*   **Purpose:** Categorical navigation for dashboard modules.
*   **Items:** Overview, Inventory, Orders, Analytics, Promotions, Settings.
*   **Behavior:** Collapsible on smaller screens, active state indicator (left border/background tint).

## 2. Layout & Containers

### Dashboard Cards
*   **Purpose:** Encapsulating data widgets and content sections.
*   **Variants:** 
    *   *Metric Card:* High-contrast value with trend indicator (up/down).
    *   *Action Card:* Header, body, and primary footer action.
    *   *Table Card:* Full-width list view with filtering.

### Section Headers
*   **Purpose:** Title and primary actions for a page area.
*   **Elements:** Title (H2/H3), Subtext, Trailing CTA button.

## 3. Data Entry & Controls

### Primary/Secondary Buttons
*   **Primary:** High emphasis, solid color background.
*   **Secondary:** Medium emphasis, outlined or subtle tint.
*   **Icon-Only:** For compact toolbars (e.g., Edit, Delete, Filter).

### Input Fields
*   **Text Input:** Label, Placeholder, Focus State (accent border).
*   **Search Bar:** Integrated icon, clear-text action.
*   **Toggles:** For binary settings (e.g., "Flash Sale" active).

## 4. Feedback & Status

### Status Badges
*   **Colors:** 
    *   *Success (Green):* Active, Fulfilled, Published.
    *   *Warning (Amber):* Scheduled, Pending.
    *   *Neutral (Gray):* Expired, Draft.

### Empty States
*   **Usage:** When no data is available (e.g., new collection with no items).
*   **Elements:** Illustration, title, descriptive text, "Get Started" CTA.

## 5. Merchant-Specific UI

### Theme Selector Cards
*   **Usage:** Visual cards in the settings menu for switching platform aesthetics.
*   **Elements:** Thumbnail preview, Title, "Apply" button.

### Product/Collection Grid
*   **Usage:** Visual management of inventory items.
*   **Elements:** Square aspect ratio image, Title, SKU/Price, Status badge.
