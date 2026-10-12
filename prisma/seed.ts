// Fake test data: 1 org, 3 clients, 1 case manager, 1 staff, 1 admin, 10 mail items.
// Run with `npm run db:seed`. Only use against a test/dev database.
import { PrismaClient, MailType } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Test-only credentials; printed at the end so you can log in locally.
const TEST_PASSWORD = "test-password-123";
const TEST_PINS = ["111111", "222222", "333333"];

function monthsFrom(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed a production database.");
  }

  const org = await db.organization.create({
    data: {
      name: "Test Housing Services",
      contactName: "Test Contact",
      contactEmail: "billing@test-housing.example",
      billingTerms: "NET30",
    },
  });

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const caseManager = await db.user.create({
    data: { email: "casemanager@test.example", name: "Casey Manager", passwordHash, role: "CASE_MANAGER", orgId: org.id },
  });
  await db.user.create({
    data: { email: "orgadmin@test.example", name: "Org Admin", passwordHash, role: "ORG_ADMIN", orgId: org.id },
  });
  await db.user.create({ data: { email: "staff@test.example", name: "Shop Staff", passwordHash, role: "STAFF" } });
  await db.user.create({ data: { email: "admin@test.example", name: "Shop Admin", passwordHash, role: "ADMIN" } });

  const names = [
    ["Alex", "Rivera"],
    ["Jordan", "Lee"],
    ["Sam", "Nguyen"],
  ];
  const clients = [];
  for (let i = 0; i < names.length; i++) {
    clients.push(
      await db.client.create({
        data: {
          pmbNumber: `T${101 + i}`,
          firstName: names[i][0],
          lastName: names[i][1],
          pinHash: await bcrypt.hash(TEST_PINS[i], 10),
          orgId: org.id,
          form1583OnFile: true,
          idExpiresAt: monthsFrom(new Date(), 18),
        },
      }),
    );
  }

  // The case manager is an approved delegate for the first two clients only.
  for (const client of clients.slice(0, 2)) {
    await db.delegate.create({ data: { clientId: client.id, userId: caseManager.id } });
  }

  const senders = ["Social Security Administration", "Alameda County", "DMV", "Medi-Cal", "Bank", null];
  const types: MailType[] = ["LETTER", "LETTER", "FLAT", "PACKAGE"];
  for (let i = 0; i < 10; i++) {
    const client = clients[i % clients.length];
    const receivedAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    await db.mailItem.create({
      data: {
        clientId: client.id,
        receivedAt,
        sender: senders[i % senders.length],
        type: types[i % types.length],
        urgent: i % 4 === 0,
        shelfLocation: `A${(i % 3) + 1}`,
        retainUntil: new Date(receivedAt.getTime() + client.holdDays * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log("Seeded test data.");
  console.log(`Staff/admin/case manager/org admin password: ${TEST_PASSWORD}`);
  clients.forEach((c, i) => console.log(`Client ${c.pmbNumber} PIN: ${TEST_PINS[i]}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
