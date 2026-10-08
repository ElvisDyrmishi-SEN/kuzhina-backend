const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Aiven MySQL Database Connection
const db = mysql.createPool({
  host: "mysql-3f563b22-wbu-67fe.e.aivencloud.com",
  port: 15724,
  user: "avnadmin",
  password: process.env.DB_PASSWORD,
  database: "defaultdb",
  ssl: {
    rejectUnauthorized: false,
  },
});

// Create reviews table
db.query(
  `
  CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event VARCHAR(255),
    stars VARCHAR(20) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`,
  (err) => {
    if (err) {
      console.error("ERROR CREATING REVIEWS TABLE:", err);
    } else {
      console.log("Reviews table ready!");
    }
  },
);

// Create bookings table
db.query(
  `
  CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    date VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`,
  (err) => {
    if (err) {
      console.error("ERROR CREATING BOOKINGS TABLE:", err);
    } else {
      console.log("Bookings table ready!");
    }
  },
);

// GET REVIEWS
app.get("/api/reviews", (req, res) => {
  db.query("SELECT * FROM reviews ORDER BY id DESC", (err, results) => {
    if (err) {
      console.error("GET REVIEWS ERROR:", err);
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
});

// POST REVIEW
app.post("/api/reviews", (req, res) => {
  const { name, event, stars, text } = req.body;

  console.log("Received review:", {
    name,
    event,
    stars,
    text,
  });

  const sql =
    "INSERT INTO reviews (name, event, stars, text) VALUES (?, ?, ?, ?)";

  db.query(sql, [name, event, stars, text], (err, result) => {
    if (err) {
      console.error("REVIEW ERROR:", err);
      return res.status(500).json({
        error: err.message,
      });
    }

    res.status(201).json({
      message: "OK",
      id: result.insertId,
    });
  });
});

// POST BOOKING
app.post("/api/bookings", (req, res) => {
  const { name, email, date } = req.body;

  const sql = "INSERT INTO bookings (name, email, date) VALUES (?, ?, ?)";

  db.query(sql, [name, email, date], (err, result) => {
    if (err) {
      console.error("BOOKING ERROR:", err);
      return res.status(500).json({
        error: err.message,
      });
    }

    res.status(201).json({
      message: "OK",
      id: result.insertId,
    });
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
