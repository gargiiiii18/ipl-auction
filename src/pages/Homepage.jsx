import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createRoom } from "../lib/api.js";

export default function Homepage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [joinError, setJoinError] = useState(location.state?.joinError || null);
  const [busy, setBusy] = useState(false);

  const [auctionName, setAuctionName] = useState("");
  const [hostName, setHostName] = useState("");
  const [maxLots, setMaxLots] = useState(20);

  // prefilled when the Room page bounces us back with a taken team name
  const [joinCode, setJoinCode] = useState(location.state?.code || "");
  const [joinTeam, setJoinTeam] = useState(location.state?.teamName || "");

  const fail = (msg) => { setJoinError(null); setError(msg); setTimeout(() => setError(null), 4000); setBusy(false); };

  // one-shot navigation state — clear it so the toast doesn't haunt every refresh
  useEffect(() => {
    if (location.state?.joinError) window.history.replaceState({}, "");
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!auctionName.trim() || !hostName.trim()) return fail("Auction name and your team name are required");
    setBusy(true);
    try {
      // the backend already creates the host's participant row — remember its id so the
      // Room page RE-ATTACHES as the host instead of fresh-joining (which would collide)
      const { room, host } = await createRoom(auctionName.trim(), hostName.trim(), Number(maxLots));
      localStorage.setItem(`ipl-auction:${room.room_code}`, host.participant_id);
      navigate(`/room/${room.room_code}`, {
        state: { teamName: hostName.trim(), participantId: host.participant_id },
      });
    } catch (e) { fail(e.message); }
  }

  // pre-flight check: stay on the homepage with a toast if the room or name is
  // invalid — only navigate across once the join can actually succeed
  async function handleJoin(e) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    const team = joinTeam.trim();
    if (!code || !team) return fail("Room code and your team name are required");
    setBusy(true);
    try {
      const res = await fetch(`/rooms/${code}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return fail(body.error || "Room not found — check the code");
      if (body.room?.status === "ended") return fail("That auction has already ended");
      const taken = (body.participants ?? []).some(
        (p) => p.team_name.toLowerCase() === team.toLowerCase()
      );
      if (taken) return fail(`"${team}" is already taken in this room — pick another name`);
      navigate(`/room/${code}`, { state: { teamName: team } });
    } catch {
      fail("Could not reach the room — is the backend running?");
    }
  }

  return (
    <div className="page home">
      <div className="stadium-bg" aria-hidden="true">
        <div className="beam beam-1" /><div className="beam beam-2" /><div className="beam beam-3" />
        <span className="ball b1" /><span className="ball b2" /><span className="ball b3" />
        <span className="ball b4" /><span className="ball b5" />
        <div className="pitch-lines" />
      </div>

      <header className="hero">
        <p className="hero-kicker">🏏 Live multiplayer auction</p>
        <h1 className="hero-title">IPL AUCTION <span className="gold">ARENA</span></h1>
        <p className="hero-sub">
          Build your franchise under the floodlights. One host, your friends,
          ₹100 Cr each — may the best bid win.
        </p>
      </header>

      <section className="entry-grid">
        <form className="panel" onSubmit={handleCreate}>
          <h2>Host an auction</h2>
          <p className="muted">You control the hammer. Friends join with your code.</p>
          <label>Auction name
            <input value={auctionName} onChange={(e) => setAuctionName(e.target.value)} placeholder="Friday Night Mega Auction" maxLength={60} />
          </label>
          <label>Your team name
            <input value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="Deccan Chargers" maxLength={45} />
          </label>
          <label>Players in auction
            <input type="number" min={2} max={100} value={maxLots} onChange={(e) => setMaxLots(e.target.value)} />
          </label>
          <button className="btn btn-gold" disabled={busy}>{busy ? "Opening…" : "Create room 🏏"}</button>
        </form>

        <form className="panel" onSubmit={handleJoin}>
          <h2>Join with a code</h2>
          <p className="muted">Got a code from the host? Jump in and bring your purse.</p>
          <label>Room code
            <input className="code-input" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="K7XQ2M" maxLength={6} />
          </label>
          <label>Your team name
            <input value={joinTeam} onChange={(e) => setJoinTeam(e.target.value)} placeholder="Super Kings XI" maxLength={45} />
          </label>
          <button className="btn btn-green" disabled={busy}>Join auction →</button>
        </form>
      </section>

      {(error || joinError) && <div className="toast toast-error">{error || joinError}</div>}

      <section className="panel rules">
        <h2>📋 House rules</h2>
        <ol className="rules-list">
          <li><strong>Rooms.</strong> The host creates an auction room and shares the 6-character code. Everyone joins as a franchise with a team name.</li>
          <li><strong>The purse.</strong> Every franchise starts with <strong>₹100 Cr</strong>. Spend it wisely — unspent money wins nothing.</li>
          <li><strong>The lots.</strong> One cricketer goes under the hammer at a time. Each lot stays open for <strong>20 seconds</strong>, and every late bid pushes the deadline back — snipers don't win on the clock.</li>
          <li><strong>Bidding.</strong> The opening bid is the player's base price. Every raise must beat the current bid by at least <strong>₹0.5 Cr</strong>. One live bid per team per lot — raise your own bid anytime.</li>
          <li><strong>The hammer.</strong> When the timer dies, the highest bid buys the player. No bids? The player goes <strong>UNSOLD</strong> and is out of this auction.</li>
          <li><strong>The finish.</strong> The auction ends when the host's chosen number of players is done. Best squad of the night takes the glory.</li>
        </ol>
      </section>

      <footer className="home-footer">Handcrafted with 🏏 — no franchises were harmed.</footer>
    </div>
  );
}
