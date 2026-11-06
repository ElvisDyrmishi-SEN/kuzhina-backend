const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config();

const app = express();

// Render runs behind a proxy – needed to read the real visitor IP
app.set("trust proxy", 1);

app.use(cors());
// Recipe uploads carry a photo, so they get a bigger limit than everything else
app.use("/api/admin/recipes", express.json({ limit: "4mb" }));
app.use(express.json({ limit: "10kb" }));

// Aiven MySQL Database Connection
const db = mysql.createPool({
  host: process.env.DB_HOST || "mysql-3f563b22-wbu-67fe.e.aivencloud.com",
  port: Number(process.env.DB_PORT) || 15724,
  user: process.env.DB_USER || "avnadmin",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "defaultdb",
  ssl: {
    rejectUnauthorized: false,
  },
});

// Create tables from schema.sql
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

// The recipes that were on the website before the admin page could manage them
const STARTER_RECIPES = [
  [
    "Risotto me Kërpudha Porcini & Vaj Trufeje",
    "Risotto Porcini",
    "Pjata Kryesore",
    "35 min",
    "Mesatare",
    "Krem i ngrohtë orizi Carnaroli i gatuar me lëng shtëpiak perimesh, kërpudha malore të freskëta, gjalpë zviceran dhe vaj trufeje të zezë.",
    "realrizoto.jpg",
  ],
  [
    "Salmon i Pjekur me Pesto Agrumesh",
    "Salmon Agrumesh",
    "Deti",
    "25 min",
    "E lehtë",
    "Fileto e mekur salmoni me lëkurë krokante, e shoqëruar me puree bizelesh me nenexhik dhe salcë delikate limoni e portokalli të egër.",
    "fileto.jpg",
  ],
  [
    "Fileto Viçi e Maturuar Sous-Vide",
    "Fileto Sous-Vide",
    "Chef's Special",
    "45 min",
    "E lartë",
    "Mish i përzgjedhur viçi i gatuar me teknikën sous-vide për 2 orë, i shërbyer me patate me gjalpë dhe reduktim vere të kuqe me sherebelë.",
    "mish.jpg",
  ],
  [
    "Tiramisu me Krem Pistaqio Siçilian",
    "Tiramisu Pistaqio",
    "Ëmbëlsirë",
    "20 min",
    "E lehtë",
    "Varianti modern i desertit klasik italian me krem mascarpone të rrahur dhe pistakë të bluar nga Siçilia.",
    "tiramisu.jpg",
  ],
];

const setupDatabase = async () => {
  const statements = schema
    .replace(/--.*$/gm, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await db.promise().query(statement);
    console.log("Table ready:", statement.match(/EXISTS\s+(\w+)/i)?.[1]);
  }

  // Fill the recipes table the first time only
  const [[{ count }]] = await db
    .promise()
    .query("SELECT COUNT(*) AS count FROM recipes");

  if (count === 0) {
    await db
      .promise()
      .query(
        "INSERT INTO recipes (title, short_title, category, prep_time, difficulty, description, image_url) VALUES ?",
        [STARTER_RECIPES],
      );
    console.log("Starter recipes added");
  }
};

setupDatabase().catch((err) => console.error("ERROR SETTING UP DATABASE:", err));

// SIMPLE SPAM PROTECTION
// Max 5 submissions per visitor every 15 minutes
const submissions = new Map();
const RATE_WINDOW = 15 * 60 * 1000;
const RATE_MAX = 5;

const rateLimit = (req, res, next) => {
  const now = Date.now();
  const recent = (submissions.get(req.ip) || []).filter(
    (time) => now - time < RATE_WINDOW,
  );

  if (recent.length >= RATE_MAX) {
    return res.status(429).json({
      error: "Too many requests. Please try again later.",
    });
  }

  recent.push(now);
  submissions.set(req.ip, recent);
  next();
};

// VALIDATION HELPERS
const cleanText = (value, maxLength) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

// Accepts 1–5 or "⭐⭐⭐" and always stores emoji stars
const normalizeStars = (value) => {
  const count = Number.isInteger(Number(value))
    ? Number(value)
    : [...String(value)].filter((c) => c === "⭐").length;

  if (count < 1 || count > 5) return null;
  return "⭐".repeat(count);
};

// HEALTH CHECK
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Kuzhina API is running" });
});

// GET REVIEWS
app.get("/api/reviews", (req, res) => {
  db.query(
    "SELECT id, name, event, stars, text, created_at FROM reviews ORDER BY id DESC LIMIT 50",
    (err, results) => {
      if (err) {
        console.error("GET REVIEWS ERROR:", err);
        return res.status(500).json({
          error: "Could not load reviews",
        });
      }

      res.json(results);
    },
  );
});

// POST REVIEW
app.post("/api/reviews", rateLimit, (req, res) => {
  const name = cleanText(req.body.name, 80);
  const event = cleanText(req.body.event, 100);
  const text = cleanText(req.body.text, 1000);
  const stars = normalizeStars(req.body.stars);

  if (!name || !text || !stars) {
    return res.status(400).json({
      error: "Name, stars and text are required",
    });
  }

  console.log("Received review:", { name, event, stars });

  const sql =
    "INSERT INTO reviews (name, event, stars, text) VALUES (?, ?, ?, ?)";

  db.query(sql, [name, event, stars, text], (err, result) => {
    if (err) {
      console.error("REVIEW ERROR:", err);
      return res.status(500).json({
        error: "Could not save review",
      });
    }

    res.status(201).json({
      message: "OK",
      id: result.insertId,
    });
  });
});

// POST BOOKING
app.post("/api/bookings", rateLimit, (req, res) => {
  const name = cleanText(req.body.name, 120);
  const email = cleanText(req.body.email, 160);
  const date = cleanText(req.body.date, 10);

  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      error: "Valid name, email and date are required",
    });
  }

  console.log("Received booking:", { name, email, date });

  const sql = "INSERT INTO bookings (name, email, date) VALUES (?, ?, ?)";

  db.query(sql, [name, email, date], (err, result) => {
    if (err) {
      console.error("BOOKING ERROR:", err);
      return res.status(500).json({
        error: "Could not save booking",
      });
    }

    res.status(201).json({
      message: "OK",
      id: result.insertId,
    });
  });
});

// GET RECIPES (without the photo bytes – those come from /image)
app.get("/api/recipes", (req, res) => {
  db.query(
    `SELECT id, title, short_title, category, prep_time, difficulty, description, image_url
     FROM recipes ORDER BY id ASC`,
    (err, results) => {
      if (err) {
        console.error("GET RECIPES ERROR:", err);
        return res.status(500).json({ error: "Could not load recipes" });
      }

      res.json(results);
    },
  );
});

// GET RECIPE PHOTO (uploaded from the admin page)
app.get("/api/recipes/:id/image", (req, res) => {
  db.query(
    "SELECT image, image_type FROM recipes WHERE id = ?",
    [Number(req.params.id)],
    (err, results) => {
      if (err) {
        console.error("GET RECIPE IMAGE ERROR:", err);
        return res.status(500).end();
      }

      const recipe = results[0];
      if (!recipe?.image) return res.status(404).end();

      // A recipe's photo never changes, so browsers can keep it
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.type(recipe.image_type).send(recipe.image);
    },
  );
});

// ==========================================================================
// ADMIN (password is set as ADMIN_PASSWORD in Render's environment variables)
// ==========================================================================
const failedLogins = new Map();
const LOGIN_MAX_FAILS = 10;

const hash = (value) => crypto.createHash("sha256").update(value).digest();

const requireAdmin = (req, res, next) => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(503).json({ error: "Admin is not configured" });
  }

  const now = Date.now();
  const fails = (failedLogins.get(req.ip) || []).filter(
    (time) => now - time < RATE_WINDOW,
  );

  if (fails.length >= LOGIN_MAX_FAILS) {
    return res.status(429).json({
      error: "Too many wrong passwords. Try again in 15 minutes.",
    });
  }

  const given = (req.get("Authorization") || "").replace(/^Bearer /, "");

  if (!crypto.timingSafeEqual(hash(given), hash(expected))) {
    fails.push(now);
    failedLogins.set(req.ip, fails);
    return res.status(401).json({ error: "Wrong password" });
  }

  next();
};

// Shared handler for admin list/delete queries
const sendQuery = (res, label) => (err, result) => {
  if (err) {
    console.error(`${label} ERROR:`, err);
    return res.status(500).json({ error: "Database error" });
  }
  res.json(result);
};

// LOGIN CHECK
app.get("/api/admin/check", requireAdmin, (req, res) => {
  res.json({ ok: true });
});

// ALL REVIEWS
app.get("/api/admin/reviews", requireAdmin, (req, res) => {
  db.query(
    "SELECT id, name, event, stars, text, created_at FROM reviews ORDER BY id DESC",
    sendQuery(res, "ADMIN REVIEWS"),
  );
});

// ALL BOOKINGS
app.get("/api/admin/bookings", requireAdmin, (req, res) => {
  db.query(
    "SELECT id, name, email, date, created_at FROM bookings ORDER BY id DESC",
    sendQuery(res, "ADMIN BOOKINGS"),
  );
});

// DELETE REVIEW
app.delete("/api/admin/reviews/:id", requireAdmin, (req, res) => {
  db.query(
    "DELETE FROM reviews WHERE id = ?",
    [Number(req.params.id)],
    sendQuery(res, "DELETE REVIEW"),
  );
});

// DELETE BOOKING
app.delete("/api/admin/bookings/:id", requireAdmin, (req, res) => {
  db.query(
    "DELETE FROM bookings WHERE id = ?",
    [Number(req.params.id)],
    sendQuery(res, "DELETE BOOKING"),
  );
});

// ADD RECIPE
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

app.post("/api/admin/recipes", requireAdmin, (req, res) => {
  const title = cleanText(req.body.title, 160);
  const shortTitle = cleanText(req.body.short_title, 60) || title.slice(0, 60);
  const category = cleanText(req.body.category, 60);
  const prepTime = cleanText(req.body.prep_time, 40);
  const difficulty = cleanText(req.body.difficulty, 40);
  const description = cleanText(req.body.description, 2000);

  // Photo arrives as "data:image/jpeg;base64,...."
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    req.body.image || "",
  );
  const image = match && Buffer.from(match[2], "base64");

  if (!title || !description || !image) {
    return res.status(400).json({
      error: "Title, description and photo are required",
    });
  }

  if (image.length > MAX_IMAGE_BYTES) {
    return res.status(413).json({ error: "Photo is too large" });
  }

  const sql = `INSERT INTO recipes
    (title, short_title, category, prep_time, difficulty, description, image, image_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [title, shortTitle, category, prepTime, difficulty, description, image, match[1]],
    (err, result) => {
      if (err) {
        console.error("ADD RECIPE ERROR:", err);
        return res.status(500).json({ error: "Could not save recipe" });
      }

      res.status(201).json({ message: "OK", id: result.insertId });
    },
  );
});

// DELETE RECIPE
app.delete("/api/admin/recipes/:id", requireAdmin, (req, res) => {
  db.query(
    "DELETE FROM recipes WHERE id = ?",
    [Number(req.params.id)],
    sendQuery(res, "DELETE RECIPE"),
  );
});

// START SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
