import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function requireAdmin() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dang-nhap");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !profile.is_active ||
    profile.role !== "admin"
  ) {
    redirect("/dang-nhap");
  }

  return {
    user,
    profile,
  };
}

export async function requireDelegate() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dang-nhap");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !profile.is_active ||
    profile.role !== "delegate"
  ) {
    redirect("/dang-nhap");
  }

  return {
    user,
    profile,
  };
}

