// Must be set before app.ts is imported (checks SESSION_SECRET at module load)
process.env.NODE_ENV = "test";
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "test-only-secret-not-for-production";
}
