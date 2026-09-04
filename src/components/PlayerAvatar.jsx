import { useEffect, useState } from "react";
import { fetchPlayerPhoto } from "../lib/photos.js";

const HUES = [145, 160, 42, 200, 350, 265, 15];
function hueFor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return HUES[h % HUES.length];
}

// Real photo when Wikipedia has one, initials avatar otherwise.
export default function PlayerAvatar({ name, size = 64 }) {
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    let alive = true;
    if (name) fetchPlayerPhoto(name).then((p) => { if (alive) setPhoto(p); });
    return () => { alive = false; };
  }, [name]);

  if (photo) {
    return <img className="avatar" src={photo} alt={name} style={{ width: size, height: size }} />;
  }
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="avatar avatar-fallback"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hueFor(name || "?")} 40% 24%)` }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
