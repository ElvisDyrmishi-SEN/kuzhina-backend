-- ==========================================================================
-- Kuzhina e Shefit – database schema (MySQL, Aiven)
-- server.js creates these tables automatically on start.
-- You can also run this file by hand in any MySQL client to recreate them.
-- ==========================================================================

-- Reviews shown in the "Reviews" section of the website.
-- `stars` is stored as emoji text, e.g. '⭐⭐⭐⭐⭐' (1–5 stars).
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  event VARCHAR(255),
  stars VARCHAR(20) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Booking requests sent from the "Rezervo" form.
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  date VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipes shown in the "Receta" section, managed from the admin page.
-- The first recipes use photos from the website (image_url);
-- photos uploaded from the admin page are stored in `image`.
CREATE TABLE IF NOT EXISTS recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  short_title VARCHAR(60) NOT NULL,
  category VARCHAR(60),
  prep_time VARCHAR(40),
  difficulty VARCHAR(40),
  description TEXT NOT NULL,
  image_url VARCHAR(255),
  image MEDIUMBLOB,
  image_type VARCHAR(40),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------------
-- Useful queries
-- --------------------------------------------------------------------------

-- See the latest booking requests:
--   SELECT * FROM bookings ORDER BY created_at DESC;

-- See all reviews:
--   SELECT * FROM reviews ORDER BY created_at DESC;

-- Delete a spam/fake review (replace 123 with its id):
--   DELETE FROM reviews WHERE id = 123;
