// End-to-end check against a running app (npm run build && npm start):
// log in as seed client T101, then try to open T102's mail by editing the URL.
// Run with: npm run test:e2e
import { PrismaClient } from "@prisma/client";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const db = new PrismaClient();
const jar = new Map<string, string>();

function remember(res: Response) {
  for (const line of res.headers.getSetCookie()) {
    const [pair] = line.split(";");
    const i = pair.indexOf("=");
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
}
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

async function get(path: string, withCookies = true) {
  return fetch(BASE + path, { redirect: "manual", headers: withCookies ? { cookie: cookieHeader() } : {} });
}

function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} (${detail})`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  if (process.env.NEON_BRANCH === "production") throw new Error("Use the dev branch.");
  const own = await db.mailItem.findFirstOrThrow({ where: { client: { pmbNumber: "T101" } } });
  const other = await db.mailItem.findFirstOrThrow({ where: { client: { pmbNumber: "T102" } } });

  const anon = await get(`/mail/${own.id}`, false);
  check("logged-out visitor is sent to login", anon.status === 307 && !!anon.headers.get("location")?.includes("/login"), `status ${anon.status}`);

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  remember(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const login = await fetch(`${BASE}/api/auth/callback/client-pin`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader() },
    body: new URLSearchParams({ csrfToken, pmbNumber: "T101", pin: "111111", callbackUrl: `${BASE}/mail` }),
  });
  remember(login);
  check("client T101 logs in", [...jar.keys()].some((k) => k.includes("session-token")), `status ${login.status}`);

  const mine = await get(`/mail/${own.id}`);
  check("T101 opens their own mail", mine.status === 200, `status ${mine.status}`);

  const theirs = await get(`/mail/${other.id}`);
  const body = await theirs.text();
  check(
    "T101 CANNOT open T102's mail by changing the URL",
    theirs.status === 404 && !body.includes(other.sender ?? "\u0000"),
    `status ${theirs.status}`,
  );

  const staffPage = await get("/staff");
  check("T101 cannot open the staff page", staffPage.status === 404, `status ${staffPage.status}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
