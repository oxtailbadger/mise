"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [householdName, setHouseholdName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdName, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Registration failed.");
        setLoading(false);
        return;
      }

      // Auto sign in after successful registration.
      const result = await signIn("credentials", {
        householdName,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Account created but sign-in failed. Please log in manually.");
        router.push("/login");
      } else {
        router.push("/welcome");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-1 pb-4">
          <div className="text-4xl mb-2">🍳</div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Create your household
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set a name and password for your household.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="householdName">Household name</Label>
              <Input
                id="householdName"
                type="text"
                placeholder="e.g. Smith"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create household"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Already have one?{" "}
              <a href="/login" className="text-primary underline underline-offset-2">
                Sign in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
