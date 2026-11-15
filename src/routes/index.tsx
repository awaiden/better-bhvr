import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { data: session } = useSession();
  const helloQuery = useQuery({
    queryKey: ["hello"],
    enabled: false,
    queryFn: async () => {
      const res = await api.api.hello.$get();
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">better-bhvr</h1>
        <p className="mt-2 text-muted-foreground">
          Bun + Hono + Vite+ + React + TanStack + Drizzle + Better Auth + shadcn/ui
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hono RPC Test</CardTitle>
          <CardDescription>
            Calls <code>GET /api/hello</code> with end-to-end TypeScript types via TanStack Query.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            onClick={() => void helloQuery.refetch()}
            disabled={helloQuery.isFetching}
          >
            {helloQuery.isFetching ? "Loading..." : "Call /api/hello"}
          </Button>
          {helloQuery.data && (
            <span className="rounded-md bg-muted px-3 py-1.5 font-mono text-sm text-foreground">
              {helloQuery.data.message}
            </span>
          )}
          {session ? (
            <Link to="/dashboard">
              <Button variant="outline">Open Dashboard</Button>
            </Link>
          ) : (
            <Link to="/sign-in">
              <Button variant="outline">Sign in to try Dashboard</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
