import { ConvexError, v } from "convex/values";
import type { QueryCtx } from "../../_generated/server";
import { mutation, query } from "../../_generated/server";
import {
  type Ability,
  abilitiesFromRoles,
  can,
  type Role,
} from "../../_shared/permissions";
import { UserRole } from "./schema";

// =============================================================================
// Helpers (following official Convex pattern)
// =============================================================================

/** Get user by tokenIdentifier */
async function userByToken(ctx: QueryCtx, tokenIdentifier: string) {
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
}

/** Get current user or null */
export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return userByToken(ctx, identity.tokenIdentifier);
}

/** Get current user or throw */
export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new ConvexError("User not found");
  return user;
}

/** Check user has ability or throw */
export async function requireAbility(
  ctx: QueryCtx,
  action: "read" | "write",
  subject: "users" | "todo"
) {
  const user = await getCurrentUserOrThrow(ctx);
  const abilities: Ability[] = abilitiesFromRoles(
    user.role ? [user.role as Role] : []
  );
  if (!can(abilities, action, subject)) throw new ConvexError("Forbidden");
  return user;
}

// =============================================================================
// Public API
// =============================================================================

/** Get current user (returns null if not stored yet) */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const abilities = abilitiesFromRoles(user.role ? [user.role as Role] : []);
    return { user, abilities };
  },
});

/** Store current user from JWT. Creates if new, updates if changed. Returns user ID. */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    // JWT claims (configured in WorkOS JWT Template)
    const {
      tokenIdentifier,
      subject: workosUserId,
      name,
      email,
      pictureUrl,
      updatedAt,
    } = identity;
    const workosUpdatedAt =
      typeof updatedAt === "number" ? updatedAt : Date.now();

    const user = await userByToken(ctx, tokenIdentifier);

    if (user) {
      // Only update if JWT is newer than what we have (avoid overwriting webhook updates)
      if (user.workosUpdatedAt && workosUpdatedAt < user.workosUpdatedAt) {
        return user._id;
      }

      // Update if any field changed
      const updates: Record<string, string | number | undefined> = {};
      if (workosUserId && user.workosUserId !== workosUserId)
        updates.workosUserId = workosUserId;
      if (name && user.name !== name) updates.name = name;
      if (email && user.email !== email) updates.email = email;
      if (pictureUrl && user.image !== pictureUrl) updates.image = pictureUrl;
      updates.workosUpdatedAt = workosUpdatedAt;

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(user._id, updates);
      }
      return user._id;
    }

    // New user - first user becomes admin
    const isFirst = !(await ctx.db.query("users").first());
    return ctx.db.insert("users", {
      tokenIdentifier,
      workosUserId: workosUserId ?? undefined,
      name: name ?? undefined,
      email: email ?? undefined,
      image: pictureUrl ?? undefined,
      role: isFirst ? UserRole.ADMIN : UserRole.USER,
      isActive: true,
      workosUpdatedAt,
    });
  },
});

// =============================================================================
// Admin API
// =============================================================================

/** List all users (admin only) */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAbility(ctx, "read", "users");
    return ctx.db.query("users").collect();
  },
});

/** Update user role (admin only) */
export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, { userId, role }) => {
    await requireAbility(ctx, "write", "users");
    await ctx.db.patch(userId, { role: role as UserRole });
  },
});

/** Toggle user active (admin only) */
export const toggleActive = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await requireAbility(ctx, "write", "users");
    if (me._id === userId) throw new ConvexError("Cannot modify yourself");
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("User not found");
    await ctx.db.patch(userId, { isActive: !user.isActive });
  },
});

/** Delete user (admin only) */
export const remove = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await requireAbility(ctx, "write", "users");
    if (me._id === userId) throw new ConvexError("Cannot delete yourself");
    await ctx.db.delete(userId);
  },
});
