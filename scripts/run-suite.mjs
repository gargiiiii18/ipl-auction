// One-shot test runner — the ONLY way tests should be run in this project.
// Starts a fast server as a child process, runs all three suites in order,
// kills the server, exits non-zero on any failure. Nothing left running behind it.
//   node scripts/run-suite.mjs
import { spawn } from "node:child_process";

const PORT = "3100";
const URL = `http://localhost:${PORT}`;

const server = spawn(process.execPath, ["server/index.js"], {
  env: { ...process.env, PORT, LOT_DURATION_SECONDS: "2", ANTISNIPE_SECONDS: "1" },
  stdio: ["ignore", "pipe", "pipe"],   // capture child output so crashes are visible in THIS log
});
const serverOut = [], serverErr = [];
server.stdout.on("data", (d) => serverOut.push(d.toString()));
server.stderr.on("data", (d) => serverErr.push(d.toString()));
server.on("exit", (code, signal) => console.log(`[runner] server child exited (code=${code}, signal=${signal})`));

async function waitForServer() {
  let lastErr = null;
  for (let i = 0; i < 40; i++) {
    if (server.exitCode !== null) return false;   // child already died — no point polling
    try {
      const res = await fetch(`${URL}/`, { signal: AbortSignal.timeout(2000) });
      if (res.status < 500) return true;          // any HTTP response (even 404) proves it's up
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) { lastErr = e; }
    await new Promise((r) => setTimeout(r, 150));
  }
  console.error(`last readiness error: ${lastErr?.message ?? "unknown"}`);
  if (serverErr.length) console.error(`server stderr:\n${serverErr.join("")}`);
  return false;
}

function runSuite(label, script) {
  return new Promise((resolve) => {
    console.log(`\n━━━ ${label} ━━━`);
    const child = spawn(process.execPath, [script], {
      env: { ...process.env, TEST_URL: URL },
      stdio: "inherit",
    });
    child.on("exit", (code) => { results.push([label, code]); resolve(code); });
  });
}

const results = [];
try {
  if (!(await waitForServer())) {
    console.error("server failed to start — aborting");
    process.exit(1);
  }
  await runSuite("core (game rules)", "scripts/test-auction-core.mjs");
  await runSuite("sockets (join flow)", "scripts/test-sockets.mjs");
  await runSuite("e2e (full auction)", "scripts/test-auction.mjs");
} finally {
  server.kill();
}

const failed = results.filter(([, code]) => code !== 0);
console.log(`\n=== SUITE SUMMARY: ${results.length - failed.length}/${results.length} passed ===`);
for (const [label, code] of results) console.log(`  ${label.padEnd(24)} ${code === 0 ? "PASS" : "FAIL"}`);
process.exit(failed.length ? 1 : 0);
