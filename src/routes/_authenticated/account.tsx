import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient, useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

function AccountPage() {
  const { data: session, refetch } = useSession();
  const user = session?.user;

  const [name, setName] = useState(user?.name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) return null;

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty");
      return;
    }

    setSavingProfile(true);
    const res = await authClient.updateUser({ name: trimmed });
    setSavingProfile(false);

    if (res.error) {
      toast.error(res.error.message ?? "Failed to update profile");
      return;
    }

    await refetch();
    toast.success("Profile updated");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    const res = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    });
    setSavingPassword(false);

    if (res.error) {
      toast.error(res.error.message ?? "Failed to change password");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile details and password.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account details and role.</CardDescription>
          </CardHeader>
          <form onSubmit={(e) => void handleProfileSubmit(e)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account-name">Name</Label>
                <Input
                  id="account-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-email">Email</Label>
                <Input id="account-email" type="email" value={user.email} disabled />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Role</span>
                <span className="font-mono font-medium uppercase text-foreground">
                  {String((user as { role?: string }).role ?? "user")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Email status</span>
                <span className="font-medium text-foreground">
                  {user.emailVerified ? "Verified" : "Unverified"}
                </span>
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save changes"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Update the password used to sign in.</CardDescription>
          </CardHeader>
          <form onSubmit={(e) => void handlePasswordSubmit(e)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <PasswordInput
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? "Updating..." : "Update password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
