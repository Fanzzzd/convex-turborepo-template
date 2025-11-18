# Convex Functions

## HTTP Endpoints

### POST /resend-webhook

Webhook endpoint for Resend email events.

## Environment Variables

Environment variables are set via Convex Dashboard or CLI, not in `.env` file.

Required variables:
- `RESEND_API_KEY` - Resend API key (automatically read by `@convex-dev/resend` component)
- `RESEND_FROM_EMAIL` - Default sender email (e.g., "DMS <noreply@yourdomain.com>")
- `RESEND_WEBHOOK_SECRET` - Webhook secret for signature verification

## Setup

1. Set environment variables via Convex Dashboard or CLI:
   ```bash
   npx convex env set RESEND_API_KEY "your-api-key"
   npx convex env set RESEND_FROM_EMAIL "DMS <noreply@yourdomain.com>"
   npx convex env set RESEND_WEBHOOK_SECRET "your-webhook-secret"
   ```

2. Verify your domain in [Resend Dashboard](https://resend.com/domains)
