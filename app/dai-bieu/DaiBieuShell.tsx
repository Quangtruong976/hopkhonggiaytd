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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    ====================================================== */

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
     ĐÓNG MENU MOBILE KHI CHUYỂN TRANG
  ====================================================== */

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  /* =====================================================
     NHIỆM VỤ CỦA TÔI
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

    setMobileMenuOpen(false);

    router.replace("/dang-nhap");
    router.refresh();
  }

  /* =====================================================
     SIDEBAR CONTENT
  ====================================================== */

  function SidebarContent() {
    return (
      <>
        {/* =================================================
            HEADER SIDEBAR
        ================================================= */}

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


        {/* =================================================
            THÔNG TIN ĐẠI BIỂU
        ================================================= */}

        <div className="shrink-0 border-b border-emerald-100 px-4 py-4">

          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            Tài khoản
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            Đại biểu
          </p>

        </div>


        {/* =================================================
            MENU
        ================================================= */}

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-4">

          {/* =================================================
              TỔNG QUAN
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

            <span className="ml-3 min-w-0">
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

            <span className="ml-3 min-w-0">
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

            <span className="ml-3 min-w-0">
              Lịch công tác
            </span>

          </Link>


          {/* =================================================
              PHIẾU XIN Ý KIẾN
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

            <span className="ml-3 min-w-0">
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

            {newTaskCount > 0 && (
              <span
                className="absolute left-1 top-0 text-lg font-bold leading-none text-red-600"
                aria-label="Có nhiệm vụ mới"
              >
                *
              </span>
            )}

            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition ${
                pathname === "/dai-bieu/nhiem-vu"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700"
              }`}
            >
              📌
            </span>

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


        {/* =================================================
            ĐĂNG XUẤT
        ================================================= */}

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
      </>
    );
  }


  /* =====================================================
     RENDER
  ====================================================== */

  return (
    <div className="flex min-h-screen min-w-0 bg-slate-100">

      {/* =================================================
          SIDEBAR DESKTOP + IPAD NGANG
          
          lg = từ 1024px trở lên
      ================================================= */}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-emerald-100 bg-white lg:flex">

        <SidebarContent />

      </aside>


      {/* =================================================
          THANH HEADER MOBILE / IPAD DỌC
          
          Hiển thị dưới lg.
          
          Đây là phần người dùng sẽ luôn nhìn thấy
          trên điện thoại.
      ================================================= */}

      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center border-b border-emerald-700 bg-emerald-800 px-3 shadow-sm lg:hidden">

        {/* NÚT ☰ */}

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Mở menu Đại biểu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-xl text-white transition hover:bg-emerald-600"
        >
          ☰
        </button>


        {/* LOGO */}

        <div className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">

          <img
            src="/logo-doan.png"
            alt="Logo Đoàn"
            className="h-7 w-7 object-contain"
          />

        </div>


        {/* TIÊU ĐỀ */}

        <div className="ml-2 min-w-0">

          <p className="truncate text-sm font-bold text-white">
            ĐẠI BIỂU
          </p>

          <p className="truncate text-[10px] text-emerald-100">
            Phòng họp không giấy
          </p>

        </div>

      </header>


      {/* =================================================
          LỚP NỀN MOBILE
      ================================================= */}

      {mobileMenuOpen && (

        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        />

      )}


      {/* =================================================
          SIDEBAR MOBILE + IPAD DỌC
      ================================================= */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-emerald-100 bg-white shadow-2xl transition-transform duration-200 lg:hidden ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* NÚT ĐÓNG */}

        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Đóng menu Đại biểu"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-xl text-slate-500 shadow-sm hover:text-slate-700"
        >
          ×
        </button>

        <SidebarContent />

      </aside>


      {/* =================================================
          NỘI DUNG

          Trên mobile/iPad dọc:
          chừa 56px phía trên cho mobile header.
      ================================================= */}

      <main className="min-w-0 flex-1 pt-14 lg:pt-0">

        {children}

      </main>

    </div>
  );
}

