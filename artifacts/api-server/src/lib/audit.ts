import { db } from "@workspace/db";
import { tenantAuditEventsTable } from "@workspace/db";

interface AuditEventParams {
  tenantId: number;
  actorId?: number;
  actorLabel?: string;
  eventType: typeof tenantAuditEventsTable.$inferSelect["eventType"];
  summary: string;
  metadata?: object;
  log?: { warn: (obj: object, msg: string) => void };
}

/**
 * Helper to record an audit event safely.
 * Does not throw if the insert fails.
 */
export async function recordAuditEvent({ tenantId, actorId, actorLabel, eventType, summary, metadata, log }: AuditEventParams) {
  try {
    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId,
      actorLabel,
      eventType,
      summary,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (err) {
    if (log) {
      log.warn({ err, eventType }, "Failed to write audit event");
    }
  }
}
