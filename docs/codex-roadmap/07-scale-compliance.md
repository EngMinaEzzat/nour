# Phase 7: Scale And Compliance

## Goal

Prepare for larger merchant volume, legal/compliance constraints, and enterprise deployment options.

## Scaling Areas

- Database indexes for hot paths.
- Query performance for storefront listing/search.
- Admin order queue performance.
- Dashboard aggregations.
- Redis caching strategy.
- Background jobs for exports, messaging, provider retries, sitemap generation, and analytics.
- Backup and restore plan.
- Observability: structured logs, traces, Sentry, health checks, provider health dashboard.

## Compliance Areas

Egypt Law No. 151 of 2020 requires serious privacy and cross-border transfer analysis. Do not reduce this to "all data must always stay in Egypt" without legal review.

Technical tasks:

- Data inventory: merchant, customer, order, payment, messages, AI logs, tracking data.
- Retention policy.
- Access logs and audit trails.
- Export/delete workflows where required.
- Consent/notice for marketing and tracking.
- Provider data transfer register.
- Data residency decision for DB, object storage, CDN/images, logs, AI providers, payments, and messaging.

## Deployment Direction

Containerize the app and make it Kubernetes-ready, but do not force Kubernetes on day one unless a client/compliance requirement demands it.

Recommended practical path:

1. Dockerized app.
2. Managed PostgreSQL.
3. Managed Redis.
4. Object storage/CDN.
5. CI/CD with migrations and smoke tests.
6. Kubernetes only when operationally justified.

## Tests And Operational Checks

- Load/smoke test hot read paths: storefront listing, product detail, admin order queue.
- Explain indexes used for each hot path.
- Backup restore drill is documented and tested in a non-production environment.
- Health checks cover API, DB, Redis/cache, and critical provider availability.
- Logs avoid secrets and unnecessary full PII.
- Compliance data map lists which providers receive customer, merchant, order, AI, payment, media, and analytics data.

## Exit Criteria

This phase is complete when the system has a documented scale plan, compliance data map, backup/restore path, and production monitoring.
