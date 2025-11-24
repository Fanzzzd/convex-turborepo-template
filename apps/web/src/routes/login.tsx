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
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});

function LoginComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch() as { from?: string };
  const { isAuthenticated, firstAccessiblePath } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const fallback = firstAccessiblePath() ?? "/users";
      type KnownTo = "/" | "/login" | "/users" | "/todo" | "/403";
      const isKnownTo = (p: unknown): p is KnownTo =>
        typeof p === "string" &&
        ["/", "/login", "/users", "/todo", "/403"].includes(p);
      const to = isKnownTo(search?.from) ? search.from : fallback;
      navigate({ to });
    }
  }, [isAuthenticated, navigate, search?.from, firstAccessiblePath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name,
        });
        if (error) throw error;
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error) throw error;
      }
      // Success - the useEffect will handle redirect once isAuthenticated becomes true
    } catch (err) {
      console.error("[Login] error", err);
      setError(err instanceof Error ? err.message : "Authentication failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {isSignUp ? "Create an account" : "Login to your account"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Enter your details below to create your account"
                : "Enter your email below to login to your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup className="gap-4">
                {isSignUp && (
                  <Field data-invalid={!!error}>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </Field>
                )}
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
                    autoComplete="email"
                  />
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
                    autoComplete={
                      isSignUp ? "new-password" : "current-password"
                    }
                  />
                </Field>

                {error && <FieldError>{error}</FieldError>}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Loading..." : isSignUp ? "Sign Up" : "Login"}
                </Button>

                <div className="text-center text-sm">
                  <button
                    type="button"
                    className="underline hover:text-primary"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                    }}
                  >
                    {isSignUp
                      ? "Already have an account? Login"
                      : "Don't have an account? Sign Up"}
                  </button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
