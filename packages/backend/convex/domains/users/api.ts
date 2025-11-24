import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../../_generated/server";
import { requireAbility } from "../../_shared/auth";
import type { Ability, Role } from "../../_shared/permissions";
import { abilitiesFromRoles } from "../../_shared/permissions";
import { authComponent } from "../../auth";
// Permission checks for queries/mutations are enforced via _shared/auth.
import type { UserRole } from "./schema";

// Get current user with computed abilities (returns null if unauthenticated)
export const getCurrentUserWithAbilities = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", authUser.email))
      .unique();

    if (!user) {
      return null;
    }

    const roles: Role[] = (user.role ? [user.role as Role] : []) as Role[];
    const abilities: Ability[] = abilitiesFromRoles(roles);

    return { user, abilities } as const;
  },
});

// Get all users (admin only)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAbility(ctx, "read", "users");
    return await ctx.db.query("users").collect();
  },
});

// Paginated list of users (admin only)
export const paginateUsers = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "read", "users");
    return await ctx.db.query("users").paginate(args.paginationOpts);
  },
});

// Find a user by email (internal helper)
export const findUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Internal-only version for server-to-server calls
export const findUserByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Internal: Get user by id (for actions)
export const getUserByIdInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get a user by id (internal helper for actions)
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Update user information (admin only)
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "users");

    const { userId, ...updates } = args;

    // Check if user exists
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // If email is being updated, check if it's already taken
    if (typeof updates.email === "string" && updates.email !== user.email) {
      const newEmail = updates.email;
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", newEmail))
        .first();

      if (existing && existing._id !== userId) {
        throw new ConvexError("Email already in use");
      }
    }

    // Build the patch object with proper typing
    const patchData: {
      name?: string;
      email?: string;
      role?: UserRole;
    } = {};

    if (updates.name !== undefined) patchData.name = updates.name;
    if (updates.email !== undefined) patchData.email = updates.email;
    if (updates.role !== undefined) patchData.role = updates.role as UserRole;

    // Update user
    await ctx.db.patch(userId, patchData);

    return userId;
  },
});

// Internal mutation: set `isActive` flag
export const setUserActivation = internalMutation({
  args: { userId: v.id("users"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");
    await ctx.db.patch(args.userId, { isActive: args.isActive });
  },
});

export const internalUpdateUserRole = internalMutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");
    await ctx.db.patch(args.userId, { role: args.role as UserRole });
  },
});

// Activate a user. Admin only.
export const activateUser = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "users");
    await ctx.runMutation(internal.domains.users.api.setUserActivation, {
      userId: args.userId,
      isActive: true,
    });
    return { success: true } as const;
  },
});
