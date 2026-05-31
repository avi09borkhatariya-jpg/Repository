import crypto from "node:crypto";

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

function secureEqual(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });

  const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!secret) return send(res, 500, { error: "Missing Razorpay server credentials" });

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return send(res, 400, { error: error.message });
  }

  const orderId = String(body.expected_order_id || "");
  const returnedOrderId = String(body.razorpay_order_id || "");
  const paymentId = String(body.razorpay_payment_id || "");
  const signature = String(body.razorpay_signature || "");

  if (!orderId || !returnedOrderId || !paymentId || !signature) {
    return send(res, 400, { error: "Missing payment verification fields" });
  }
  if (orderId !== returnedOrderId) {
    return send(res, 400, { error: "Payment order mismatch" });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (!secureEqual(expected, signature)) {
    return send(res, 400, { error: "Payment signature verification failed" });
  }

  return send(res, 200, { verified: true, payment_id: paymentId, order_id: orderId });
}
