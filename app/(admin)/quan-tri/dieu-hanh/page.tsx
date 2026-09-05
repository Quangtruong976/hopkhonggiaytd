"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SystemModule = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

/* =========================================================
   ICON SVG
   ========================================================= */

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
      <path d="M7 2.5v4M17 2.5v4M3 9h18" />
      <path d="M7.5 13h2M14.5 13h2M7.5 17h2M14.5 17h2" />
    </svg>
  );
}

function MeetingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9h18" />
      <path d="M8 13h8M8 16h5" />
      <path d="M8 2.5v3M16 2.5v3" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <path
        d="M6 3.5h8l4 4v13H6a2 2 0 0 1-2-2v-16a2 2 0 0 1 2-2Z"
      />
      <path d="M14 3.5v5h4" />
      <path d="M8 13h8M8 16.5h6" />
    </svg>
  );
}

function OpinionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <path
        d="M5 4.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
      />
      <path d="M7.5 9h9M7.5 12.5h6" />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="m8 9 1.5 1.5L12 8" />
      <path d="M13.5 9H17M8 14l1.5 1.5L12 13" />
      <path d="M13.5 14H17" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <path d="M4 7h16v13H4z" />
      <path d="M3 4h18v3H3z" />
      <path d="M9 11h6M9 14h6" />
    </svg>
  );
}

/* =========================================================
   ICON THEO MODULE
   ========================================================= */

function ModuleIcon({
  code,
}: {
  code: string;
}) {
  switch (code) {
    case "lich-cong-tac":
      return <CalendarIcon />;

    case "phong-hop":
      return <MeetingIcon />;

    case "xin-y-kien":
      return <OpinionIcon />;

    case "nhiem-vu":
      return <TaskIcon />;

    case "kho-ho-so":
      return <ArchiveIcon />;

    default:
      return <DocumentIcon />;
  }
}

/* =========================================================
   TRANG ĐIỀU HÀNH
   ========================================================= */

export default function DieuHanhPage() {
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  async function loadModules() {
    setLoading(true);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setCurrentUserName(
        profile?.full_name || "Điều hành viên"
      );
    }
    const {
      data,
      error: loadError,
    } = await supabase
      .from("system_modules")
      .select(
        "id, name, code, description, is_active, sort_order"
      )
      .eq("is_active", true)
      .neq("code", "tai-lieu")
      .order("sort_order", {
        ascending: true,
      });

    if (loadError) {
      console.error(
        "LỖI TẢI MODULE ĐIỀU HÀNH:",
        loadError
      );

      setError(
        `Không thể tải module hệ thống: ${loadError.message}`
      );

      setModules([]);
      setLoading(false);

      return;
    }

    setModules(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadModules();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">

      {/* =================================================
          HEADER
      ================================================= */}

<header className="border-b border-emerald-600 bg-emerald-800 text-white">

<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

  <div>

  <h1 className="text-xl font-bold tracking-wide">
              PHÒNG HỌP KHÔNG GIẤY
            </h1>

            <p className="mt-0.5 text-sm text-emerald-100">
              Trang quản lý, điều hành dành cho Quản trị
            </p>

  </div>

  <Link
  href="/quan-tri/tai-khoan"
  className="hidden cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-emerald-700 md:flex"
>
  <div className="text-right">
    <p className="text-[11px] text-emerald-100">
      Xin chào,
    </p>

    <p className="text-sm font-semibold">
      {currentUserName || "Đang tải..."}
    </p>
  </div>

  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0"
      />
    </svg>
  </div>
</Link>


</div>
</header>

      {/* =================================================
          NỘI DUNG
      ================================================= */}

<div className="mx-auto max-w-7xl px-5 py-6">

        {/* LỖI */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* TIÊU ĐỀ */}

        <section>

          <div className="mb-5 flex items-center justify-between">

            <h2 className="text-lg font-bold text-emerald-900">
            <span className="text-amber-500">⚙️ </span>
              Các module điều hành
            </h2>

            <p className="mt-0 text-sm text-slate-400">
              Các module được kích hoạt từ cấu hình hệ thống.
            </p>

          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
              Đang tải dữ liệu...
            </div>
          )}

          {/* =================================================
              KHÔNG CÓ MODULE
          ================================================= */}

          {!loading && modules.length === 0 && !error && (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <DocumentIcon />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-700">
                Chưa có module điều hành
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Hãy vào Quản trị hệ thống → Cấu hình để kích hoạt module.
              </p>

            </div>
          )}

          {/* =================================================
              DANH SÁCH MODULE
          ================================================= */}

          {!loading && modules.length > 0 && (

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* HEADER DANH SÁCH */}

              <div className="hidden border-b border-slate-200 bg-slate-50 px-5 py-3 md:grid md:grid-cols-[64px_minmax(0,1fr)_180px_90px] md:items-center">

                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  STT
                </div>

                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Module
                </div>

                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Trạng thái
                </div>

                <div className="text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Thao tác
                </div>

              </div>

              {/* CÁC DÒNG */}

              <div className="divide-y divide-slate-100">

                {modules.map((module, index) => (

                  <Link
                    key={module.id}
                    href={`/quan-tri/dieu-hanh/${module.code}`}
                    className="group block cursor-pointer px-5 py-4 transition hover:bg-emerald-50/50"
                  >

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[64px_minmax(0,1fr)_180px_90px] md:items-center">

                      {/* STT */}

                      <div className="flex items-center">

                        <span className="text-sm font-semibold text-slate-400">
                          {index + 1}
                        </span>

                      </div>

                      {/* THÔNG TIN MODULE */}

                      <div className="flex min-w-0 items-center gap-4">

                        {/* ICON */}

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100 group-hover:text-emerald-800">

                          <ModuleIcon code={module.code} />

                        </div>

                        {/* TÊN + MÔ TẢ */}

                        <div className="min-w-0">

                          <div className="truncate text-sm font-semibold text-slate-800 group-hover:text-emerald-800">
                            {module.name}
                          </div>

                          <div className="mt-1 truncate text-xs text-slate-500">
                            {module.description ||
                              "Module nghiệp vụ của hệ thống."}
                          </div>

                        </div>

                      </div>

                      {/* TRẠNG THÁI */}

                      <div>

                        <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700">

                          <span className="h-2 w-2 rounded-full bg-emerald-500" />

                          Đang hoạt động

                        </span>

                      </div>

                      {/* THAO TÁC */}

                      <div className="text-left md:text-right">

                        <span className="text-xs font-semibold text-slate-400 transition group-hover:text-emerald-700">

                          Mở module
                          <span className="ml-1">
                            →
                          </span>

                        </span>

                      </div>

                    </div>

                  </Link>

                ))}

              </div>

            </div>

          )}

        </section>

      </div>

    </main>
  );
}
