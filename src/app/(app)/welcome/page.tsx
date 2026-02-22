import Link from "next/link";
import {
  BookOpen,
  ShoppingCart,
  CalendarDays,
  Settings,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Meal Planner",
    description:
      "Plan your dinners Mon–Sun. Assign recipes, mark nights as leftovers or eating out, and navigate between weeks.",
    href: "/plan",
    status: "live" as const,
    action: "Open Planner",
  },
  {
    icon: BookOpen,
    title: "Recipe Library",
    description:
      "Add recipes manually, import from a URL, or paste from anywhere. Every recipe gets a gluten-free review.",
    href: "/recipes",
    status: "live" as const,
    action: "Browse Recipes",
  },
  {
    icon: ShoppingCart,
    title: "Grocery List",
    description:
      "Auto-generated from your weekly plan. Syncs in real-time so you can both check items off while shopping.",
    href: "/grocery",
    status: "live" as const,
    action: "View Grocery List",
  },
  {
    icon: Settings,
    title: "Pantry Staples",
    description:
      "Mark ingredients you always have on hand. They'll be separated from your grocery list automatically.",
    href: "/settings",
    status: "live" as const,
    action: "Manage Pantry",
  },
];

export default async function WelcomePage() {
  const householdName = process.env.HOUSEHOLD_NAME ?? "your";
  const recipeCount = await prisma.recipe.count();

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center py-4 space-y-2">
        <div className="text-5xl mb-3">🍳</div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Mise</h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
          Your household meal planner — from recipe ideas to grocery list, all in one place.
        </p>
        <p className="text-sm font-medium max-w-xs mx-auto">
          What do you want to eat this week, {householdName} household?
        </p>
      </div>

      {/* Quick start CTA — only shown until the first recipe is added */}
      {recipeCount === 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">Get started</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add your first recipe to kick things off
            </p>
          </div>
          <Link href="/recipes/new">
            <Button size="sm" className="shrink-0 gap-1">
              Add Recipe
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Feature cards */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
          Features
        </p>
        {FEATURES.map(({ icon: Icon, title, description, href, status, action }) => (
          <Card key={title}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg shrink-0 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{title}</span>
                    <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800 border-green-200 border">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                      Live
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                  {href && action && (
                    <Link href={href}>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 mt-2 text-xs font-medium gap-1"
                      >
                        {action}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground pb-2">
        Built for the Stanton household 🏠
      </p>
    </div>
  );
}
