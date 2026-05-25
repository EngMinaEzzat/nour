ALTER TABLE "paymob_providers" ADD COLUMN "api_key" text;
UPDATE "paymob_providers"
SET
  "status" = 'CONFIGURED_DISABLED',
  "last_error_at" = now(),
  "last_error_message" = 'Paymob API key must be re-entered after credential storage migration',
  "updated_at" = now()
WHERE "api_key_hash" IS NOT NULL AND "api_key_hash" <> '';
ALTER TABLE "paymob_providers" DROP COLUMN "api_key_hash";
