import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ClinicUser } from "@/types/database";

export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: clinicUser } = await supabase
    .from("clinic_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return {
    authUser: user,
    clinicUser: clinicUser as ClinicUser | null,
    isAdmin: clinicUser?.role === "admin",
  };
});
