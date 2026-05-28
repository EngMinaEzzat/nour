import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { merchantsTable, staffInvitationsTable, tenantAuditEventsTable, tenantsTable } from "@workspace/db";
import { requireRole } from "../middleware/require-role";
import { InviteStaffBody, UpdateStaffRoleBody } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function toStaffMember(m: typeof merchantsTable.$inferSelect) {
  return {
    id: m.id,
    email: m.email,
    name: m.name ?? null,
    role: m.role,
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/staff", requireRole("manager"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const members = await db
      .select()
      .from(merchantsTable)
      .where(eq(merchantsTable.tenantId, tenantId))
      .orderBy(merchantsTable.createdAt);

    return res.json(members.map(toStaffMember));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/staff", requireRole("owner"), async (req, res) => {
  const parsed = InviteStaffBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, name, password, role } = parsed.data;
  const tenantId = req.merchantTenantId!;

  try {
    const existing = await db
      .select({ id: merchantsTable.id })
      .from(merchantsTable)
      .where(eq(merchantsTable.email, email));

    if (existing.length > 0) {
      return res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [member] = await db
      .insert(merchantsTable)
      .values({ email, name: name ?? null, passwordHash, tenantId, role })
      .returning();

    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: req.session?.merchantId,
      actorLabel: "مالك",
      eventType: "staff_invited",
      summary: `تمت إضافة عضو جديد: ${email} بدور ${role}`,
    }).catch(() => {});

    return res.status(201).json(toStaffMember(member));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ أثناء الإضافة" });
  }
});

router.put("/staff/:id", requireRole("owner"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "معرّف غير صالح" });

  const parsed = UpdateStaffRoleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = req.merchantTenantId!;
  const currentMerchantId = req.session.merchantId!;

  if (id === currentMerchantId) {
    return res.status(400).json({ error: "لا يمكنك تغيير دورك الخاص" });
  }

  try {
    const [member] = await db
      .select()
      .from(merchantsTable)
      .where(and(eq(merchantsTable.id, id), eq(merchantsTable.tenantId, tenantId)));

    if (!member) return res.status(404).json({ error: "العضو غير موجود" });
    if (member.role === "owner") return res.status(403).json({ error: "لا يمكن تغيير دور المالك" });

    const [updated] = await db
      .update(merchantsTable)
      .set({ role: parsed.data.role })
      .where(eq(merchantsTable.id, id))
      .returning();

    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: currentMerchantId,
      actorLabel: "مالك",
      eventType: "role_changed",
      summary: `تم تغيير دور ${member.email} إلى ${parsed.data.role}`,
    }).catch(() => {});

    return res.json(toStaffMember(updated));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

router.delete("/staff/:id", requireRole("owner"), async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "معرّف غير صالح" });

  const tenantId = req.merchantTenantId!;
  const currentMerchantId = req.session.merchantId!;

  if (id === currentMerchantId) {
    return res.status(400).json({ error: "لا يمكنك حذف نفسك" });
  }

  try {
    const [member] = await db
      .select()
      .from(merchantsTable)
      .where(and(eq(merchantsTable.id, id), eq(merchantsTable.tenantId, tenantId)));

    if (!member) return res.status(404).json({ error: "العضو غير موجود" });
    if (member.role === "owner") return res.status(403).json({ error: "لا يمكن حذف المالك" });

    await db.delete(merchantsTable).where(eq(merchantsTable.id, id));
    return res.status(204).send();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

/* ─── Staff Invitations ─── */

// GET /staff/invitations — list pending invitations
router.get("/staff/invitations", requireRole("owner", "manager"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const invitations = await db.select().from(staffInvitationsTable)
      .where(eq(staffInvitationsTable.tenantId, tenantId));
    res.json(invitations);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب الدعوات" });
  }
});

// POST /staff/invitations — send invitation
router.post("/staff/invitations", requireRole("owner"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const merchantId = req.session?.merchantId;
    const { email, role = "staff" } = req.body;
    if (!email) return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invitation] = await db.insert(staffInvitationsTable).values({
      tenantId,
      invitedEmail: email,
      role,
      token,
      status: "pending",
      invitedBy: merchantId,
      expiresAt,
    }).returning();

    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: merchantId,
      actorLabel: "مالك",
      eventType: "staff_invited",
      summary: `تمت دعوة ${email} بدور ${role}`,
    }).catch(() => {});

    res.status(201).json({ ...invitation, inviteLink: `/accept-invite?token=${token}` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إرسال الدعوة" });
  }
});

// GET /staff/invitations/preview/:token — public: show invitation details before accepting
router.get("/staff/invitations/preview/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const [row] = await db
      .select({
        invitedEmail: staffInvitationsTable.invitedEmail,
        role: staffInvitationsTable.role,
        status: staffInvitationsTable.status,
        expiresAt: staffInvitationsTable.expiresAt,
        tenantName: tenantsTable.name,
      })
      .from(staffInvitationsTable)
      .innerJoin(tenantsTable, eq(tenantsTable.id, staffInvitationsTable.tenantId))
      .where(eq(staffInvitationsTable.token, token));

    if (!row) return res.status(404).json({ error: "الدعوة غير موجودة" });
    if (row.status !== "pending") return res.status(410).json({ error: "الدعوة منتهية أو مُلغاة بالفعل" });
    if (row.expiresAt < new Date()) {
      await db.update(staffInvitationsTable).set({ status: "expired" }).where(eq(staffInvitationsTable.token, token));
      return res.status(410).json({ error: "انتهت صلاحية الدعوة" });
    }
    res.json({
      invitedEmail: row.invitedEmail,
      role: row.role,
      tenantName: row.tenantName,
      expiresAt: row.expiresAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

// POST /staff/invitations/:token/accept — accept invitation
router.post("/staff/invitations/:token/accept", async (req, res) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: "الاسم وكلمة المرور مطلوبان" });

    const [invitation] = await db.select().from(staffInvitationsTable)
      .where(and(eq(staffInvitationsTable.token, token), eq(staffInvitationsTable.status, "pending")));

    if (!invitation) return res.status(404).json({ error: "الدعوة غير موجودة أو منتهية الصلاحية" });
    if (invitation.expiresAt < new Date()) {
      await db.update(staffInvitationsTable).set({ status: "expired" }).where(eq(staffInvitationsTable.token, token));
      return res.status(410).json({ error: "انتهت صلاحية الدعوة" });
    }

    const existing = await db.select({ id: merchantsTable.id }).from(merchantsTable).where(eq(merchantsTable.email, invitation.invitedEmail));
    if (existing.length > 0) return res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });

    const passwordHash = await bcrypt.hash(password, 12);
    const [merchant] = await db.insert(merchantsTable).values({
      email: invitation.invitedEmail,
      name,
      passwordHash,
      tenantId: invitation.tenantId,
      role: invitation.role,
    }).returning();

    await db.update(staffInvitationsTable).set({
      status: "accepted",
      acceptedBy: merchant.id,
      acceptedAt: new Date(),
    }).where(eq(staffInvitationsTable.token, token));

    await db.insert(tenantAuditEventsTable).values({
      tenantId: invitation.tenantId,
      actorId: merchant.id,
      actorLabel: merchant.email,
      eventType: "staff_invitation_accepted",
      summary: `قَبِل ${invitation.invitedEmail} الدعوة بدور ${invitation.role}`,
    }).catch(() => {});

    res.json({ success: true, merchantId: merchant.id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل قبول الدعوة" });
  }
});

// DELETE /staff/invitations/:id — revoke invitation
router.delete("/staff/invitations/:id", requireRole("owner"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const id = Number(req.params.id);
    const [inv] = await db.select().from(staffInvitationsTable)
      .where(and(eq(staffInvitationsTable.id, id), eq(staffInvitationsTable.tenantId, tenantId)));
    if (!inv) return res.status(404).json({ error: "الدعوة غير موجودة" });
    await db.update(staffInvitationsTable).set({ status: "revoked", revokedAt: new Date() })
      .where(eq(staffInvitationsTable.id, id));
    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: req.session?.merchantId,
      actorLabel: "مالك",
      eventType: "staff_invitation_revoked",
      summary: `تم إلغاء دعوة ${inv.invitedEmail}`,
    }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إلغاء الدعوة" });
  }
});

export default router;
