"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";

// Staff marks a client's request (open and scan, hold, pickup, discard) as handled.
export async function markRequestDone(requestId: string) {
  await requireStaff();
  await db.request.updateMany({ where: { id: requestId, status: "OPEN" }, data: { status: "DONE" } });
  revalidatePath("/staff/queue");
}
