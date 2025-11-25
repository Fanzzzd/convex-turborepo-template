import { defineTable } from "convex/server";
import { v } from "convex/values";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

const userRoleValues = v.union(...Object.values(UserRole).map(v.literal));

export const tables = {
  users: defineTable({
    // tokenIdentifier from ctx.auth.getUserIdentity() - includes issuer for safety
    tokenIdentifier: v.string(),
    // workosUserId = identity.subject, used for webhook sync
    workosUserId: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(userRoleValues),
    isActive: v.optional(v.boolean()),
    // Timestamp from WorkOS for conflict resolution
    workosUpdatedAt: v.optional(v.number()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_workos_user_id", ["workosUserId"]),
};
