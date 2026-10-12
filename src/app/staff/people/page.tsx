import { AppShell } from "@/components/app-shell";
import { StaffNav } from "@/components/staff-nav";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { isDisabled } from "@/lib/users";
import { removeAccessAction } from "./actions";
import { AddPersonForm, ResetPasswordButton } from "./people-forms";

const ROLE_LABELS = {
  CASE_MANAGER: "Case manager",
  ORG_ADMIN: "Nonprofit admin",
  STAFF: "Staff",
  ADMIN: "Admin",
} as const;

// Email-login accounts. Staff manage case managers and nonprofit admins;
// only admins add or reset staff and admin accounts.
export default async function PeoplePage() {
  const viewer = await requireStaff();
  const [users, orgs] = await Promise.all([
    db.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      include: { org: { select: { name: true } }, _count: { select: { delegates: { where: { revokedAt: null } } } } },
    }),
    db.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const isAdmin = viewer.role === "ADMIN";

  return (
    <AppShell name={viewer.name}>
      <StaffNav />
      <h1 className="mb-4 text-2xl font-bold">People</h1>
      <ul className="mb-6 flex flex-col gap-2">
        {users.map((u) => (
          <li key={u.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#7fe3d4]/50 p-3">
            <span>
              {u.name ?? u.email}
              <span className="block text-sm opacity-70">
                {ROLE_LABELS[u.role]} · {u.email}
                {u.org && ` · ${u.org.name}`}
                {u.role === "CASE_MANAGER" && ` · ${u._count.delegates} client${u._count.delegates === 1 ? "" : "s"}`}
              </span>
              {isDisabled(u) && <span className="block text-sm font-semibold text-[#f48fb1]">Access removed</span>}
            </span>
            {u.id !== viewer.id && (isAdmin || u.role === "CASE_MANAGER" || u.role === "ORG_ADMIN") && (
              <span className="flex shrink-0 flex-col items-end gap-2">
                <ResetPasswordButton userId={u.id} label={isDisabled(u) ? "Give access back" : undefined} />
                {!isDisabled(u) && (
                  <form action={removeAccessAction.bind(null, u.id)}>
                    <button type="submit" className="text-sm text-[#f48fb1] underline">
                      Remove access
                    </button>
                  </form>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
      <AddPersonForm orgs={orgs} canAddStaff={isAdmin} />
    </AppShell>
  );
}
