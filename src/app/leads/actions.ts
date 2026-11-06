"use server";

import { headers } from "next/headers";
import { isAuthorized } from "@/lib/admin-auth";
import { ensureSchema, getSql } from "@/lib/db";
import { STATUSES } from "@/lib/lead-meta";

async function requireAdmin() {
  const h = await headers();
  if (!isAuthorized(h.get("authorization"))) throw new Error("unauthorized");
}

export async function updateLead(
  id: string,
  changes: { status?: string; notes?: string },
) {
  await requireAdmin();
  await ensureSchema();
  const sql = getSql();
  if (changes.status !== undefined) {
    if (!STATUSES.some((s) => s.value === changes.status)) {
      throw new Error("bad_status");
    }
    await sql`update leads set status = ${changes.status}, updated_at = now() where id = ${id}`;
  }
  if (changes.notes !== undefined) {
    const notes = changes.notes.slice(0, 5000);
    await sql`update leads set notes = ${notes}, updated_at = now() where id = ${id}`;
  }
}
