"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import type { ClinicUser } from "@/types/database";

interface AppLayoutProps {
  user: ClinicUser;
  children: React.ReactNode;
}

export function AppLayout({ user, children }: AppLayoutProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="pl-0 md:pl-64">
        <div className="p-4 pb-24 md:p-8 md:pb-8">{children}</div>
      </main>
      <MobileNav user={user} onLogout={handleLogout} />
    </div>
  );
}
