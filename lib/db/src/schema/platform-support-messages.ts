import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { merchantsTable } from "./merchants";

export const platformSupportMessagesTable = pgTable("platform_support_messages", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id").references(() => merchantsTable.id, { onDelete: "set null" }),
  name: text("name"),
  email: text("email"),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"), // pending, resolved
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PlatformSupportMessage = typeof platformSupportMessagesTable.$inferSelect;
