import {
  type AuthFunctions,
  createClient,
  type GenericCtx,
} from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { UserRole } from "./domains/users/schema";

const siteUrl = process.env.SITE_URL;
if (!siteUrl) {
  throw new Error("SITE_URL environment variable is not set");
}

const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, doc) => {
        const existing = await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", doc.email))
          .unique();

        if (!existing) {
          await ctx.db.insert("users", {
            name: doc.name,
            email: doc.email,
            image: doc.image ?? undefined,
            role: UserRole.USER,
            isActive: true,
            emailVerificationTime: doc.emailVerified ? Date.now() : undefined,
          });
        }
      },
      onUpdate: async (ctx, newDoc, oldDoc) => {
        const user = await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", oldDoc.email))
          .unique();

        if (user) {
          await ctx.db.patch(user._id, {
            name: newDoc.name,
            email: newDoc.email,
            image: newDoc.image ?? undefined,
            emailVerificationTime: newDoc.emailVerified
              ? Date.now()
              : undefined,
          });
        }
      },
    },
  },
});

const triggerFunctions = authComponent.triggersApi();

export const onCreate = triggerFunctions.onCreate;
export const onUpdate = triggerFunctions.onUpdate;
export const onDelete = triggerFunctions.onDelete;

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false }
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [crossDomain({ siteUrl }), convex()],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
