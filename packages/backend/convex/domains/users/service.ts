import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

// Pure domain helpers (no auth/validation). Use from queries/mutations.

export async function list(ctx: QueryCtx) {
  return ctx.db.query("users").collect();
}

export async function getById(ctx: QueryCtx, userId: Id<"users">) {
  return ctx.db.get(userId);
}
