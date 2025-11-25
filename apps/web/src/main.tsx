import { createRouter, RouterProvider } from "@tanstack/react-router";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useCallback, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { Spinner } from "./components/ui/spinner";
import { routeTree } from "./routeTree.gen";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

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

// Custom hook to bridge WorkOS auth with Convex
function useAuthFromWorkOS() {
  const { user, isLoading, getAccessToken } = useAuth();

  const fetchAccessToken = useCallback(
    async (_args: { forceRefreshToken: boolean }) => {
      try {
        const token = await getAccessToken();
        return token ?? null;
      } catch {
        return null;
      }
    },
    [getAccessToken]
  );

  return useMemo(
    () => ({
      isLoading: isLoading ?? false,
      isAuthenticated: !!user,
      fetchAccessToken,
    }),
    [isLoading, user, fetchAccessToken]
  );
}

function App() {
  return (
    <AuthKitProvider
      clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
      redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
    >
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromWorkOS}>
        <RouterProvider router={router} />
      </ConvexProviderWithAuth>
    </AuthKitProvider>
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
