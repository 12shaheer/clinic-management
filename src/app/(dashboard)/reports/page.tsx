import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { ReportsClient } from "@/components/reports/reports-client";

export default async function ReportsPage() {
  const auth = await getAuthUser();

  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

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
