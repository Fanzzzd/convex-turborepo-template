import { api } from "@acme/backend/convex/_generated/api";
import type { Ability } from "@acme/backend/convex/_shared/permissions";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const session = await context.convex.query(
      api.domains.users.api.getCurrentUserWithAbilities
    );
    const to = getDefaultPath(session?.abilities);
    throw redirect({ to });
  },
  component: () => null,
});

function getDefaultPath(
  abilities: Iterable<Ability> | null | undefined
): "/users" | "/todo" | "/login" {
  if (!abilities) return "/login";
  const readable = new Set<string>();
  for (const [action, subject] of abilities) {
    if (action === "read") readable.add(subject);
  }
  const order: Array<{
    subject: string;
    path: Exclude<ReturnType<typeof getDefaultPath>, "/login">;
  }> = [
    { subject: "users", path: "/users" },
    { subject: "todo", path: "/todo" },
  ];
  for (const { subject, path } of order) {
    if (readable.has(subject)) return path;
  }
  return "/login";
}
