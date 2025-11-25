import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getDefaultPath } from "@/auth/getDefaultPath";
import { useAuth } from "@/auth/useAuth";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/callback")({
  component: CallbackComponent,
});

function CallbackComponent() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, abilities } = useAuth();

  useEffect(() => {
    // Wait for auth to complete
    if (isLoading) return;

    const to = isAuthenticated ? getDefaultPath(abilities) : "/login";
    navigate({ to, replace: true });
  }, [isAuthenticated, isLoading, abilities, navigate]);

  return (
    <div className="flex h-svh items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}
