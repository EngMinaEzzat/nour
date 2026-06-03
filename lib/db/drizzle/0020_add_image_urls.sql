ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "image_urls" text DEFAULT '[]' NOT NULL;
