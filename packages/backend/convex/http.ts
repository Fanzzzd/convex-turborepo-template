import type { UserDeletedEvent, UserUpdatedEvent } from "@workos-inc/node";
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

/** Union type for user webhook events we handle */
type WorkOsUserEvent = UserUpdatedEvent | UserDeletedEvent;

const http = httpRouter();

// WorkOS Webhook endpoint for user events
// Configure in WorkOS Dashboard: https://<your-slug>.convex.site/webhooks/workos-users
// Events: user.updated, user.deleted (user.created is ignored - users are created on first login)
http.route({
  path: "/webhooks/workos-users",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.WORKOS_WEBHOOK_SECRET;
    if (!secret) {
      console.error("WORKOS_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Get signature from headers
    const signature = request.headers.get("workos-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    // Get raw body for signature verification
    const rawBody = await request.text();

    try {
      // Verify using the internal action (Node.js env)
      const event = await ctx.runAction(internal._shared.workos.verifyWebhook, {
        payload: rawBody,
        signature,
        secret,
      });

      // Only handle user.updated and user.deleted events
      // (user.created is ignored - users are created on first login to this app)
      if (event.event === "user.updated" || event.event === "user.deleted") {
        const { data } = event as WorkOsUserEvent;

        await ctx.runMutation(internal.domains.users.webhooks.handleUserEvent, {
          event: {
            event: event.event,
            data: {
              id: data.id,
              email: data.email,
              firstName: data.firstName,
              lastName: data.lastName,
              profilePictureUrl: data.profilePictureUrl,
              updatedAt: data.updatedAt,
            },
          },
        });
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response("Invalid request", { status: 400 });
    }
  }),
});

export default http;
