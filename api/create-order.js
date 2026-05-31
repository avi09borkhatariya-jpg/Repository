const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 100000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function env(name) {
  return (process.env[name] || "").trim();
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });

  const keyId = env("RAZORPAY_KEY_ID");
  const keySecret = env("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    return send(res, 500, { error: "Missing Razorpay server credentials" });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return send(res, 400, { error: error.message });
  }

  const rupees = Number(body.amount);
  const amount = Math.round(rupees * 100);
  if (!Number.isFinite(amount) || amount < 100) {
    return send(res, 400, { error: "Amount must be at least INR 1" });
  }

  const payload = {
    amount,
    currency: "INR",
    receipt: String(body.receipt || `lectureai_${Date.now()}`).slice(0, 40),
    notes: Object.fromEntries(
      Object.entries(body.notes || {})
        .slice(0, 15)
        .map(([key, value]) => [String(key).slice(0, 256), String(value).slice(0, 256)])
    )
  };

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const rp = await fetch(RAZORPAY_ORDERS_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await rp.json().catch(() => ({}));
  if (!rp.ok) {
    return send(res, rp.status, {
      error: data?.error?.description || data?.error?.reason || "Could not create Razorpay order"
    });
  }

  return send(res, 200, {
    key_id: keyId,
    order_id: data.id,
    amount: data.amount,
    currency: data.currency
  });
}
