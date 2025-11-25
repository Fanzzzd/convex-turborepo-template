import { createFileRoute } from "@tanstack/react-router";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/callback")({
  component: CallbackComponent,
});

function CallbackComponent() {
  // AuthKitProvider handles the callback logic automatically.
  // We just need to show a loading state while it processes the code.
  return (
    <div className="flex h-svh items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}
