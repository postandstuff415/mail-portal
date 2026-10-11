import { redirect } from "next/navigation";
import { homeFor, requireViewer } from "@/lib/session";

// Landing spot after staff/case manager login: sends each role to its home page.
export default async function HomeRedirect() {
  const viewer = await requireViewer();
  redirect(homeFor(viewer.role));
}
