import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import ReactDOM from "react-dom/client";
import { Spinner } from "./components/ui/spinner";
import { authClient } from "./lib/auth-client";
import { routeTree } from "./routeTree.gen";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
  {
    // Optionally pause queries until the user is authenticated
    expectAuth: true,
  }
);

const router = createRouter({
  routeTree: routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => (
    <div className="flex h-full items-center justify-center pt-8">
      <Spinner className="size-6" />
    </div>
  ),
  context: {
    convex,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function AuthReadyRouter() {
  const { isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <AuthReadyRouter />
    </ConvexBetterAuthProvider>
  );
}

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
