"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* =========================================================
   QUẢN TRỊ HỆ THỐNG
========================================================= */

const systemItems = [
  {
    label: "Tổng quan",
    href: "/quan-tri",
    icon: "⌂",
  },
  {
    label: "Người dùng",
    href: "/quan-tri/nguoi-dung",
    icon: "👤",
  },
  {
    label: "Thành phần",
    href: "/quan-tri/thanh-phan",
    icon: "👥",
  },
  {
    label: "Nhóm thành phần",
    href: "/quan-tri/nhom-thanh-phan",
    icon: "🏷",
  },
  {
    label: "Cơ cấu tổ chức",
    href: "/quan-tri/to-chuc",
    icon: "🏢",
  },
  {
    label: "Cấu hình hệ thống",
    href: "/quan-tri/cau-hinh",
    icon: "⚙",
  },
];

/* =========================================================
   ĐIỀU HÀNH
========================================================= */

const operationItems = [
  {
    label: "Tổng quan điều hành",
    href: "/quan-tri/dieu-hanh",
    icon: "▣",
  },
  {
    label: "Lịch công tác",
    href: "/quan-tri/dieu-hanh/lich-cong-tac",
    icon: "📅",
  },
  {
    label: "Phòng họp không giấy",
    href: "/quan-tri/dieu-hanh/phong-hop",
    icon: "🗂",
  },
  {
    label: "Xin ý kiến",
    href: "/quan-tri/dieu-hanh/xin-y-kien",
    icon: "💬",
  },
  {
    label: "Nhiệm vụ",
    href: "/quan-tri/dieu-hanh/nhiem-vu",
    icon: "✓",
  },
  {
    label: "Kho hồ sơ",
    href: "/quan-tri/dieu-hanh/kho-ho-so",
    icon: "🗃",
  },
];

/* =========================================================
   SIDEBAR
========================================================= */

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);

  /* =======================================================
     MENU ĐANG MỞ

     Mặc định:
     - Quản trị hệ thống mở
     - Điều hành đóng
  ======================================================= */

  const [openMenu, setOpenMenu] = useState<
    "system" | "operation"
  >(
    pathname.startsWith("/quan-tri/dieu-hanh")
      ? "operation"
      : "system"
  );

  useEffect(() => {
    if (pathname.startsWith("/quan-tri/dieu-hanh")) {
      setOpenMenu("operation");
    } else if (pathname.startsWith("/quan-tri")) {
      setOpenMenu("system");
    }

    // Đóng menu mobile khi chuyển trang
    setMobileOpen(false);
  }, [pathname]);

  /* =======================================================
     KIỂM TRA MENU ĐANG ACTIVE
  ======================================================= */

  function isActive(href: string) {
    if (
      href === "/quan-tri" ||
      href === "/quan-tri/dieu-hanh"
    ) {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  /* =======================================================
     ĐĂNG XUẤT
  ======================================================= */

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/dang-nhap");
  }

  /* =======================================================
     NỘI DUNG SIDEBAR
  ======================================================= */

  function SidebarContent() {
    return (
      <>
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="border-b border-emerald-100 bg-emerald-800 px-4 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">

              <img
                src="/logo-doan.png"
                alt="Logo Đoàn"
                className="h-8 w-8 object-contain"
              />

            </div>

            <div className="min-w-0">

              <div className="truncate text-sm font-bold text-white">
                QUẢN TRỊ
              </div>

              <div className="truncate text-xs text-emerald-100">
                Phòng họp không giấy
              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            MENU
        ================================================= */}

        <nav className="flex-1 overflow-y-auto px-2 py-4">

          {/* ===============================================
              QUẢN TRỊ HỆ THỐNG
          =============================================== */}

          <div className="mb-1">

            <Link
              href="/quan-tri"
              onClick={() => setOpenMenu("system")}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                openMenu === "system"
                  ? "text-red-700"
                  : "text-emerald-700 hover:bg-emerald-50 hover:text-red-800"
              }`}
            >

              <span className="text-[13px] font-bold uppercase tracking-widest">
                Quản trị hệ thống
              </span>

              <span className="text-xs">
                {openMenu === "system" ? "⌃" : "›"}
              </span>

            </Link>

          </div>

          {/* ===============================================
              NỘI DUNG QUẢN TRỊ HỆ THỐNG
          =============================================== */}

          {openMenu === "system" && (

            <div className="space-y-1">

              {systemItems.map((item) => {

                const active = isActive(item.href);

                return (

                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center rounded-xl px-3 py-1.5 text-sm transition ${
                      active
                        ? "bg-emerald-100 font-semibold text-emerald-800"
                        : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                    }`}
                  >

                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition ${
                        active
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                      }`}
                    >
                      {item.icon}
                    </span>

                    <span className="ml-3">
                      {item.label}
                    </span>

                  </Link>

                );

              })}

            </div>

          )}

          {/* ===============================================
              ĐƯỜNG PHÂN CÁCH
          =============================================== */}

          <div
            className={`${
              openMenu === "system"
                ? "my-4"
                : "my-1"
            } border-t border-slate-100`}
          />

          {/* ===============================================
              ĐIỀU HÀNH
          =============================================== */}

          <div className="mb-1">

            <Link
              href="/quan-tri/dieu-hanh"
              onClick={() => setOpenMenu("operation")}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                openMenu === "operation"
                  ? "text-red-700"
                  : "text-emerald-700 hover:bg-emerald-50 hover:text-red-800"
              }`}
            >

              <span className="text-[13px] font-bold uppercase tracking-widest">
                Điều hành
              </span>

              <span className="text-xs">
                {openMenu === "operation" ? "⌃" : "›"}
              </span>

            </Link>

          </div>

          {/* ===============================================
              NỘI DUNG ĐIỀU HÀNH
          =============================================== */}

          {openMenu === "operation" && (

            <div className="space-y-1">

              {operationItems.map((item) => {

                const active = isActive(item.href);

                return (

                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center rounded-xl px-3 py-1.5 text-sm transition ${
                      active
                        ? "bg-emerald-100 font-semibold text-emerald-800"
                        : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                    }`}
                  >

                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition ${
                        active
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                      }`}
                    >
                      {item.icon}
                    </span>

                    <span className="ml-3">
                      {item.label}
                    </span>

                  </Link>

                );

              })}

            </div>

          )}

        </nav>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="border-t border-emerald-100 bg-slate-50 p-3">

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-700"
          >

            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base">
              ↪
            </span>

            <span className="ml-3 font-medium">
              Đăng xuất
            </span>

          </button>

        </div>
      </>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      {/* =====================================================
          SIDEBAR DESKTOP / IPAD

          md trở lên:
          - Hiển thị Sidebar
          - Giữ nguyên chiều rộng 240px
      ===================================================== */}

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-emerald-100 bg-white md:flex">

        <SidebarContent />

      </aside>


      {/* =====================================================
          NÚT MENU TRÊN ĐIỆN THOẠI

          Chỉ hiển thị dưới md.
      ===================================================== */}

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Mở menu"
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-md md:hidden"
      >
        ☰
      </button>


      {/* =====================================================
          LỚP NỀN KHI MỞ MENU MOBILE
      ===================================================== */}

      {mobileOpen && (

        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/30 md:hidden"
        />

      )}


      {/* =====================================================
          SIDEBAR MOBILE

          Không chiếm chiều rộng nội dung.
          Nằm dạng drawer bên trái.
      ===================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-emerald-100 bg-white shadow-xl transition-transform duration-200 md:hidden ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* Nút đóng */}

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Đóng menu"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-lg text-slate-500 shadow-sm hover:bg-white hover:text-slate-700"
        >
          ×
        </button>

        <SidebarContent />

      </aside>
    </>
  );
}

