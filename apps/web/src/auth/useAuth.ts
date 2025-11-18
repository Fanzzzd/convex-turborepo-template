import { api } from "@acme/backend/convex/_generated/api";
import type { Doc } from "@acme/backend/convex/_generated/dataModel";
import {
  type Ability,
  type Action,
  can as canFn,
  type Subject,
} from "@acme/backend/convex/_shared/permissions";
import { useQuery } from "convex/react";

type NavigationRoute = "/users" | "/todo" | "/login";

export function useAuth() {
  const session = useQuery(api.domains.users.api.getCurrentUserWithAbilities);

  const isLoading = session === undefined;
  const isAuthenticated = !!session?.user;

  const abilities = session?.abilities ?? ([] as Ability[]);
  const currentUser = (session?.user ?? null) as Doc<"users"> | null;

  const can = (action: Action, subject: Subject) =>
    canFn(abilities, action, subject);

  const firstAccessiblePath = () => resolveFirstAccessiblePath(abilities);

  return {
    isLoading,
    isAuthenticated,
    currentUser,
    abilities,
    can,
    firstAccessiblePath,
  };
}

export function resolveFirstAccessiblePath(
  abilities: Iterable<Ability> | null | undefined
): NavigationRoute {
  if (!abilities) return "/login";
  const readable = new Set<Subject>();
  for (const [action, subject] of abilities) {
    if (action === "read") {
      readable.add(subject);
    }
  }
  const order: Array<{
    subject: Subject;
    path: Exclude<NavigationRoute, "/login">;
  }> = [
    { subject: "users", path: "/users" },
    { subject: "todo", path: "/todo" },
  ];
  for (const { subject, path } of order) {
    if (readable.has(subject)) return path;
  }
  return "/login";
}
