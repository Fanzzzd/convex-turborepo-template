import { api } from "@acme/backend/convex/_generated/api";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getDefaultPath } from "@/auth/getDefaultPath";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const session = await context.convex.query(api.domains.users.api.current);
    const to = getDefaultPath(session?.abilities);
    throw redirect({ to });
  },
  component: () => null,
});
