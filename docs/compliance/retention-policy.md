# Data Retention Policy

*LEGAL REVIEW REQUIRED: These retention windows must be verified against local accounting and privacy laws (e.g., Egypt Law No. 151 of 2020).*

## General Principles
- **No Automatic Deletion of Financials**: Orders, payment records, and financial totals are kept for accounting and tax purposes, even if a user requests deletion. In such cases, PII is pseudonymized.
- **Minimization**: We do not store full payment payloads (PAN, CVV) or full AI prompts in our database.

## Proposed Retention Windows

| Data Type | Proposed Retention | Action at Expiry | Legal Notes |
|---|---|---|---|
| **Incomplete/Failed Orders** | 6 months | Delete | - |
| **Completed Orders & Payments** | 5-7 years | Pseudonymize PII, keep totals | Required for tax/accounting |
| **Customer Accounts (Inactive)** | 2 years after last activity | Pseudonymize/Delete | Review privacy law max retention |
| **AI Usage Events & Chat** | 90 days | Delete | - |
| **Export Artifacts (CSV)** | 48 hours | Delete file & token | - |
| **Application Logs / Errors** | 30-90 days | Auto-rotate | - |
| **Session Data (Redis)** | 14 days | Expire (TTL) | - |

## Deletion vs. Pseudonymization
When a Data Subject Access Request (DSAR) requests deletion:
1. **Delete**: Transient data (messages, AI chats, unused addresses).
2. **Pseudonymize**: Financial records (Orders). We overwrite `customerName`, `customerPhone`, and `shippingAddress` with `[REDACTED]` but preserve the `totalAmount` and `status`.