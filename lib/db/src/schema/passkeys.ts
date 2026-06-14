import { pgTable, text, integer, serial, timestamp, boolean, bigint, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const customerPasskeysTable = pgTable("customer_passkeys", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(),
  credentialPublicKey: text("credential_public_key").notNull(),
  counter: bigint("counter", { mode: "number" }).notNull(),
  credentialDeviceType: varchar("credential_device_type", { length: 32 }).notNull(),
  credentialBackedUp: boolean("credential_backed_up").notNull(),
  transports: text("transports"), // Comma separated list or JSON string of transports
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerPasskeySchema = createInsertSchema(customerPasskeysTable).omit({ id: true, createdAt: true });
export type InsertCustomerPasskey = z.infer<typeof insertCustomerPasskeySchema>;
export type CustomerPasskey = typeof customerPasskeysTable.$inferSelect;
