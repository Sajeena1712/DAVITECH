import crypto from "node:crypto";

const DEFAULT_BASE_URL = "https://data.mongodb-api.com/app";

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, passwordHash };
}

function verifyPassword(password, salt, passwordHash) {
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const stored = Buffer.from(passwordHash, "hex");
  const next = Buffer.from(candidate, "hex");
  if (stored.length !== next.length) return false;
  return crypto.timingSafeEqual(stored, next);
}

function getConfig() {
  const baseUrl =
    process.env.MONGODB_DATA_API_URL ||
    (process.env.MONGODB_APP_ID ? `${DEFAULT_BASE_URL}/${process.env.MONGODB_APP_ID}/endpoint/data/v1` : "");

  return {
    baseUrl,
    apiKey: process.env.MONGODB_DATA_API_KEY || "",
    dataSource: process.env.MONGODB_DATA_SOURCE || "Cluster0",
    database: process.env.MONGODB_DATABASE || "daivai",
    collection: process.env.MONGODB_USERS_COLLECTION || "users",
  };
}

async function mongoAction(action, payload) {
  const { baseUrl, apiKey, dataSource, database, collection } = getConfig();

  if (!baseUrl || !apiKey) {
    throw new Error("MongoDB auth is not configured.");
  }

  const response = await fetch(`${baseUrl}/action/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      dataSource,
      database,
      collection,
      ...payload,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `MongoDB ${action} failed.`);
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const mode = typeof body.mode === "string" ? body.mode : "";
    const email = normalizeEmail(body.email);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Enter a valid email address." });
      return;
    }

    if (mode === "signup") {
      if (!name) {
        res.status(400).json({ error: "Enter your name." });
        return;
      }
      if (!isStrongPassword(password)) {
        res.status(400).json({
          error: "Password must be 8+ characters and include upper, lower, number, and symbol.",
        });
        return;
      }

      const existing = await mongoAction("findOne", {
        filter: { email },
        projection: { _id: 0, name: 1, email: 1 },
      });

      if (existing?.document) {
        res.status(409).json({ error: "An account already exists for this email." });
        return;
      }

      const { salt, passwordHash } = createPasswordRecord(password);
      await mongoAction("insertOne", {
        document: {
          name,
          email,
          salt,
          passwordHash,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      res.status(200).json({ user: { name, email } });
      return;
    }

    if (mode === "forgot") {
      if (!isStrongPassword(password)) {
        res.status(400).json({
          error: "New password must be 8+ characters and include upper, lower, number, and symbol.",
        });
        return;
      }

      const existing = await mongoAction("findOne", {
        filter: { email },
        projection: { _id: 0, name: 1, email: 1 },
      });

      if (!existing?.document) {
        res.status(404).json({ error: "No account found for that email." });
        return;
      }

      const { salt, passwordHash } = createPasswordRecord(password);
      await mongoAction("updateOne", {
        filter: { email },
        update: {
          $set: {
            salt,
            passwordHash,
            updatedAt: new Date().toISOString(),
          },
        },
      });

      res.status(200).json({ user: { name: existing.document.name, email } });
      return;
    }

    if (mode === "signin") {
      const result = await mongoAction("findOne", {
        filter: { email },
        projection: { _id: 0, name: 1, email: 1, salt: 1, passwordHash: 1 },
      });

      if (!result?.document) {
        res.status(401).json({ error: "Email or password is incorrect." });
        return;
      }

      if (!verifyPassword(password, result.document.salt, result.document.passwordHash)) {
        res.status(401).json({ error: "Email or password is incorrect." });
        return;
      }

      res.status(200).json({ user: { name: result.document.name, email } });
      return;
    }

    res.status(400).json({ error: "Unsupported auth mode." });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Authentication failed." });
  }
}
