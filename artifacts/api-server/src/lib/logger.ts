import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
    "req.headers['x-api-key']",
    "req.headers['x-paymob-hmac']",
    "req.body.password",
    "req.body.passwordConfirmation",
    "req.body.token",
    "req.body.apiKey",
    "req.body.secret",
    "*.accessToken",
    "*.refreshToken",
    "*.payment_token",
    "*.pan",
    "*.card_number",
    "*.cvv",
    "*.ssn",
    "*.prompt",
    "*.aiResult",
    "*.customerPhone",
    "*.customerEmail",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
