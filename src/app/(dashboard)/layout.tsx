import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import type { ClinicUser } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: clinicUser, error: dbError } = await supabase
    .from("clinic_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (dbError || !clinicUser) {
    // If user exists in auth but not in clinic_users, show a fallback
    // instead of redirect loop
    const fallbackUser: ClinicUser = {
      id: user.id,
      auth_user_id: user.id,
      name: user.email?.split("@")[0] ?? "User",
      email: user.email ?? "",
      role: "admin",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return <AppLayout user={fallbackUser}>{children}</AppLayout>;
  }

  return <AppLayout user={clinicUser as ClinicUser}>{children}</AppLayout>;
}
