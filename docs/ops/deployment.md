# Deployment Strategy

This document outlines the recommended deployment paths for the Nour platform. The application is Dockerized and Kubernetes-ready but retains Vercel serverless support to remain flexible.

## Recommended Practical Path (Day One)

Kubernetes introduces operational overhead that is often unnecessary for early pilots. The recommended path is:

1. **Hosting**: Use **Vercel** for the API and Storefront. The repo is pre-configured with a `vercel.json` and a serverless entry point (`api/[...path].mjs`).
2. **Database**: Use a managed PostgreSQL provider (e.g., Supabase, Vercel Postgres).
3. **Session Cache**: Use a managed Redis instance (e.g., Upstash). If Redis is absent, sessions automatically fall back to the PostgreSQL database.
4. **Background Jobs**: Background jobs run out-of-band in `worker.ts`. In a pure serverless Vercel environment without a long-running process, background jobs can be triggered via a cron/scheduled endpoint hitting a secure runner, or by deploying just the worker via a Docker container on a cheap VM (e.g., DigitalOcean, AWS Droplet) connecting to the same DB.

## Docker & Docker Compose (Self-Hosted / Local)

A root `Dockerfile` and `docker-compose.yml` are provided.

```bash
# Build the Docker image
docker build -t nour:latest .

# Run the stack locally (API, Worker, Postgres, Redis)
docker-compose up -d
```

## Kubernetes Readiness

If the merchant volume requires autoscaling and cluster orchestration, use the templates in `deploy/k8s/`.

1. **ConfigMap / Secrets**: You must create a `nour-config` ConfigMap (for non-sensitive vars like `NODE_ENV`) and a `nour-secrets` Secret (for `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, etc.).
2. **Deployments**: The `api-deployment.yaml` sets up the API server with liveness and readiness probes (`/api/healthz` and `/api/readyz`).
3. **Worker**: The `worker-deployment.yaml` sets up the background job processor. It is decoupled from the API deployment to scale independently.

### Applying Manifests
```bash
kubectl apply -f deploy/k8s/api-deployment.yaml
kubectl apply -f deploy/k8s/worker-deployment.yaml
kubectl apply -f deploy/k8s/api-service.yaml
```

*Note: Migrations should run via an init-container, a pre-deploy hook in your CI/CD, or manually, rather than relying on automatic application startup migrations.*
