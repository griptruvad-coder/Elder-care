-- ApnaSa database schema. Safe to run many times (everything is IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  phone         TEXT,
  password_hash TEXT,                       -- null for Google-only accounts
  google_sub    TEXT UNIQUE,                -- Google account id
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'family' CHECK (role IN ('family','companion','admin')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A parent being cared for. Belongs to one family account.
CREATE TABLE IF NOT EXISTS parents (
  id               SERIAL PRIMARY KEY,
  family_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  age              INTEGER CHECK (age BETWEEN 1 AND 120),
  city             TEXT NOT NULL,
  address          TEXT,
  living           TEXT,
  walking          TEXT,
  preferred_time   TEXT,
  language         TEXT,
  notes            TEXT,
  companion_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS parents_family_idx ON parents(family_user_id);
CREATE INDEX IF NOT EXISTS parents_companion_idx ON parents(companion_id);

-- Enquiries from the public "Talk to us" form (login not required).
CREATE TABLE IF NOT EXISTS enquiries (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  data        JSONB NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','converted','closed')),
  admin_note  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One Razorpay subscription per parent per plan purchase.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        SERIAL PRIMARY KEY,
  user_id                   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id                 INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  plan                      TEXT NOT NULL CHECK (plan IN ('basic','premium','super_premium')),
  amount_paise              INTEGER NOT NULL,
  razorpay_subscription_id  TEXT UNIQUE,
  status                    TEXT NOT NULL DEFAULT 'created',
  current_end               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id                    SERIAL PRIMARY KEY,
  subscription_id       INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  razorpay_payment_id   TEXT UNIQUE NOT NULL,
  amount_paise          INTEGER,
  status                TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily visit notes written by companions, shown to the family.
CREATE TABLE IF NOT EXISTS visit_notes (
  id            SERIAL PRIMARY KEY,
  parent_id     INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  companion_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  mood          TEXT CHECK (mood IN ('great','good','okay','low')),
  activities    TEXT[] NOT NULL DEFAULT '{}',
  medicines_taken BOOLEAN,
  note          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visit_notes_parent_idx ON visit_notes(parent_id, created_at DESC);

-- Razorpay webhook events already processed (so a retried webhook is not applied twice).
CREATE TABLE IF NOT EXISTS webhook_events (
  id          TEXT PRIMARY KEY,
  event       TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
