import http from "http";
import net from "net";
import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./lib/scheduler.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

// ─── Dev: proxy WebSocket upgrade requests to the Vite HMR server ────────────
// The Vite dev server handles HMR via a WebSocket. Since all traffic comes in
// on port 8080 (Express), we forward upgrade requests to Vite so that HMR
// works through the Replit proxy without needing a direct browser→Vite connection.
if (process.env.NODE_ENV !== "production") {
  const VITE_PORT = Number(process.env.VITE_PORT ?? 25935);

  server.on("upgrade", (req, socket, head) => {
    const target = net.connect(VITE_PORT, "127.0.0.1", () => {
      const headers = [
        `${req.method ?? "GET"} ${req.url} HTTP/1.1`,
        `Host: localhost:${VITE_PORT}`,
        ...Object.entries(req.headers)
          .filter(([k]) => k !== "host")
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`),
        "",
        "",
      ].join("\r\n");

      target.write(headers);
      if (head && head.length > 0) target.write(head);
    });

    target.on("error", () => socket.destroy());
    socket.on("error", () => target.destroy());
    socket.pipe(target);
    target.pipe(socket);
  });
}

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startScheduler();
});
