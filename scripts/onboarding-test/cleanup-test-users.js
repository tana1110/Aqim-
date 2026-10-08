// Removes ONLY the throwaway accounts created by the onboarding tests
// (emails onb-test-<n>@example.com) and everything attached to them.
const fs = require("fs");
const token = fs.readFileSync("C:/Users/Admin/.cloudflare_token_for_aqim.txt", "utf8").trim();
const URL =
  "https://api.cloudflare.com/client/v4/accounts/23c4ed86016680e63c6c038a14a9806b/d1/database/93199874-3eb4-410e-9435-6ce897acaa94/query";

async function q(sql, params = []) {
  const r = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  const d = await r.json();
  if (!d.success) throw new Error(JSON.stringify(d.errors));
  return d.result[0].results;
}

(async () => {
  const users = await q(
    "SELECT id, email, name FROM users WHERE email LIKE 'onb-test-%@example.com'",
  );
  console.log("test users:", users);
  const tables = [
    "auth_sessions", "memo_snapshot", "memorization", "password_reset_tokens",
    "push_subscriptions", "recitation_history", "settings", "user_state",
  ];
  for (const u of users) {
    if (!/^onb-test-\d+@example\.com$/.test(u.email)) throw new Error("refusing: " + u.email);
    for (const t of tables) await q(`DELETE FROM ${t} WHERE user_id = ?`, [u.id]);
    await q("DELETE FROM users WHERE id = ?", [u.id]);
    console.log("deleted user", u.id, u.email);
  }
})();
