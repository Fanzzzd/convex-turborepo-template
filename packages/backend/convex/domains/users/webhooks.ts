import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

/** Handle WorkOS user webhook events (user.updated, user.deleted) */
export const handleUserEvent = internalMutation({
  args: {
    event: v.object({
      event: v.string(),
      data: v.object({
        id: v.string(),
        email: v.string(),
        firstName: v.optional(v.union(v.string(), v.null())),
        lastName: v.optional(v.union(v.string(), v.null())),
        profilePictureUrl: v.optional(v.union(v.string(), v.null())),
        updatedAt: v.string(),
      }),
    }),
  },
  handler: async (ctx, { event }) => {
    const { event: eventType, data } = event;

    // Find user by workosUserId
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", data.id))
      .unique();

    if (!user) return; // User not in DB yet, will sync on next login

    const workosUpdatedAt = new Date(data.updatedAt).getTime();

    // Only update if webhook data is newer
    if (user.workosUpdatedAt && workosUpdatedAt <= user.workosUpdatedAt) return;

    if (eventType === "user.updated") {
      await ctx.db.patch(user._id, {
        name:
          [data.firstName, data.lastName].filter(Boolean).join(" ") ||
          undefined,
        email: data.email,
        image: data.profilePictureUrl ?? undefined,
        workosUpdatedAt,
      });
    }

    if (eventType === "user.deleted") {
      await ctx.db.patch(user._id, { isActive: false });
    }
  },
});
