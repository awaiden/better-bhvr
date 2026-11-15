import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "next-themes";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { signOut, useSession } from "@/lib/auth-client";

import "../styles.css";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-2xl rounded-lg border border-destructive/40 bg-destructive/10 p-6">
        <h1 className="text-lg font-semibold text-destructive">Something went wrong</h1>
        <p className="mt-2 font-mono text-sm text-destructive">
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    </div>
  ),
});

function RootComponent() {
  const { data: session } = useSession();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background text-foreground">
          <header className="border-b border-border">
            <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4 text-sm font-medium">
              <div className="flex items-center gap-6">
                <Link
                  to="/"
                  className="text-muted-foreground transition hover:text-foreground"
                  activeProps={{
                    className: "text-foreground underline underline-offset-4",
                  }}
                >
                  Home
                </Link>
                {session && (
                  <>
                    <Link
                      to="/dashboard"
                      className="text-muted-foreground transition hover:text-foreground"
                      activeProps={{
                        className: "text-foreground underline underline-offset-4",
                      }}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/account"
                      className="text-muted-foreground transition hover:text-foreground"
                      activeProps={{
                        className: "text-foreground underline underline-offset-4",
                      }}
                    >
                      Account
                    </Link>
                  </>
                )}
                <Link
                  to="/about"
                  className="text-muted-foreground transition hover:text-foreground"
                  activeProps={{
                    className: "text-foreground underline underline-offset-4",
                  }}
                >
                  About
                </Link>
                <Link
                  to="/status"
                  className="text-muted-foreground transition hover:text-foreground"
                  activeProps={{
                    className: "text-foreground underline underline-offset-4",
                  }}
                >
                  API Status
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                {session ? (
                  <>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {session.user.email}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => void signOut()}>
                      Sign out
                    </Button>
                  </>
                ) : (
                  <Link to="/sign-in">
                    <Button variant="outline" size="sm">
                      Sign in
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-4xl px-6 py-10">
            <Outlet />
          </main>
          <Toaster />
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
