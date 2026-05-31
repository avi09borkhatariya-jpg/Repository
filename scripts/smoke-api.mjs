import crypto from "node:crypto";
import createOrder from "../api/create-order.js";
import verifyPayment from "../api/verify-payment.js";

function mockReq(method, body) {
  const raw = body == null ? "" : JSON.stringify(body);
  return {
    method,
    on(event, callback) {
      if (event === "data" && raw) queueMicrotask(() => callback(Buffer.from(raw)));
      if (event === "end") queueMicrotask(callback);
      return this;
    }
  };
}

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(value) {
      this.body = value || "";
    }
  };
}

async function call(handler, method, body) {
  const req = mockReq(method, body);
  const res = mockRes();
  await handler(req, res);
  return { status: res.statusCode, body: JSON.parse(res.body || "{}") };
}

const oldFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (url !== "https://api.razorpay.com/v1/orders") {
    throw new Error(`Unexpected fetch URL: ${url}`);
  }
  const auth = options.headers.Authorization || "";
  if (!auth.startsWith("Basic ")) throw new Error("Missing Razorpay auth header");
  const body = JSON.parse(options.body || "{}");
  return {
    ok: true,
    status: 200,
    async json() {
      return {
        id: "order_test_123",
        amount: body.amount,
        currency: body.currency,
        status: "created"
      };
    }
  };
};

process.env.RAZORPAY_KEY_ID = "rzp_test_local";
process.env.RAZORPAY_KEY_SECRET = "local_secret";

const order = await call(createOrder, "POST", { amount: 499, notes: { topic: "Smoke" } });
if (order.status !== 200 || order.body.order_id !== "order_test_123" || order.body.amount !== 49900) {
  throw new Error(`Create order smoke failed: ${JSON.stringify(order)}`);
}

const signature = crypto
  .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
  .update("order_test_123|pay_test_123")
  .digest("hex");

const verified = await call(verifyPayment, "POST", {
  expected_order_id: "order_test_123",
  razorpay_order_id: "order_test_123",
  razorpay_payment_id: "pay_test_123",
  razorpay_signature: signature
});

if (verified.status !== 200 || verified.body.verified !== true) {
  throw new Error(`Verify payment smoke failed: ${JSON.stringify(verified)}`);
}

globalThis.fetch = oldFetch;
console.log("API smoke ok");
