const PAYMOB_BASE = "https://accept.paymob.com/api";

export function isConfigured(params?: { apiKey?: string | null; integrationId?: string | null; iframeId?: string | null }): boolean {
  if (params) {
    return !!params.apiKey && !!params.integrationId && !!params.iframeId;
  }
  return (
    !!process.env.PAYMOB_API_KEY &&
    !!process.env.PAYMOB_INTEGRATION_ID &&
    !!process.env.PAYMOB_IFRAME_ID
  );
}

async function authenticate(apiKey: string): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) throw new Error(`Paymob auth failed: ${res.status}`);
  const data = await res.json() as { token: string };
  return data.token;
}

async function createOrder(token: string, amountCents: number, merchantOrderId: string): Promise<number> {
  const res = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: token,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: "EGP",
      merchant_order_id: merchantOrderId,
      items: [],
    }),
  });
  if (!res.ok) throw new Error(`Paymob create order failed: ${res.status}`);
  const data = await res.json() as { id: number };
  return data.id;
}

async function createPaymentKey(
  token: string,
  integrationId: number,
  paymobOrderId: number,
  amountCents: number,
  billing: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    street: string;
  }
): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: token,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: paymobOrderId,
      currency: "EGP",
      integration_id: integrationId,
      billing_data: {
        first_name: billing.firstName,
        last_name: billing.lastName,
        email: billing.email,
        phone_number: billing.phone || "N/A",
        city: billing.city || "Cairo",
        country: billing.country || "EG",
        street: billing.street || "N/A",
        floor: "N/A",
        apartment: "N/A",
        building: "N/A",
        shipping_method: "PKG",
        postal_code: "N/A",
        state: "N/A",
      },
    }),
  });
  if (!res.ok) throw new Error(`Paymob payment key failed: ${res.status}`);
  const data = await res.json() as { token: string };
  return data.token;
}

export async function initPayment(params: {
  orderId: number;
  amountEGP: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  apiKey: string;
  integrationId: string;
  iframeId: string;
}): Promise<{ paymobOrderId: number; paymentKey: string; iframeUrl: string }> {
  const amountCents = Math.round(params.amountEGP * 100);
  const nameParts = params.customerName.split(" ");
  const firstName = nameParts[0] ?? "Customer";
  const lastName = nameParts.slice(1).join(" ") || "N/A";

  const integrationId = parseInt(params.integrationId, 10);
  const token = await authenticate(params.apiKey);
  const paymobOrderId = await createOrder(token, amountCents, `NOUR-${params.orderId}`);
  const paymentKey = await createPaymentKey(token, integrationId, paymobOrderId, amountCents, {
    firstName,
    lastName,
    email: params.customerEmail,
    phone: params.customerPhone,
    city: "Cairo",
    country: "EG",
    street: params.shippingAddress,
  });

  const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${params.iframeId}?payment_token=${paymentKey}`;
  return { paymobOrderId, paymentKey, iframeUrl };
}

export interface PaymobWebhookPayload {
  obj: {
    id: number;
    success: boolean;
    amount_cents: number;
    order: { merchant_order_id: string; id: number };
    is_voided: boolean;
    is_refunded: boolean;
    error_occured: boolean;
  };
  type: string;
}
