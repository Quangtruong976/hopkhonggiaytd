"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    checkLogin();
  }, []);

  async function checkLogin() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      router.replace("/quan-tri");
    } else {
      router.replace("/dang-nhap");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" />

        <p className="text-sm text-slate-500">
          Đang kiểm tra đăng nhập...
        </p>
      </div>
    </main>
  );
}