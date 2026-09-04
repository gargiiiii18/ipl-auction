# IPL Auction Arena 🏏

A live multiplayer IPL auction game. One host creates a room, friends join with a
6-character code, and cricketers go under the hammer in real time — countdowns,
live bids, anti-snipe extensions, and ₹100 Cr purses each.

## Stack

- **Frontend:** React 18 + Vite, Socket.IO client, cricket-themed CSS (no UI framework)
- **Backend:** Node + Express + Socket.IO, hand-rolled SQL over `pg`
- **Database:** PostgreSQL (Supabase), 336 real IPL players seeded from `data/player-list.csv`

## Run it

```bash
npm install
# put your Supabase connection string in .env as DATABASE_URL
npm run dev          # backend (server/index.js) + frontend (vite) together
node scripts/run-suite.mjs   # full regression: core rules, sockets, end-to-end auction
```

## Useful scripts

| Script | What it does |
|---|---|
| `scripts/run-suite.mjs` | starts a fast server, runs all three test suites, cleans up |
| `scripts/seed-cricketers.mjs` | replaces the player pool from `data/player-list.csv` |
| `scripts/migrate-3-5.mjs` | applies schema additions (idempotent) |
| `scripts/test-auction.mjs` | end-to-end auction over sockets (max_lots=4 room) |

## How a game works

1. Host creates a room on the homepage → gets a code like `K7XQ2M`.
2. Friends join with the code + a team name; every franchise gets ₹100 Cr.
3. Host opens lots; each cricketer is up for 20 seconds, bids must raise by ₹0.5 Cr,
   and late bids extend the clock.
4. Highest bid wins when the timer dies; no bids = unsold.
5. Auction ends after the host's chosen number of lots — standings and squads are announced.

Full schema: `setup.sql`. Server rules live in `server/game.js`, socket wiring in
`server/sockets.js`. The UI mirrors server events and never invents game state.
