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
import { pool } from "@workspace/db";

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

type PgSessionStoreWithInternals = session.Store & {
  quotedTable(): string;
  _asyncQuery(query: string, params: unknown[], noTableCreation?: boolean): Promise<unknown>;
  _rawEnsureSessionStoreTable(): Promise<void>;
};

function patchPgSessionTableBootstrap(store: session.Store): session.Store {
  const pgStore = store as PgSessionStoreWithInternals;

  // The bundled serverless app cannot rely on connect-pg-simple's sibling table.sql asset.
  pgStore._rawEnsureSessionStoreTable = async function ensureSessionStoreTable() {
    const quotedTable = this.quotedTable();
    await this._asyncQuery(
      `
CREATE TABLE IF NOT EXISTS ${quotedTable} (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON ${quotedTable} ("expire");
      `,
      [],
      true,
    );
  };

  return store;
}

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
  return patchPgSessionTableBootstrap(new PgStore({
    pool: pool,
    tableName: "sessions",
    createTableIfMissing: true,
  }));
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
    crossOriginEmbedderPolicy: false, // Required for Paymob payment iframes
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        connectSrc: ["'self'", "https:", "wss:"],
        frameSrc: ["https://accept.paymob.com", "https://accept.paymobsolutions.com"],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// CORS — restrict to configured origins; defaults to permissive in dev
const rawAllowed = process.env.ALLOWED_ORIGINS;
const allowedOrigins = rawAllowed ? rawAllowed.split(",").map((s) => s.trim()) : null;
if (process.env.NODE_ENV === "production" && !allowedOrigins) {
  logger.warn("ALLOWED_ORIGINS not set — CORS will reject all cross-origin requests in production");
}

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
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(
  session({
    name: "nour.sid",
    store: buildSessionStore(),
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    proxy: true,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      path: "/",
    },
  }),
);

async function findBlobUrl(filename: string): Promise<string | null> {
  try {
    const { list } = await import("@vercel/blob");
    // Try exact match first
    const exactRes = await list({ prefix: filename, limit: 1 });
    if (exactRes.blobs.length > 0) {
      return exactRes.blobs[0].url;
    }

    // Fallback: search by prefix without extension to handle random suffixes
    const ext = path.extname(filename);
    const base = ext ? filename.slice(0, -ext.length) : filename;
    const listRes = await list({ prefix: base, limit: 5 });
    for (const blob of listRes.blobs) {
      const blobName = blob.pathname;
      if (blobName === filename || blobName.startsWith(base + "-")) {
        return blob.url;
      }
    }
  } catch (err) {
    logger.error({ err }, "Vercel Blob list error in fallback");
  }
  return null;
}

const uploadsDir = process.env.VERCEL ? path.join(os.tmpdir(), "uploads") : path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/api/uploads", (req, res, next) => {
  void req;
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, max-age=86400, immutable");
  next();
}, express.static(uploadsDir), async (req, res, next) => {
  // Blob fallback: if the file wasn't found locally and Vercel Blob is configured,
  // look it up in Blob storage and redirect to the public blob URL.
  if (req.method !== "GET" && req.method !== "HEAD") {
    return next();
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return next();
  }
  const filename = req.path.replace(/^\//, "");
  if (!filename || /[\/\\]/.test(filename)) return next();
  try {
    const blobUrl = await findBlobUrl(filename);
    if (blobUrl) {
      return res.redirect(301, blobUrl);
    }
  } catch (err) {
    logger.error({ err }, "Blob fallback lookup failed");
  }
  return next();
});

// CSRF protection — enforced in development and production.
// Only skipped in test mode to allow integration tests without token ceremony.
// Webhook endpoints that use provider HMAC validation are exempt (see CSRF_EXEMPT_PATHS).
const csrfMiddleware: RequestHandler = (req, res, next) => {
  if (process.env.NODE_ENV === "test") return next();
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

// Global JSON error handler to prevent Express from sending HTML error pages
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.log.error({ err }, "Unhandled application error");
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ error: "انتهت صلاحية الجلسة، يرجى تحديث الصفحة" });
  }
  if (err.name === "MulterError") {
    return res.status(400).json({ error: "خطأ في رفع الملف: " + err.message });
  }
  res.status(500).json({ error: "حدث خطأ داخلي في الخادم" });
});

export default app;
