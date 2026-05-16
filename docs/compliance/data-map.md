# Compliance Data Map

*LEGAL REVIEW REQUIRED: This document maps the technical implementation to privacy requirements under Egypt Law No. 151 of 2020. It must be reviewed by legal counsel.*

| Category | Source Table / Schema | Personal / Sensitive Fields | Purpose | Tenant Boundary | Providers | Cross-Border Transfer | Retention | Deletion / Export | Legal Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Merchant Account** | `merchants`, `tenants` | Email, password hash | Account access, billing, store identity | Platform (Global) | Supabase/Vercel Postgres | Likely (Vercel) | Retain until account closure + legal window | Merchant can request account closure | Review accounting data retention laws |
| **Staff/Session Data** | `merchants` (role), Redis/Postgres Sessions | Session ID, role | Authentication, access control | Tenant-scoped | Supabase, Redis (if configured) | Likely | Transient (Session TTL) | Automatic on logout/expiry | - |
| **Customer Data** | `customers` | Name, Phone, Email, City | Identity, support | Global (Shared across tenants) | Supabase | Likely | TBD (See Retention Policy) | Pseudonymize/mask fields upon request | Review global customer row implications |
| **Orders & Shipping** | `orders`, `order_items` | Shipping Address, Customer Phone, Customer Name | Fulfillment, operations | Tenant-scoped | Supabase, Bosta | Likely (Vercel), Regional (Bosta) | TBD | Mask PII fields, keep order totals | Financial records retention required |
| **Payments** | `payment_records`, `payment_webhooks` | Payment Token, Provider Order ID | Payment tracking, reconciliation | Tenant-scoped | Supabase, Paymob | Regional (Paymob) | TBD | Keep records, remove non-essential metadata | Financial records retention required |
| **Messages/WhatsApp** | `whatsapp_message_logs`, `messages` | Phone number, Message content | Customer support, notifications | Tenant-scoped | Supabase, Meta/WhatsApp | Yes (Meta) | TBD | Mask phone numbers | Meta data residency |
| **AI Usage** | `ai_usage_events`, `conversations` | Prompts, AI Results (Truncated) | Quota tracking, AI generation | Tenant-scoped | Anthropic, Gemini, OpenAI | Yes | TBD | Delete conversations | Review AI provider terms |
| **Tracking/Analytics** | `tracking_settings` | IP Address (in provider pixels) | Marketing, conversion tracking | Tenant-scoped | Google, Meta, TikTok, Snapchat | Yes | Retained by providers | - | Require explicit consent via cookie banner |
| **Media/Uploads** | CDN / Object Storage | User uploaded images (potential PII in images) | Product display | Tenant-scoped | CDN Provider | Yes | TBD | Delete files from object storage | - |
| **Logs/Errors** | `logs` (Pino/Vercel) | Error traces | Diagnostics, debugging | Platform | Vercel, Sentry | Yes | 30 days (default) | Ephemeral | Passwords/Tokens are redacted |
| **Exports** | `export_jobs`, `background_jobs` | Download tokens, file artifacts | Data portability, reporting | Tenant-scoped | Object Storage (Future) | Yes | Short TTL (24-48h) | Delete artifact after TTL | - |