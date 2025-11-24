import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { UserRole } from "./domains/users/schema";

// Seed the default accounts. Idempotent.
export const init = internalAction({
  // Optional token: if SEED_SECRET is set in Convex env, require a matching token
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const required = process.env.SEED_SECRET;
    if (required && args.token !== required) {
      throw new ConvexError("Forbidden: invalid seed token");
    }
    const PASSWORD = "12345678";
    const targets = [
      { email: "admin@example.com", name: "Admin", role: UserRole.ADMIN },
      { email: "user@example.com", name: "User", role: UserRole.USER },
    ] as const;

    const results: Array<{
      email: string;
      skipped: boolean;
    }> = [];

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

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
          skipped: true,
        });
        continue;
      }

      await auth.api.signUpEmail({
        body: {
          email: t.email,
          password: PASSWORD,
          name: t.name,
        },
        headers,
      });

      // Update role after creation (trigger sets default role)
      const user = await ctx.runQuery(
        internal.domains.users.api.findUserByEmailInternal,
        {
          email: t.email,
        }
      );

      if (user) {
        await ctx.runMutation(
          internal.domains.users.api.internalUpdateUserRole,
          {
            userId: user._id,
            role: t.role,
          }
        );
      }

      results.push({
        email: t.email,
        skipped: false,
      });
    }

    return {
      created: results.filter((r) => !r.skipped),
      skipped: results.filter((r) => r.skipped),
    } as const;
  },
});
