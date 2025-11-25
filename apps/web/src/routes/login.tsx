import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signIn, workosUser, workosLoading } =
    useAuth();
  const search = Route.useSearch() as { from?: string };

  // Redirect when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = search?.from;
      const to = from === "/users" || from === "/todo" ? from : "/todo";
      navigate({ to });
    }
  }, [isAuthenticated, navigate, search?.from]);

  // Show loading while WorkOS user exists but Convex is syncing
  const showLoading = workosUser && isLoading;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Sign in to your account using WorkOS
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showLoading ? (
              <div className="flex items-center justify-center py-4">
                <Spinner className="size-6" />
              </div>
            ) : (
              <Button
                className="w-full"
                onClick={() => signIn()}
                disabled={workosLoading}
              >
                {workosLoading ? "Loading..." : "Sign in with WorkOS"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
