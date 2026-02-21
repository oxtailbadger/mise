import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
