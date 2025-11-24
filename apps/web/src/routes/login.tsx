import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth as useWorkOSAuth } from "@workos-inc/authkit-react";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth as useConvexAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});

function LoginComponent() {
  const navigate = useNavigate();
  const {
    user: workosUser,
    signIn,
    isLoading: workosLoading,
  } = useWorkOSAuth();
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const search = Route.useSearch() as { from?: string };
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (workosUser) {
      if (isAuthenticated) {
        const fallback = "/users";
        type KnownTo = "/" | "/login" | "/users" | "/todo" | "/403";
        const isKnownTo = (p: unknown): p is KnownTo =>
          typeof p === "string" &&
          ["/", "/login", "/users", "/todo", "/403"].includes(p);
        const to = isKnownTo(search?.from) ? search.from : fallback;
        navigate({ to });
      } else if (!convexLoading) {
        setShowError(true);
      }
    }
  }, [workosUser, isAuthenticated, convexLoading, navigate, search?.from]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm space-y-4">
        {showError && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>
              Your account was not found in the system. Please contact an
              administrator.
            </span>
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Sign in to your account using WorkOS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => signIn()}
              disabled={workosLoading}
            >
              {workosLoading ? "Loading..." : "Sign in with WorkOS"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
