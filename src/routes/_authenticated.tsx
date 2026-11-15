import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && !session) {
      void navigate({ to: "/sign-in" });
    }
  }, [isPending, session, navigate]);

  if (isPending) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Checking session...</div>
    );
  }

  if (!session) {
    return null;
  }

  return <Outlet />;
}
