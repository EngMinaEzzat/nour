const BOSTA_BASE = "https://app.bosta.co/api/v2";
const API_KEY = process.env.BOSTA_API_KEY ?? "BOSTA_API_KEY_PLACEHOLDER";

export function isConfigured(): boolean {
  return !!process.env.BOSTA_API_KEY;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: API_KEY,
  };
}

export interface CreateDeliveryParams {
  orderId: number;
  orderTotal: number;
  paymentMethod: "cod" | "paymob";
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  dropOffAddress: string;
  dropOffCity?: string;
  notes?: string;
}

export interface DeliveryResult {
  shipmentId: string;
  trackingNumber: string;
}

export async function createDelivery(params: CreateDeliveryParams): Promise<DeliveryResult> {
  const body = {
    type: 10,
    businessReference: `NOUR-${params.orderId}`,
    notes: params.notes ?? `طلب نور #${params.orderId}`,
    cod: params.paymentMethod === "cod" ? Math.round(params.orderTotal) : 0,
    receiver: {
      firstName: params.customerFirstName,
      lastName: params.customerLastName,
      phone: params.customerPhone.startsWith("+") ? params.customerPhone : `+2${params.customerPhone}`,
    },
    dropOffAddress: {
      city: params.dropOffCity ?? "Cairo",
      firstLine: params.dropOffAddress,
      zone: "N/A",
      district: "N/A",
    },
  };

  const res = await fetch(`${BOSTA_BASE}/deliveries`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bosta create delivery failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { _id: string; trackingNumber: string };
  return { shipmentId: data._id, trackingNumber: data.trackingNumber };
}

export async function trackDelivery(trackingNumber: string): Promise<unknown> {
  const res = await fetch(`${BOSTA_BASE}/deliveries/business/tracking/${trackingNumber}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Bosta tracking failed: ${res.status}`);
  return res.json();
}
