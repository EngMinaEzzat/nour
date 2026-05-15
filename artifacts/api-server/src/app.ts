import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import os from "os";
import http from "http";
import router from "./routes";
import seoPublicRouter from "./lib/seo-public";
import { logger } from "./lib/logger";
import { doubleCsrfProtection, generateCsrfToken, isCsrfExempt } from "./lib/csrf";

// Fail fast on missing secrets — never fall back to weak defaults
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}
if (process.env.NODE_ENV === "production") {
  const missing = ["DATABASE_URL", "RESEND_API_KEY"].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }
  if (process.env.PAYMOB_ALLOW_MOCKS === "true") {
    throw new Error("PAYMOB_ALLOW_MOCKS must not be enabled in production");
  }
}

const PgStore = ConnectPgSimple(session);

// ─── Session store: Redis (when REDIS_URL is set) or PostgreSQL fallback ───
function buildSessionStore(): session.Store {
  if (process.env.REDIS_URL) {
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (err) => logger.warn({ err }, "Redis session client error"));
    // connect() is called async; commands are queued until the connection is established
    redisClient.connect().catch((err) => logger.error({ err }, "Redis session connect failed"));
    return new RedisStore({
      client: redisClient,
      ttl: 7 * 24 * 60 * 60, // 7 days in seconds
    });
  }

  logger.warn("REDIS_URL not set — using PostgreSQL session store");
  return new PgStore({
    conString: process.env.DATABASE_URL,
    tableName: "sessions",
    createTableIfMissing: true,
  });
}

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        // Never log Authorization headers or cookies
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Security headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // allow iframes for Paymob
    contentSecurityPolicy: false,     // managed by frontend
  }),
);

// CORS — restrict to configured origins; defaults to permissive in dev
const rawAllowed = process.env.ALLOWED_ORIGINS;
const allowedOrigins = rawAllowed ? rawAllowed.split(",").map((s) => s.trim()) : null;

app.use(
  cors({
    origin:
      allowedOrigins
        ? (origin, cb) => {
            if (!origin || allowedOrigins?.includes(origin)) return cb(null, true);
            cb(new Error(`CORS: origin ${origin} not allowed`));
          }
        : process.env.NODE_ENV !== "production", // permissive in dev; same-origin only in production
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: buildSessionStore(),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);

const uploadsDir = process.env.VERCEL ? path.join(os.tmpdir(), "uploads") : path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/api/uploads", express.static(uploadsDir));

// CSRF protection — applies to all state-mutating requests in production.
// In development the double-submit cookie pattern can't bind reliably across
// the dev proxy, so we skip the check. Production always enforces it.
// Webhook endpoints that use provider HMAC validation are exempt.
const csrfMiddleware: RequestHandler = (req, res, next) => {
  if (process.env.NODE_ENV !== "production") return next();
  if (isCsrfExempt(req.path)) return next();
  return doubleCsrfProtection(req, res, next);
};
app.use(csrfMiddleware);

// Expose CSRF token so the frontend can seed it on startup
app.get("/api/csrf-token", (req, res) => {
  (req.session as session.Session & { csrfIssuedAt?: number }).csrfIssuedAt = Date.now();
  const token = generateCsrfToken(req, res);
  req.session.save((err) => {
    if (err) {
      req.log.error({ err }, "Failed to persist CSRF session");
      return res.status(500).json({ error: "Failed to initialize security token" });
    }
    return res.json({ csrfToken: token });
  });
});

// Public SSR routes: /robots.txt, /sitemap.xml, and storefront pages.
// Mount under /api/ssr as well so Vercel rewrites can invoke the serverless
// function while preserving clean public URLs in the browser.
app.use("/api/ssr", seoPublicRouter);
app.use(seoPublicRouter);

app.use("/api", router);

// ─── Dev: proxy all non-API requests to the Vite frontend ───────────────────
// In production the built frontend is served as static files.
// In development the Vite dev server runs on a separate port and we proxy to it
// so the Replit preview (port 8080 / external 80) shows the React app.
if (process.env.NODE_ENV !== "production") {
  const VITE_PORT = Number(process.env.VITE_PORT ?? 25935);

  app.use((req, res) => {
    const proxyReq = http.request(
      {
        hostname: "127.0.0.1",
        port: VITE_PORT,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `localhost:${VITE_PORT}`,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      },
    );

    proxyReq.on("error", () => {
      if (!res.headersSent) {
        res.status(502).send("Frontend dev server not ready — please wait a moment and refresh.");
      }
    });

    req.pipe(proxyReq, { end: true });
  });
}

export default app;
