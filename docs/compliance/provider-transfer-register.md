# Provider Transfer Register

*LEGAL REVIEW REQUIRED: This documents the third-party providers that process data on behalf of Nour. Ensure DPA (Data Processing Agreements) and transfer mechanisms comply with Egypt Law No. 151 of 2020.*

| Provider | Service Type | Data Processed | Data Residency / Cross-Border | Legal Review Status |
|---|---|---|---|---|
| **Supabase / Vercel Postgres** | Primary Database | All application data (Merchants, Customers, Orders, PII) | Depends on configured region (usually EU/US) | **PENDING** |
| **Vercel** | Hosting & Edge Functions | HTTP requests, IP addresses, session cookies | Global edge network | **PENDING** |
| **Redis (Upstash/etc.)** | Session Cache | Session IDs, temporary application state | Depends on configured region | **PENDING** |
| **Resend** | Transactional Email | Merchant emails, Customer emails | US/EU | **PENDING** |
| **Paymob** | Payment Gateway | Transaction amounts, identifiers | Egypt / Regional | **PENDING** |
| **Bosta** | Logistics & Shipping | Customer Name, Phone, Shipping Address | Egypt / Regional | **PENDING** |
| **Meta (WhatsApp)** | Messaging API | Customer Phone, Order details via templates | Global | **PENDING** |
| **Anthropic / Google / OpenAI** | AI Services | Product descriptions, prompt text | US / Global | **PENDING** |
| **Sentry** (if configured) | Error Tracking | Error stack traces, context (Redacted PII) | US / EU | **PENDING** |
| **Google Analytics, Meta Pixel, TikTok** | Marketing Tracking | Client IPs, browsing behavior (client-side) | Global | **PENDING (Requires Consent)** |