"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const menuItems = [
  {
    href: "/dai-bieu",
    label: "Tổng quan",
    icon: "⌂",
  },
  {
    href: "/dai-bieu/lich-cong-tac",
    label: "Lịch công tác",
    icon: "▣",
  },
  {
    href: "/dai-bieu/phong-hop",
    label: "Phòng họp",
    icon: "▤",
  },
  {
    href: "/dai-bieu/xin-y-kien",
    label: "Xin ý kiến",
    icon: "☑",
  },
];

export default function DaiBieuSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (href === "/dai-bieu") {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/dang-nhap");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-emerald-100 bg-white">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="border-b border-emerald-100 bg-emerald-800 px-4 py-4">

        <div className="flex items-center gap-3">

          {/* LOGO ĐOÀN */}

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">

            <img
              src="/logo-doan.png"
              alt="Logo Đoàn"
              className="h-8 w-8 object-contain"
            />

          </div>

          {/* TÊN HỆ THỐNG */}

          <div className="min-w-0">

            <div className="truncate text-sm font-bold text-white">
              ĐẠI BIỂU
            </div>

            <div className="truncate text-xs text-emerald-100">
              Phòng họp không giấy
            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          MENU
      ===================================================== */}

      <nav className="flex-1 overflow-y-auto px-2 py-4">

        <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
          Hệ thống
        </div>


        <div className="space-y-1">

          {menuItems.map((item) => {

            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-emerald-100 font-semibold text-emerald-800"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
              >

                {/* ICON */}

                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition ${
                    active
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                  }`}
                >
                  {item.icon}
                </span>

                {/* TEXT */}

                <span className="ml-3 truncate">
                  {item.label}
                </span>

              </Link>
            );

          })}

        </div>

      </nav>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="border-t border-emerald-100 bg-slate-50 p-3">

        {/* THÔNG TIN TÀI KHOẢN */}

        <div className="mb-1 flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-slate-600">

          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base">
            👤
          </span>

          <span className="ml-3 font-medium">
            Đại biểu
          </span>

        </div>


        {/* ĐĂNG XUẤT */}

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

    </aside>
  );
}

