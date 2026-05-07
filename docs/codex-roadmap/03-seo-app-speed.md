# Phase 3: SEO And App-Like Speed

## Goal

Make public storefront pages indexable and fast while keeping merchant dashboard/admin as a SPA.

## Recommended Direction

Use SSR only for public storefront pages. Keep dashboard/admin as SPA.

Preferred implementation if staying on Vite:

- Add Vike SSR for public storefront pages.
- Do not use bot-only rendering as the long-term foundation.
- Serve the same SSR HTML to users and crawlers, then hydrate React.

## Public Page Types

- Store homepage: `/store/:slug`
- Product page: `/store/:slug/product/:productSlug`
- Category page: `/store/:slug/category/:categorySlug`
- Optional later: governorate/category pages for SEO, such as `/stores/cairo/fashion`
- `sitemap.xml`
- `robots.txt`

## SEO Requirements

Each public page needs:

- Unique Arabic title and description.
- Canonical URL, including custom-domain canonical handling.
- Open Graph tags.
- Twitter card tags.
- Product JSON-LD where relevant.
- OnlineStore or LocalBusiness JSON-LD for store pages.
- Breadcrumb JSON-LD.
- Stable product/category URLs.
- Only active/public stores and products in sitemap.
- Admin and private APIs blocked from indexing.

## App-Speed Requirements

- Server-rendered first page.
- Hydrated SPA-like transitions after first load.
- Route/data prefetching.
- Skeleton loading.
- Optimistic cart updates.
- Sticky mobile cart/checkout CTA.
- Responsive images with width/height or aspect-ratio to avoid layout shift.
- Cached public assets.
- PWA manifest/service worker later, after SSR is stable.

## Files To Inspect First

- `artifacts/fashion-store/src/pages/storefront.tsx`
- `artifacts/fashion-store/src/pages/product-detail.tsx`
- `artifacts/fashion-store/src/hooks/use-page-meta.ts`
- `artifacts/api-server/src/routes/seo.ts`
- `artifacts/api-server/src/routes/storefront.ts`
- `artifacts/fashion-store/vite.config.ts`

## Tests

- `view-source` or raw HTML contains store/product content without JavaScript.
- Product name, price, description, availability are in HTML.
- Metadata and JSON-LD are present in initial HTML.
- Sitemap includes active public pages and excludes inactive/private content.
- Mobile LCP target under 2.5s on seeded catalog.
- No image layout shift.

## Verification Commands / Checks

- Fetch raw HTML for a store page and confirm the store name, product names, canonical link, and JSON-LD are present before hydration.
- Fetch raw HTML for a product page and confirm product name, price, availability, image, and Product JSON-LD are present.
- Run a mobile browser smoke test for storefront, product detail, cart, and checkout CTA.
- Check that dashboard/admin pages are not accidentally included in sitemap.
- Check that custom-domain canonical logic does not create duplicate canonical URLs.

## Exit Criteria

This phase is complete when public store/product/category pages are real SSR pages with SEO metadata and app-like hydrated behavior.
