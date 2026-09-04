-- =========================================================
-- IPL AUCTION ARENA v2 — reference schema (Postgres / Supabase)
-- The live database was created in the Supabase SQL editor and
-- evolved via scripts/migrate-*.mjs. This file documents the
-- complete current schema for a fresh setup.
-- =========================================================

-- Master list of cricketers up for auction (seed via scripts/seed-cricketers.mjs)
CREATE TABLE IF NOT EXISTS cricketers (
    cricketer_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         varchar(50)   NOT NULL,
    role         varchar(20),              -- nullable: enriched later from external data
    base_price   numeric(10,2) NOT NULL,   -- in crores
    is_overseas  boolean       NOT NULL DEFAULT false
);

-- Each auction session; host shares room_code, max_lots caps the auction size
CREATE TABLE IF NOT EXISTS rooms (
    room_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code     varchar(6) UNIQUE NOT NULL,
    name          varchar(60) NOT NULL,
    status        varchar(20) NOT NULL DEFAULT 'lobby',   -- lobby | live | ended
    max_lots      integer NOT NULL DEFAULT 20,
    current_cricketer_id integer REFERENCES cricketers(cricketer_id),
    lot_closes_at timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- Human participants (franchises)
CREATE TABLE IF NOT EXISTS participants (
    participant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id        uuid NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    team_name      varchar(45) NOT NULL,
    budget         numeric(10,2) NOT NULL DEFAULT 100,     -- crores
    is_host        boolean NOT NULL DEFAULT false,
    joined_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (room_id, team_name)                            -- one bid identity per room
);

-- Current live bid per team per lot (upserted by placeBid; never lowered)
CREATE TABLE IF NOT EXISTS bids (
    bid_id         bigserial PRIMARY KEY,
    room_id        uuid NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    cricketer_id   integer NOT NULL REFERENCES cricketers(cricketer_id),
    participant_id uuid NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
    amount         numeric(10,2) NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (room_id, cricketer_id, participant_id)
);

-- Settled sales (squads)
CREATE TABLE IF NOT EXISTS acquisitions (
    acquisition_id bigserial PRIMARY KEY,
    room_id        uuid NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    cricketer_id   integer NOT NULL REFERENCES cricketers(cricketer_id),
    participant_id uuid NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE,
    final_price    numeric(10,2) NOT NULL,
    acquired_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (room_id, cricketer_id)                         -- sold once per room
);

-- Players who went unsold in a room (excluded from further lots there)
CREATE TABLE IF NOT EXISTS unsold_cricketers (
    room_id      uuid NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    cricketer_id integer NOT NULL REFERENCES cricketers(cricketer_id),
    marked_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, cricketer_id)
);
