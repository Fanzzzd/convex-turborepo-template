import { api } from "@acme/backend/convex/_generated/api";
import type { Action, Subject } from "@acme/backend/convex/_shared/permissions";
import { can } from "@acme/backend/convex/_shared/permissions";
import { redirect } from "@tanstack/react-router";
import type { ConvexReactClient } from "convex/react";

type GuardArgs = {
  context: { convex: ConvexReactClient };
  location: { href: string };
};

export const guardAbility =
  (subject: Subject, action: Action = "read") =>
  async ({ context, location }: GuardArgs) => {
    const session = await context.convex.query(api.domains.users.api.current);

    const isAuthenticated = !!session?.user;

    if (!isAuthenticated) {
      throw redirect({ to: "/login", search: { from: location.href } });
    }

    const abilities = session?.abilities ?? [];
    const hasPermission = can(abilities, action, subject);
    if (!hasPermission) {
      throw redirect({ to: "/403" });
    }
  };
