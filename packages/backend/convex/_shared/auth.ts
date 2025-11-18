import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import type { Ability, Action, Role, Subject } from "./permissions";
import { abilitiesFromRoles, can } from "./permissions";

type Ctx = QueryCtx | MutationCtx | ActionCtx;

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  // Query/Mutation contexts expose db; Action context does not.
  if ("db" in ctx) {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("User not found");
    return user;
  }
  // Action context path
  const session = await ctx.runQuery(
    api.domains.users.api.getCurrentUserWithAbilities,
    {}
  );
  if (!session?.user) throw new ConvexError("Not authenticated");
  return session.user as Doc<"users">;
}

export async function getUserAbilities(ctx: Ctx): Promise<Ability[]> {
  const user = await requireUser(ctx);
  const roles: Role[] = (user.role ? [user.role as Role] : []) as Role[];
  return abilitiesFromRoles(roles);
}

export async function requireAbility(
  ctx: Ctx,
  action: Action,
  subject: Subject
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  const roles: Role[] = (user.role ? [user.role as Role] : []) as Role[];
  const abilities = abilitiesFromRoles(roles);
  if (!can(abilities, action, subject)) {
    throw new ConvexError("Unauthorized: Missing required ability");
  }
  return user;
}

export async function requireAll(
  ctx: Ctx,
  abilities: Ability[]
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  const roles: Role[] = (user.role ? [user.role as Role] : []) as Role[];
  const have = abilitiesFromRoles(roles);
  for (const [a, s] of abilities) {
    if (!can(have, a, s)) {
      throw new ConvexError("Unauthorized: Missing required ability");
    }
  }
  return user;
}
