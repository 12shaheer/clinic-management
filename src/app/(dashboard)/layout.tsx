import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import type { ClinicUser } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthUser();

  if (!auth) {
    redirect("/login");
  }

  const user: ClinicUser = auth.clinicUser ?? {
    id: auth.authUser.id,
    auth_user_id: auth.authUser.id,
    name: auth.authUser.email?.split("@")[0] ?? "User",
    email: auth.authUser.email ?? "",
    role: "admin",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return <AppLayout user={user}>{children}</AppLayout>;
}
