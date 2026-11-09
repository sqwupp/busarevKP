CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS destinations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  country VARCHAR(120) NOT NULL,
  category VARCHAR(60) NOT NULL,
  description TEXT NOT NULL,
  estimated_budget NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  destination VARCHAR(160) NOT NULL,
  travel_dates VARCHAR(120),
  travellers VARCHAR(40) NOT NULL DEFAULT '2 travellers',
  travel_style VARCHAR(80),
  notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
  booking_reference VARCHAR(30) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  total_price NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  topic VARCHAR(80),
  destination VARCHAR(160),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO destinations (name, country, category, description, estimated_budget) VALUES
('Dolomites', 'Italy', 'Nature', 'Mountain trails, alpine villages and dramatic views.', 1200),
('Bali', 'Indonesia', 'Coast & culture', 'Tropical landscapes, temples and relaxed island days.', 950),
('Kyoto', 'Japan', 'Culture', 'Historic streets, gardens, food and traditional architecture.', 1400),
('Madeira', 'Portugal', 'Adventure', 'Ocean cliffs, levada walks and green mountain scenery.', 1100),
('Marrakech', 'Morocco', 'City & culture', 'Colourful souks, gardens, design and local cuisine.', 850)
ON CONFLICT DO NOTHING;
