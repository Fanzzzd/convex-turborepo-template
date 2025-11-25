import type { Ability } from "@acme/backend/convex/_shared/permissions";

export type DefaultPath = "/users" | "/todo" | "/login";

/**
 * Determines the default path based on user abilities.
 * Returns the first accessible route in priority order, or "/login" if not authenticated.
 */
export function getDefaultPath(
  abilities: Iterable<Ability> | null | undefined
): DefaultPath {
  if (!abilities) return "/login";

  const readable = new Set<string>();
  for (const [action, subject] of abilities) {
    if (action === "read") readable.add(subject);
  }

  // Route priority order - first match wins
  const routes: Array<{ subject: string; path: Exclude<DefaultPath, "/login"> }> = [
    { subject: "users", path: "/users" },
    { subject: "todo", path: "/todo" },
  ];

  for (const { subject, path } of routes) {
    if (readable.has(subject)) return path;
  }

  return "/login";
}

