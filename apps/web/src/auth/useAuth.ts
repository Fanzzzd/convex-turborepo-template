import { api } from "@acme/backend/convex/_generated/api";
import type { Doc } from "@acme/backend/convex/_generated/dataModel";
import {
  type Ability,
  type Action,
  can as canFn,
  type Subject,
} from "@acme/backend/convex/_shared/permissions";
import { useAuth as useWorkOSAuth } from "@workos-inc/authkit-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

/**
 * Unified auth hook combining WorkOS authentication with Convex user storage.
 * Follows official Convex pattern for storing users.
 */
export function useAuth() {
  // WorkOS authentication
  const {
    signIn,
    signOut,
    user: workosUser,
    isLoading: workosLoading,
  } = useWorkOSAuth();

  // Convex authentication state
  const { isLoading: authLoading, isAuthenticated: authReady } =
    useConvexAuth();
  const storeUser = useMutation(api.domains.users.api.store);
  const session = useQuery(api.domains.users.api.current);

  const [isStoring, setIsStoring] = useState(false);

  // Determine if we need to store the user
  const needsStore = authReady && session === null && !isStoring;

  // Store user when authenticated but not yet in DB
  useEffect(() => {
    if (!needsStore) return;

    setIsStoring(true);
    storeUser()
      .catch(console.error)
      .finally(() => setIsStoring(false));
  }, [needsStore, storeUser]);

  // Loading states:
  // 1. Auth system is loading
  // 2. Session query is loading (undefined)
  // 3. User needs to be stored (null but not yet storing)
  // 4. Currently storing
  const isLoading =
    authLoading || session === undefined || needsStore || isStoring;
  const isAuthenticated = !isLoading && !!session?.user;

  const user = session?.user as Doc<"users"> | null;
  const abilities = (session?.abilities ?? []) as Ability[];

  return {
    // Convex user state
    isLoading,
    isAuthenticated,
    currentUser: user,
    abilities,
    can: (action: Action, subject: Subject) =>
      canFn(abilities, action, subject),
    // WorkOS auth actions
    signIn,
    signOut,
    // WorkOS raw state (useful for login page)
    workosUser,
    workosLoading,
  };
}
