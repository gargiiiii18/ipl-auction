import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { getSocket } from "../lib/socket.js";
import PlayerAvatar from "../components/PlayerAvatar.jsx";

const MIN_INCREMENT = 0.5;
const rupees = (v) => `₹${Number(v).toFixed(2).replace(/\.00$/, "")} Cr`;

export default function Room() {
  const { code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const socket = getSocket();

  const [phase, setPhase] = useState("joining"); // joining | lobby | live | ended
  const [me, setMe] = useState(null);
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [lot, setLot] = useState(null);          // { cricketer, closesAt, highBid, highParticipantId }
  const [lastResult, setLastResult] = useState(null);
  const [feed, setFeed] = useState([]);
  const [standings, setStandings] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [copied, setCopied] = useState(false);

  const teamById = (id) => participants.find((p) => p.participant_id === id)?.team_name ?? "???";
  const fail = (msg) => { setError(msg); setTimeout(() => setError(null), 4000); };

  function fetchStandings() {
    fetch(`/rooms/${code}/standings`)
      .then((r) => r.json())
      .then((s) => s.room && setStandings(s))
      .catch(() => {});
  }

  function join(payload) {
    setPhase("joining");
    socket.connect();
    socket.emit("room:join", payload, (ack) => {
      if (ack?.error) {
        // bounce to the homepage with the reason — the user re-enters there
        navigate("/", { state: { joinError: ack.error, teamName: payload.teamName, code } });
        return;
      }
      localStorage.setItem(`ipl-auction:${code}`, ack.participant.participant_id);
      setMe(ack.participant);
      setRoom(ack.room);
      setParticipants(ack.participants);
      if (ack.lot) {
        // arrived late to an open lot — render it from the snapshot
        setLot({ cricketer: ack.lot.cricketer, closesAt: ack.lot.closesAt, highBid: ack.lot.highBid, highParticipantId: null });
        setPhase("live");
      } else if (ack.room.status === "ended") {
        setPhase("ended");
        fetchStandings();
      } else {
        setPhase(ack.room.status === "live" ? "live" : "lobby");
      }
    });
  }

  // join on mount — hosts arrive with their participant_id from creation;
  // everyone else re-attaches via localStorage if they've been here before
  const joinedRef = useRef(false);
  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    const statePid = location.state?.participantId;
    const saved = statePid || localStorage.getItem(`ipl-auction:${code}`);
    if (saved) join({ code, participantId: saved });
    else if (location.state?.teamName) join({ code, teamName: location.state.teamName });
    else navigate("/", { state: { joinError: "Enter the room code on the homepage to join", code } });
    return () => socket.disconnect();
  }, []);

  // server events — the UI mirrors state, it never invents it
  useEffect(() => {
    const onJoined = (p) =>
      setParticipants((prev) => (prev.some((x) => x.participant_id === p.participant_id) ? prev : [...prev, p]));
    const onLotStarted = (started) => {
      setLot({ cricketer: started.cricketer, closesAt: started.room.lot_closes_at, highBid: null, highParticipantId: null });
      setLastResult(null);
      setFeed([]);
      setPhase("live");
    };
    const onBidNew = (placed) => {
      setLot((prev) => prev && ({
        ...prev,
        highBid: Number(placed.bid.amount),
        highParticipantId: placed.bid.participant_id,
        closesAt: placed.room.lot_closes_at,
      }));
      setFeed((prev) => [{ ...placed.bid, amount: Number(placed.bid.amount) }, ...prev].slice(0, 25));
    };
    const onLotClosed = (result) => {
      setLastResult(result);
      setLot(null);
      if (result.sold) {
        setParticipants((prev) =>
          prev.map((p) => (p.participant_id === result.participant_id
            ? { ...p, budget: Number(p.budget) - result.final_price }
            : p))
        );
      }
    };
    const onEnded = () => { setLot(null); setPhase("ended"); fetchStandings(); };
    socket.on("participant:joined", onJoined);
    socket.on("lot:started", onLotStarted);
    socket.on("bid:new", onBidNew);
    socket.on("lot:closed", onLotClosed);
    socket.on("auction:ended", onEnded);
    return () => {
      socket.off("participant:joined", onJoined);
      socket.off("lot:started", onLotStarted);
      socket.off("bid:new", onBidNew);
      socket.off("lot:closed", onLotClosed);
      socket.off("auction:ended", onEnded);
    };
  }, [socket]);

  // countdown — absolute deadline from the server, ticked at 100ms
  useEffect(() => {
    if (!lot?.closesAt) { setRemaining(0); return; }
    const t = setInterval(() => setRemaining(Math.max(0, new Date(lot.closesAt) - Date.now())), 100);
    return () => clearInterval(t);
  }, [lot?.closesAt]);

  // the next legal bid: base price to open, current high + increment to raise.
  // toFixed(2) keeps float drift out of the displayed AND sent amount.
  const nextBid = lot
    ? (lot.highBid
        ? Number((lot.highBid + MIN_INCREMENT).toFixed(2))
        : Number(lot.cricketer.base_price))
    : 0;
  const isHost = !!me?.is_host;
  const timeLeft = Math.ceil(remaining / 1000);

  function placeBid() {
    if (!lot || busy) return;
    setBusy(true);
    socket.emit("bid:place", { amount: nextBid }, (ack) => {
      setBusy(false);
      if (ack?.error) fail(ack.error);
    });
  }

  function startNextLot() {
    setBusy(true);
    socket.emit("lot:start", {}, (ack) => {
      setBusy(false);
      if (ack?.error) fail(ack.error);
    });
  }

  async function copyCode() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  }

  if (phase === "joining") {
    return (
      <div className="page room-page">
        <div className="panel center-panel"><p className="pulse">Joining room {code}…</p></div>
      </div>
    );
  }

  return (
    <div className="page room-page">
      <header className="room-header">
        <Link to="/" className="btn btn-ghost btn-sm">← Leave</Link>
        <div className="room-title">
          <h1>{room?.name}</h1>
          <button className="room-code" onClick={copyCode} title="Copy code">{copied ? "COPIED!" : code}</button>
        </div>
        <div className="me-chip">{me?.team_name}{isHost ? " · HOST" : ""}</div>
      </header>

      {error && <div className="toast toast-error">{error}</div>}

      <div className="room-grid">
        <section className="lot-zone">
          {phase === "lobby" && (
            <div className="panel center-panel">
              <h2>Waiting in the lobby</h2>
              <p className="muted">{participants.length} franchise{participants.length === 1 ? "" : "s"} ready · {room?.max_lots} players in this auction</p>
              {isHost
                ? <button className="btn btn-gold btn-lg" disabled={busy} onClick={startNextLot}>🏏 Start auction</button>
                : <p className="pulse">Waiting for the host to open the bidding…</p>}
            </div>
          )}

          {phase === "live" && lot && (
            <div className="panel lot-card">
              <div className="lot-head">
                <PlayerAvatar name={lot.cricketer.name} size={96} />
                <div className="lot-id">
                  <h2 className="lot-name">{lot.cricketer.name}</h2>
                  <p className="muted">
                    {lot.cricketer.role ?? "player"} · {lot.cricketer.is_overseas ? "Overseas 🌍" : "Indian 🇮🇳"} · base {rupees(lot.cricketer.base_price)}
                  </p>
                </div>
                <div className={`countdown ${timeLeft <= 5 ? "urgent" : ""}`}>{timeLeft}s</div>
              </div>
              <div className="bid-row">
                <div>
                  <p className="muted">Current bid</p>
                  <p className="big-money">{lot.highBid ? rupees(lot.highBid) : "Base price"}</p>
                  <p className="muted">{lot.highBid ? `by ${teamById(lot.highParticipantId)}` : "No bids yet"}</p>
                </div>
                <button className="btn btn-gold btn-lg" disabled={busy || remaining === 0} onClick={placeBid}>
                  Bid {rupees(nextBid)}
                </button>
              </div>
            </div>
          )}

          {phase === "live" && !lot && (
            <div className="panel center-panel">
              {lastResult && (
                <p className={lastResult.sold ? "sold-banner" : "unsold-banner"}>
                  {lastResult.sold
                    ? `SOLD! ${lastResult.team_name} buy ${lastResult.cricketer_name} for ${rupees(lastResult.final_price)} 🎉`
                    : `UNSOLD — ${lastResult.cricketer_name} leaves the table`}
                </p>
              )}
              {isHost
                ? <button className="btn btn-gold btn-lg" disabled={busy} onClick={startNextLot}>Next lot →</button>
                : <p className="pulse">Waiting for the host to open the next lot…</p>}
            </div>
          )}

          {phase === "ended" && standings && (
            <div className="panel">
              <h2>🏆 Auction complete</h2>
              <table className="standings">
                <thead><tr><th>Franchise</th><th>Purse left</th><th>Squad</th></tr></thead>
                <tbody>
                  {standings.participants.map((p) => (
                    <tr key={p.participant_id}>
                      <td>{p.team_name}{p.is_host ? " (host)" : ""}</td>
                      <td>{rupees(p.budget)}</td>
                      <td>{standings.squads.filter((s) => s.participant_id === p.participant_id).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3>The squads</h3>
              {standings.squads.length === 0 && <p className="muted">Nobody bought anyone. Brutal market.</p>}
              {standings.participants.map((p) => {
                const squad = standings.squads.filter((s) => s.participant_id === p.participant_id);
                if (!squad.length) return null;
                return (
                  <div key={p.participant_id} className="squad">
                    <h4>{p.team_name}</h4>
                    <ul>
                      {squad.map((s, i) => (
                        <li key={i}>{s.cricketer} — {rupees(s.final_price)} {s.is_overseas ? "🌍" : "🇮🇳"}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              <Link to="/" className="btn btn-ghost">Back to homepage</Link>
            </div>
          )}
        </section>

        <aside className="side-zone">
          <div className="panel">
            <h3>Franchises</h3>
            <ul className="teams">
              {participants.map((p) => (
                <li key={p.participant_id} className={p.participant_id === me?.participant_id ? "me" : ""}>
                  <span className="team-name">{p.team_name}{p.is_host ? " 🏏" : ""}</span>
                  <span className="team-budget">{rupees(p.budget)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h3>Bid feed</h3>
            {feed.length === 0 && <p className="muted">No bids yet.</p>}
            <ul className="feed">
              {feed.map((b) => (
                <li key={b.bid_id}><strong>{teamById(b.participant_id)}</strong> bid {rupees(b.amount)}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
