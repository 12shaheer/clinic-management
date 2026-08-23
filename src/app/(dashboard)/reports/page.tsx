import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportsClient } from "@/components/reports/reports-client";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: clinicUser } = await supabase
    .from("clinic_users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!clinicUser || clinicUser.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Generate and email detailed clinic reports.</p>
      </div>
      <ReportsClient />
    </div>
  );
}
