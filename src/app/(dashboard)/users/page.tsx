import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function UsersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("clinic_users")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">Manage clinic staff accounts</p>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        {users && users.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium capitalize text-primary-700">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{format(new Date(user.created_at), "MMM d, yyyy")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
