import { Resend } from "@convex-dev/resend";
import { v } from "convex/values";
import { components } from "../../_generated/api";
import { mutation } from "../../_generated/server";

export const resend: Resend = new Resend(components.resend, {
  testMode: process.env.RESEND_TEST_MODE !== "false",
});

function getDefaultFromEmail(): string {
  return (
    (process.env.RESEND_FROM_EMAIL as string) ||
    "DMS <noreply@bielinnotech.com>"
  );
}

export const sendEmail = mutation({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    const emailId = await resend.sendEmail(ctx, {
      from: getDefaultFromEmail(),
      to: args.to,
      subject: args.subject,
      html: args.html,
    });

    return { emailId, success: true } as const;
  },
});
