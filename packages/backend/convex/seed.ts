import { createAccount } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
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
          userId: existing._id ? String(existing._id) : null,
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
        userId: String(user._id),
        skipped: false,
      });
    }

    return {
      created: results.filter((r) => !r.skipped),
      skipped: results.filter((r) => r.skipped),
    } as const;
  },
});
