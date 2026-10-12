import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MailList } from "@/components/mail-list";
import { activeDelegates } from "@/lib/delegates";
import { mailForClient } from "@/lib/mail-queries";
import { homeFor, requireViewer } from "@/lib/session";
import { unseenIds } from "@/lib/unread";

// A client's own mail, plus who else is allowed to see it.
export default async function MyMailPage() {
  const viewer = await requireViewer();
  if (viewer.role !== "CLIENT" || !viewer.clientId) redirect(homeFor(viewer.role));

  const [items, delegates] = await Promise.all([mailForClient(viewer.clientId), activeDelegates(viewer.clientId)]);
  const unseen = await unseenIds(viewer, items.map((i) => i.id));

  return (
    <AppShell name={viewer.name}>
      <h1 className="mb-4 text-2xl font-bold">Your mail</h1>
      <MailList items={items} unseen={unseen} />

      <section className="mt-8 rounded-xl border border-[#7fe3d4]/40 p-4">
        <h2 className="text-lg font-semibold">Who can see your mail</h2>
        {delegates.length === 0 ? (
          <p className="mt-1">Only you and Post and Stuff staff.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {delegates.map((d) => (
              <li key={d.id}>
                {d.user.name ?? d.user.email}
                {d.user.org && <span className="opacity-70"> · {d.user.org.name}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm opacity-80">To add or remove someone, ask staff at the shop.</p>
      </section>
    </AppShell>
  );
}
