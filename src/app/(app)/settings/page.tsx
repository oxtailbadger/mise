import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PantryStaplesClient } from "@/components/pantry-staples";

export default function SettingsPage() {
  return (
    <div className="p-4 space-y-5">
      <div>
        <h1 className="text-2xl font-bold leading-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your household preferences</p>
      </div>

      {/* Pantry Staples */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pantry Staples</CardTitle>
          <CardDescription className="text-xs">
            Items you always have on hand. When generating a grocery list, these are moved to a
            &ldquo;Check Pantry First&rdquo; section instead of the main buy list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PantryStaplesClient />
        </CardContent>
      </Card>

      <Separator />

      {/* Sign out */}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button variant="destructive" type="submit" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
