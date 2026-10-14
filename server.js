const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();

// Render runs behind a proxy – needed to read the real visitor IP
app.set("trust proxy", 1);

app.use(cors());
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

schema
  .replace(/--.*$/gm, "")
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean)
  .forEach((statement) => {
    db.query(statement, (err) => {
      if (err) {
        console.error("ERROR CREATING TABLE:", err);
      } else {
        console.log("Table ready:", statement.match(/EXISTS\s+(\w+)/i)?.[1]);
      }
    });
  });

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

// START SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
