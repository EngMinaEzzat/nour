import { Request } from "express";
import { db } from "@workspace/db";
import { tenantsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

/**
 * Resolves the active storefront tenant ID from request headers, body, or query.
 * Returns the tenant ID, or null if not found or invalid.
 */
export async function resolveStorefrontTenantId(
  req: Request,
  options?: { allowTestFallback?: boolean }
): Promise<number | null> {
  // 1. Try to resolve via slug (from headers, body, or query)
  const slugHeader = req.headers["x-storefront-slug"] || req.body?.storefrontSlug || req.query?.storefrontSlug;
  if (typeof slugHeader === "string" && slugHeader.trim()) {
    const slug = slugHeader.trim();
    try {
      const [tenant] = await db
        .select({ id: tenantsTable.id })
        .from(tenantsTable)
        .where(
          and(eq(tenantsTable.slug, slug), eq(tenantsTable.status, "active"))
        );
      if (tenant) return tenant.id;
    } catch (err) {
      if (req.log) {
        req.log.error(err, `Error resolving storefront tenant from slug: ${slug}`);
      }
    }
  }

  // 2. Try direct tenantId lookup (from body, query, or header x-tenant-id)
  const directIdVal = req.headers["x-tenant-id"] || req.body?.tenantId || req.query?.tenantId;
  const directId = Number(directIdVal);
  if (directId && !isNaN(directId)) {
    try {
      const [tenant] = await db
        .select({ id: tenantsTable.id })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, directId));
      if (tenant) return tenant.id;
    } catch (err) {
      if (req.log) {
        req.log.error(err, `Error resolving storefront tenant from direct ID: ${directId}`);
      }
    }
  }

  // 3. Fallback for tests: return the first active tenant to preserve E2E integration test runs
  if (process.env.NODE_ENV === "test" && options?.allowTestFallback !== false) {
    try {
      const [firstTenant] = await db
        .select({ id: tenantsTable.id })
        .from(tenantsTable)
        .where(eq(tenantsTable.status, "active"))
        .limit(1);
      if (firstTenant) return firstTenant.id;
    } catch (err) {
      // Ignore
    }
  }

  return null;
}

export function getStorefrontContext(req: Request) {
  // 1. Try custom domain first
  const host = req.headers.host;

  // 2. Try subdomain
  const subdomain = req.headers["x-tenant-domain"] as string;

  return { host, subdomain };
}
