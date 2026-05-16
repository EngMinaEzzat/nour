# Observability and Monitoring

## Log Redaction
We use Pino for structured logging. To comply with privacy requirements and ensure security, the following fields are automatically redacted from logs:
- `authorization` headers
- `cookie` and `set-cookie` headers
- Passwords and API Keys
- Payment card numbers (PAN, CVV)
- Customer PII (emails, phones)
- Full AI Prompts and Results

## Health Checks
- **Liveness**: `GET /api/healthz` returns 200 `{ status: "ok" }`. Fast, does not hit external dependencies.
- **Readiness**: `GET /api/readyz` verifies database connectivity and returns the configuration status of third-party providers (Email, Bosta, Paymob, AI). 

## Alerts (To be configured in Ops tools)
- Alert on `5xx` error rates > 1%.
- Alert on failed background jobs or dead-letter queue growth.
- Alert on database connection pool saturation.