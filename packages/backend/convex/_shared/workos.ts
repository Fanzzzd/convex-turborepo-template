"use node";

import { WorkOS } from "@workos-inc/node";
import { v } from "convex/values";
import { type ActionCtx, internalAction } from "../_generated/server";

// Verify webhook signature using the official SDK in a Node.js environment
export const verifyWebhook = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
    secret: v.string(),
  },
  handler: async (_ctx: ActionCtx, { payload, signature, secret }) => {
    const workos = new WorkOS(process.env.WORKOS_API_KEY);

    try {
      const event = await workos.webhooks.constructEvent({
        payload: JSON.parse(payload),
        sigHeader: signature,
        secret,
      });
      return event;
    } catch (e) {
      console.error("Webhook verification failed:", e);
      throw new Error("Invalid signature");
    }
  },
});
