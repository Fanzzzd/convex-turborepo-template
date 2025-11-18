// Unified Action × Subject capability model
// This file is the single source of truth for authorization primitives.
// Frontend and backend should import from here.

export type Action = "read" | "write";
export type Subject = "users" | "todo";
export type Ability = readonly [Action, Subject];

export type Role = "user" | "admin";

// Role → abilities mapping
export const ROLE_ABILITIES: Record<Role, Ability[]> = {
  user: [
    ["read", "todo"],
    ["write", "todo"],
  ],
  admin: [
    ["read", "users"],
    ["write", "users"],
    ["read", "todo"],
    ["write", "todo"],
  ],
};

export function abilitiesFromRoles(
  roles: Role[] | readonly Role[] | null | undefined
): Ability[] {
  if (!roles || roles.length === 0) return [];
  const result: Ability[] = [];
  const seen = new Set<string>();
  for (const role of roles) {
    const abilities = ROLE_ABILITIES[role] ?? [];
    for (const ab of abilities) {
      const key = `${ab[0]}:${ab[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ab);
      }
    }
  }
  return result;
}

export function can(
  abilities: Iterable<Ability> | null | undefined,
  action: Action,
  subject: Subject
): boolean {
  if (!abilities) {
    return false;
  }

  for (const [a, s] of abilities) {
    if (a === action && s === subject) {
      return true;
    }
  }

  return false;
}
