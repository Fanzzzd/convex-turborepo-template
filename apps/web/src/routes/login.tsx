import { useAuthActions } from "@convex-dev/auth/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});

function mapAuthErrorToLoginMessage(error: unknown): string {
  const fallback = "Login failed";
  if (!error) return fallback;
  const anyErr = error as { message?: string; code?: string; name?: string };
  const rawMessage = typeof anyErr?.message === "string" ? anyErr.message : "";
  const message = rawMessage.toLowerCase();
  const code = (anyErr?.code ?? "").toString().toLowerCase();

  const invalidCred =
    code.includes("invalid_credentials") ||
    message.includes("invalid email or password") ||
    message.includes("wrong password") ||
    message.includes("incorrect password") ||
    message.includes("user not found") ||
    message.includes("no user") ||
    message.includes("account not found") ||
    (message.includes("invalid") &&
      (message.includes("credential") ||
        message.includes("password") ||
        message.includes("email")));
  if (invalidCred) return "Invalid email or password";

  const rateLimited =
    message.includes("too many") ||
    message.includes("rate limit") ||
    code.includes("rate_limit");
  if (rateLimited) return "Too many attempts, please try again later";

  if (message.includes("network"))
    return "Network error, please try again later";

  return fallback;
}

function LoginComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch() as { from?: string };
  const { signIn } = useAuthActions();
  const { isAuthenticated, firstAccessiblePath } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSignedIn, setJustSignedIn] = useState(false);

  // Redirect after authentication state is confirmed
  useEffect(() => {
    if (justSignedIn && isAuthenticated) {
      (async () => {
        try {
          const fallback = firstAccessiblePath() ?? "/users";
          type KnownTo = "/" | "/login" | "/users" | "/todo" | "/403";
          const isKnownTo = (p: unknown): p is KnownTo =>
            typeof p === "string" &&
            ["/", "/login", "/users", "/todo", "/403"].includes(p);
          const to = isKnownTo(search?.from) ? search.from : fallback;
          navigate({ to });
        } catch {
          navigate({ to: "/users" });
        }
      })();
    }
  }, [
    justSignedIn,
    isAuthenticated,
    navigate,
    search?.from,
    firstAccessiblePath,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signIn("password", {
        email,
        password,
        flow: "signIn",
      });

      // Mark as signed in to trigger the useEffect
      setJustSignedIn(true);
      // Note: isLoading stays true until navigation happens
    } catch (err) {
      console.error("[Login] signIn error", err);
      setError(mapAuthErrorToLoginMessage(err));
      setIsLoading(false);
      setJustSignedIn(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Login to your account</CardTitle>
            <CardDescription>
              Enter your email below to login to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup className="gap-4">
                <Field data-invalid={!!error}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    required
                    disabled={isLoading}
                    aria-invalid={!!error}
                    autoComplete="email"
                  />
                  {error && <FieldError>{error}</FieldError>}
                </Field>
                <Field data-invalid={!!error}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    required
                    disabled={isLoading}
                    aria-invalid={!!error}
                    autoComplete="current-password"
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
