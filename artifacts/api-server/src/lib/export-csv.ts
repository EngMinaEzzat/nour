import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { db } from "@workspace/db";
import {
  customersTable,
  orderItemsTable,
  ordersTable,
  productsTable,
  returnCasesTable,
  stockAdjustmentLogsTable,
} from "@workspace/db";
import { and, desc, eq, gte, lte } from "drizzle-orm";

export type ExportType =
  | "orders"
  | "order_items"
  | "products"
  | "customers"
  | "inventory_adjustments"
  | "returns";

export type ExportDateRange = {
  dateFrom?: Date | null;
  dateTo?: Date | null;
};

export function buildConditions(
  tableTenantIdCol: any,
  tableDateCol: any,
  tenantId: number,
  range: ExportDateRange,
) {
  const conds = [eq(tableTenantIdCol, tenantId)];
  if (range.dateFrom) conds.push(gte(tableDateCol, range.dateFrom));
  if (range.dateTo) conds.push(lte(tableDateCol, range.dateTo));
  return and(...conds);
}

export async function buildExportRows(params: {
  tenantId: number;
  exportType: ExportType;
  dateFrom?: Date | null;
  dateTo?: Date | null;
}): Promise<Record<string, unknown>[]> {
  const { tenantId, exportType, dateFrom, dateTo } = params;
  const range = { dateFrom, dateTo };

  if (exportType === "orders") {
    const data = await db
      .select()
      .from(ordersTable)
      .where(
        buildConditions(
          ordersTable.tenantId,
          ordersTable.createdAt,
          tenantId,
          range,
        ),
      )
      .orderBy(desc(ordersTable.createdAt));
    return data.map((o) => ({
      id: o.id,
      status: o.status,
      total: o.totalAmount,
      payment: o.paymentMethod,
      customer: o.customerName,
      phone: o.customerPhone,
      governorate: o.shippingGovernorate,
      created: o.createdAt,
    }));
  }

  if (exportType === "products") {
    const data = await db
      .select()
      .from(productsTable)
      .where(
        buildConditions(
          productsTable.tenantId,
          productsTable.createdAt,
          tenantId,
          range,
        ),
      );
    return data.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      status: p.status,
    }));
  }

  if (exportType === "customers") {
    return db
      .selectDistinct({
        id: customersTable.id,
        name: customersTable.name,
        phone: customersTable.phone,
        email: customersTable.email,
        city: customersTable.city,
      })
      .from(customersTable)
      .innerJoin(ordersTable, eq(ordersTable.customerId, customersTable.id))
      .where(
        buildConditions(
          ordersTable.tenantId,
          ordersTable.createdAt,
          tenantId,
          range,
        ),
      );
  }

  if (exportType === "order_items") {
    return db
      .select({
        orderId: ordersTable.id,
        productId: orderItemsTable.productId,
        variantId: orderItemsTable.variantId,
        quantity: orderItemsTable.quantity,
        unitPrice: orderItemsTable.unitPrice,
        created: ordersTable.createdAt,
      })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
      .where(
        buildConditions(
          ordersTable.tenantId,
          ordersTable.createdAt,
          tenantId,
          range,
        ),
      )
      .orderBy(desc(ordersTable.createdAt));
  }

  if (exportType === "returns") {
    const data = await db
      .select()
      .from(returnCasesTable)
      .where(
        buildConditions(
          returnCasesTable.tenantId,
          returnCasesTable.createdAt,
          tenantId,
          range,
        ),
      );
    return data.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      status: r.status,
      reason: r.reason,
      created: r.createdAt,
    }));
  }

  if (exportType === "inventory_adjustments") {
    const data = await db
      .select()
      .from(stockAdjustmentLogsTable)
      .where(
        buildConditions(
          stockAdjustmentLogsTable.tenantId,
          stockAdjustmentLogsTable.createdAt,
          tenantId,
          range,
        ),
      );
    return data.map((s) => ({
      id: s.id,
      productId: s.productId,
      delta: s.delta,
      source: s.source,
      reason: s.reason,
      created: s.createdAt,
    }));
  }

  return [];
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    let s = String(v ?? "");
    // Prevent CSV Injection (Formula Injection)
    if (/^\s*[=\-+\@]/.test(s)) {
      s = "'" + s;
    }
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export function getExportFilePath(
  exportJobId: number,
  downloadToken: string,
): string {
  const baseDir =
    process.env.EXPORT_OUTPUT_DIR || path.join(os.tmpdir(), "matjareg-exports");
  return path.join(baseDir, `${exportJobId}-${downloadToken}.csv`);
}

export async function writeExportFile(
  exportJobId: number,
  downloadToken: string,
  csv: string,
): Promise<string> {
  const filePath = getExportFilePath(exportJobId, downloadToken);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, csv, "utf8");
  return filePath;
}
