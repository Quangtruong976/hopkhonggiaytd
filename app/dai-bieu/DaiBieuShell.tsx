"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DelegateTask = {
  id: number;
  title: string;
  status: string | null;
};

export default function DaiBieuShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [newTaskCount, setNewTaskCount] = useState(0);
  const [newTaskIds, setNewTaskIds] = useState<number[]>([]);

  /* =====================================================
     KIỂM TRA NHIỆM VỤ MỚI
  ====================================================== */

  async function loadNewTaskNotification() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNewTaskCount(0);
      setNewTaskIds([]);
      return;
    }

    const { data, error } = await supabase
      .from("meeting_tasks")
      .select("id, title, status")
      .eq("assignee_id", user.id)
      .neq("status", "Đã hoàn thành")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Lỗi lấy nhiệm vụ của đại biểu:",
        error
      );

      setNewTaskCount(0);
      setNewTaskIds([]);
      return;
    }

    const tasks = (data || []) as DelegateTask[];

    /* ===================================================
       ĐỌC DANH SÁCH NHIỆM VỤ ĐÃ XEM
    =================================================== */

    let viewedTaskIds: number[] = [];

    try {
      const stored = window.localStorage.getItem(
        "dai_bieu_viewed_task_ids"
      );

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          viewedTaskIds = parsed
            .map(Number)
            .filter((id) => Number.isFinite(id));
        }
      }
    } catch (error) {
      console.error(
        "Lỗi đọc nhiệm vụ đã xem:",
        error
      );
    }

    /* ===================================================
       XÁC ĐỊNH NHIỆM VỤ MỚI
    =================================================== */

    const unviewedTasks = tasks.filter(
      (task) => !viewedTaskIds.includes(task.id)
    );

    setNewTaskIds(
      unviewedTasks.map((task) => task.id)
    );

    setNewTaskCount(unviewedTasks.length);
  }

  /* =====================================================
     LOAD KHI SHELL ĐƯỢC MỞ
  ====================================================== */

  useEffect(() => {
    loadNewTaskNotification();
  }, []);

  /* =====================================================
     NHẤP VÀO "NHIỆM VỤ CỦA TÔI"

     Đánh dấu các nhiệm vụ đang báo mới là đã xem
  ====================================================== */

  function openMyTasks() {
    try {
      const stored = window.localStorage.getItem(
        "dai_bieu_viewed_task_ids"
      );

      let viewedTaskIds: number[] = [];

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          viewedTaskIds = parsed
            .map(Number)
            .filter((id) => Number.isFinite(id));
        }
      }

      const mergedIds = Array.from(
        new Set([
          ...viewedTaskIds,
          ...newTaskIds,
        ])
      );

      window.localStorage.setItem(
        "dai_bieu_viewed_task_ids",
        JSON.stringify(mergedIds)
      );

      setNewTaskCount(0);
      setNewTaskIds([]);
    } catch (error) {
      console.error(
        "Lỗi đánh dấu nhiệm vụ đã xem:",
        error
      );
    }

    router.push("/dai-bieu/nhiem-vu");
  }

  /* =====================================================
     ĐĂNG XUẤT
  ====================================================== */

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Lỗi đăng xuất:", error);
      return;
    }

    router.replace("/dang-nhap");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* =====================================================
          SIDEBAR ĐẠI BIỂU
      ====================================================== */}

      <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-emerald-100 bg-white lg:flex">

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="shrink-0 border-b border-emerald-700 bg-emerald-800 px-4 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
              <img
                src="/logo-doan.png"
                alt="Logo Đoàn"
                className="h-8 w-8 object-contain"
              />
            </div>

            <div className="min-w-0">

              <p className="truncate text-sm font-bold text-white">
                ĐẠI BIỂU
              </p>

              <p className="truncate text-xs text-emerald-100">
                Phòng họp không giấy
              </p>

            </div>

          </div>

        </div>


        {/* ===================================================
            THÔNG TIN ĐẠI BIỂU
        =================================================== */}

        <div className="shrink-0 border-b border-emerald-100 px-4 py-4">

          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            Tài khoản
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            Đại biểu
          </p>

        </div>


        {/* ===================================================
            MENU
        =================================================== */}

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-4">

          {/* =================================================
              TRANG CHỦ
          ================================================= */}

          <Link
            href="/dai-bieu"
            className={`group flex cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              pathname === "/dai-bieu"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            }`}
          >

            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition ${
                pathname === "/dai-bieu"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700"
              }`}
            >
              ⌂
            </span>

            <span className="ml-3">
              Tổng quan chung
            </span>

          </Link>


          {/* =================================================
              PHÒNG HỌP
          ================================================= */}

          <Link
            href="/dai-bieu/phong-hop"
            className={`group flex cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              pathname === "/dai-bieu/phong-hop"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            }`}
          >

            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition ${
                pathname === "/dai-bieu/phong-hop"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700"
              }`}
            >
              ▤
            </span>

            <span className="ml-3">
              Phòng họp
            </span>

          </Link>


          {/* =================================================
              LỊCH CÔNG TÁC
          ================================================= */}

          <Link
            href="/dai-bieu/lich-cong-tac"
            className={`group flex cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              pathname === "/dai-bieu/lich-cong-tac"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            }`}
          >

            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition ${
                pathname === "/dai-bieu/lich-cong-tac"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700"
              }`}
            >
              ▣
            </span>

            <span className="ml-3">
              Lịch công tác
            </span>

          </Link>

 {/* =================================================
              XIN Ý KIẾN
          ================================================= */}

<Link
            href="/dai-bieu/xin-y-kien"
            className={`group flex cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              pathname === "/dai-bieu/xin-y-kien"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            }`}
          >

            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition ${
                pathname === "/dai-bieu/xin-y-kien"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700"
              }`}
            >
              ✓
            </span>

            <span className="ml-3">
              Phiếu xin ý kiến
            </span>

          </Link>
          {/* =================================================
              NHIỆM VỤ CỦA TÔI
          ================================================= */}

          <button
            type="button"
            onClick={openMyTasks}
            className={`group relative flex w-full cursor-pointer items-start rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
              pathname === "/dai-bieu/nhiem-vu"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            }`}
          >

            {/* DẤU * KHI CÓ NHIỆM VỤ MỚI */}

            {newTaskCount > 0 && (
              <span
                className="absolute left-1 top-0 text-lg font-bold leading-none text-red-600"
                aria-label="Có nhiệm vụ mới"
              >
                *
              </span>
            )}

            {/* ICON */}

            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition ${
                pathname === "/dai-bieu/nhiem-vu"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700"
              }`}
            >
              📌
            </span>


            {/* NỘI DUNG NÚT */}

            <span className="ml-3 min-w-0">

              <span className="block">
                Nhiệm vụ của tôi
              </span>

              {newTaskCount > 0 && (
                <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-red-600">
                  Bạn có {newTaskCount} nhiệm vụ mới
                </span>
              )}

            </span>

          </button>


         

        </nav>


        {/* =====================================================
            ĐĂNG XUẤT - LUÔN Ở ĐÁY SIDEBAR
        ====================================================== */}

        <div className="shrink-0 border-t border-emerald-100 bg-slate-50 px-2 py-3">

          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700"
          >

            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-base text-slate-500 transition group-hover:bg-red-100 group-hover:text-red-600">
              👤
            </span>

            <span className="ml-3">
              Đăng xuất
            </span>

          </button>

        </div>

      </aside>


      {/* =====================================================
          NỘI DUNG
      ====================================================== */}

      <main className="min-w-0 flex-1">
        {children}
      </main>

    </div>
  );
}

