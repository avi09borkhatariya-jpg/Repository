const BITLY_URL = "https://api-ssl.bitly.com/v4/shorten";

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

  const token = env("BITLY_TOKEN");
  if (!token) return send(res, 500, { error: "Missing Bitly token" });

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return send(res, 400, { error: error.message });
  }

  const url = String(body.url || "").trim();
  if (!/^https?:\/\//i.test(url)) return send(res, 400, { error: "Invalid URL" });

  let rp;
  try {
    rp = await fetch(BITLY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ long_url: url })
    });
  } catch (error) {
    return send(res, 502, { error: "Could not reach Bitly" });
  }

  const data = await rp.json().catch(() => ({}));
  if (!rp.ok || !data.link) {
    return send(res, rp.status || 502, {
      error: data.description || data.message || "Could not shorten link"
    });
  }

  return send(res, 200, { short: data.link });
}
