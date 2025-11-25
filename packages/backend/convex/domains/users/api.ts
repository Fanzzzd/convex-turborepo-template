import {
  createAccount,
  getAuthUserId,
  invalidateSessions,
} from "@convex-dev/auth/server";
import type { WithoutSystemFields } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
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
// Permission checks for queries/mutations are enforced via _shared/auth.
import { UserRole } from "./schema";

// Get current user with computed abilities (returns null if unauthenticated)
// Automatically creates user if not exists (first-time WorkOS login)
// Automatically updates email if WorkOS email changed
export const getCurrentUserWithAbilities = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Get user ID from auth system
    // For customJwt (WorkOS), Convex Auth should have already created the authAccount
    let userId = await getAuthUserId(ctx);
    
    // If no userId found, try to find by WorkOS user ID (subject claim)
    // This handles the case where authAccount exists but getAuthUserId returns null
    if (!userId && identity.subject) {
      const workosAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q
            .eq("provider", "customJwt")
            .eq("providerAccountId", identity.subject)
        )
        .first();

      if (workosAccount) {
        userId = workosAccount.userId;
      }
    }

    if (!userId) {
      // No auth account found - user not authenticated or account not created yet
      return null;
    }

    // Get user record
    let user = await ctx.db.get(userId);
    
    // Determine if this is a WorkOS login
    const isWorkOS = identity.issuer?.includes("workos.com") ?? false;
    
    if (!user) {
      // AuthAccount exists but user record doesn't - create it
      // This can happen for WorkOS users on first login
      if (isWorkOS) {
        // Create user record with the userId from authAccount
        // Note: In Convex, we can't set _id directly, so we need to ensure
        // the userId from authAccount matches what we create
        // For customJwt, Convex Auth may create authAccount with a userId
        // that doesn't exist yet - we'll create the user record here
        const newUserId = await ctx.db.insert("users", {
          email: identity.email ?? undefined,
          name: identity.name ?? undefined,
          image: identity.picture ?? identity.imageUrl ?? undefined,
          emailVerificationTime: identity.emailVerified ? Date.now() : undefined,
          role: UserRole.USER, // Default role for new WorkOS users
        });
        
        // If the new userId doesn't match authAccount.userId, we have a problem
        // This shouldn't happen if Convex Auth creates users automatically
        // But if it does, we'll use the newly created user
        if (newUserId !== userId) {
          // Try to find authAccount and update it, but we can't do that in a query
          // For now, just use the new user - this is a rare edge case
          // The authAccount will need to be updated separately if needed
        }
        
        user = await ctx.db.get(newUserId);
      } else {
        // Password provider - user should exist
        return null;
      }
    } else if (isWorkOS) {
      // User exists, update info from WorkOS identity if changed
      const updates: Partial<Doc<"users">> = {};
      
      // Update email if changed (and not already taken by another user)
      if (identity.email && user.email !== identity.email) {
        const existingUserWithEmail = await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", identity.email!))
          .first();
        
        if (!existingUserWithEmail || existingUserWithEmail._id === user._id) {
          updates.email = identity.email;
          if (identity.emailVerified) {
            updates.emailVerificationTime = Date.now();
          }
        }
      }
      
      // Update name if changed
      if (identity.name && user.name !== identity.name) {
        updates.name = identity.name;
      }
      
      // Update image if changed
      const imageUrl = identity.picture ?? identity.imageUrl;
      if (imageUrl && user.image !== imageUrl) {
        updates.image = imageUrl;
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(user._id, updates);
        user = await ctx.db.get(user._id);
      }
    }

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

// Create a new user and auth account (admin only)
export const createUser = action({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "users");

    // Prevent duplicates on existing users table
    const existing = await ctx.runQuery(
      internal.domains.users.api.findUserByEmailInternal,
      {
        email: args.email,
      }
    );
    if (existing) {
      throw new ConvexError("User with this email already exists");
    }

    // Create account + user using Convex Auth (Password provider)
    const profile: WithoutSystemFields<Doc<"users">> = {
      email: args.email,
      name: args.name,
      role: args.role as UserRole,
    };

    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: args.email, secret: args.password },
      profile,
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    });

    return user._id;
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
      // Prevent conflicting auth account for the new email
      const conflictingAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", newEmail)
        )
        .first();
      if (conflictingAccount && conflictingAccount.userId !== userId) {
        throw new ConvexError("Email already linked to another account");
      }
      // Keep password provider account in sync with new email
      const passwordAccount = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) =>
          q.eq("userId", userId).eq("provider", "password")
        )
        .first();
      if (passwordAccount) {
        await ctx.db.patch(passwordAccount._id, {
          providerAccountId: newEmail,
        });
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

// Internal mutation to cascade delete user-related docs (called from action)
export const deleteUserCascade = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // 1) Verification codes for each account
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const code of codes) {
        await ctx.db.delete(code._id);
      }
    }

    // 2) Accounts
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }

    // 3) Finally, delete the user
    await ctx.db.delete(args.userId);
  },
});

// Delete user (admin only) — invalidate sessions via official API then cascade delete
export const deleteUser = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "users");
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("Not authenticated");
    }

    // Prevent admin from deleting themselves
    if (currentUserId === args.userId) {
      throw new ConvexError("You cannot delete your own account");
    }

    // 1) Invalidate sessions (official API handles refresh tokens)
    await invalidateSessions(ctx, { userId: args.userId });
    // 2) Cascade delete accounts, codes, and the user
    await ctx.runMutation(internal.domains.users.api.deleteUserCascade, {
      userId: args.userId,
    });

    return { success: true } as const;
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

// Deactivate a user (soft-delete). Admin only.
export const deactivateUser = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAbility(ctx, "write", "users");
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new ConvexError("Not authenticated");
    }
    if (currentUserId === args.userId) {
      throw new ConvexError("You cannot deactivate your own account");
    }

    // Sign out all sessions
    await invalidateSessions(ctx, { userId: args.userId });
    // Set inactive flag
    await ctx.runMutation(internal.domains.users.api.setUserActivation, {
      userId: args.userId,
      isActive: false,
    });
    return { success: true } as const;
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

// Internal mutation to remove existing password account and its verification codes
export const removePasswordAccount = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", args.userId).eq("provider", "password")
      )
      .first();
    if (!existing) return;
    const codes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", existing._id))
      .collect();
    for (const c of codes) {
      await ctx.db.delete(c._id);
    }
    await ctx.db.delete(existing._id);
  },
});

// Reset a user's password (admin only) and invalidate all their sessions.
export const resetPassword = action({
  args: { userId: v.id("users"), newPassword: v.string() },
  handler: async (ctx, { userId, newPassword }) => {
    await requireAbility(ctx, "write", "users");
    if (newPassword.length < 8) {
      throw new ConvexError("Password must be at least 8 characters");
    }

    const user = await ctx.runQuery(
      internal.domains.users.api.getUserByIdInternal,
      { userId }
    );
    if (!user) {
      throw new ConvexError("User not found");
    }
    if (!user.email) {
      throw new ConvexError(
        "User email is required for password authentication"
      );
    }

    // Remove existing password provider account (and its verification codes) to avoid conflicts
    await ctx.runMutation(internal.domains.users.api.removePasswordAccount, {
      userId,
    });

    // Re-create the password account with the same email and the new password
    await createAccount(ctx, {
      provider: "password",
      account: { id: user.email, secret: newPassword },
      profile: { email: user.email, name: user.name, role: user.role },
      shouldLinkViaEmail: true,
      shouldLinkViaPhone: false,
    });

    // Force sign out of all sessions for the target user
    await invalidateSessions(ctx, { userId });

    return { success: true } as const;
  },
});

// Seed initial accounts for admin and user roles.
// Safe to run multiple times; existing users are skipped.
export const seedInitialUsers = action({
  args: {},
  handler: async (ctx) => {
    const PASSWORD = "12345678";
    const targets = [
      { email: "admin@example.com", name: "Admin", role: UserRole.ADMIN },
      { email: "user@example.com", name: "User", role: UserRole.USER },
    ] as const;

    const results: Array<{
      email: string;
      userId: string | null;
      skipped: boolean;
    }> = [];

    for (const t of targets) {
      const existing = await ctx.runQuery(
        internal.domains.users.api.findUserByEmailInternal,
        {
          email: t.email,
        }
      );
      if (existing) {
        results.push({
          email: t.email,
          userId: existing._id as unknown as string,
          skipped: true,
        });
        continue;
      }

      const { user } = await createAccount(ctx, {
        provider: "password",
        account: { id: t.email, secret: PASSWORD },
        profile: { email: t.email, name: t.name, role: t.role },
        shouldLinkViaEmail: false,
        shouldLinkViaPhone: false,
      });
      results.push({
        email: t.email,
        userId: user._id as unknown as string,
        skipped: false,
      });
    }

    return {
      created: results.filter((r) => !r.skipped),
      skipped: results.filter((r) => r.skipped),
    } as const;
  },
});
