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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: clinicUser } = await supabase
    .from("clinic_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (!clinicUser) {
    redirect("/login");
  }

  return <AppLayout user={clinicUser as ClinicUser}>{children}</AppLayout>;
}
