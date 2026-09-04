// Best-effort real player photos from Wikipedia's CORS-enabled API.
// Famous players resolve; uncapped domestic players may 404 — the UI falls back
// to a cricket-themed initials avatar. Results are cached per session.
const cache = new Map();

export async function fetchPlayerPhoto(name) {
  if (cache.has(name)) return cache.get(name);
  const term = encodeURIComponent(`${name} cricketer`);
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrsearch=${term}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=256`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const pages = data?.query?.pages;
    const first = pages ? Object.values(pages)[0] : null;
    const photo = first?.thumbnail?.source ?? null;
    cache.set(name, photo);
    return photo;
  } catch {
    return null;
  }
}
