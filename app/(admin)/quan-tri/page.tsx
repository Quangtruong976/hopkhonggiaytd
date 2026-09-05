"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

type MemberGroup = {
  id: number;
  name: string;
};

export default function QuanTriPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<MemberGroup[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);

    const [profilesResult, groupsResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, role, is_active"
          )
          .order("full_name"),

        supabase
          .from("member_groups")
          .select("id, name")
          .order("id"),
      ]);

    if (profilesResult.error) {
      console.error(
        "Không thể tải người dùng:",
        profilesResult.error
      );
    } else {
      setProfiles(profilesResult.data || []);
    }

    if (groupsResult.error) {
      console.error(
        "Không thể tải nhóm thành phần:",
        groupsResult.error
      );
    } else {
      setGroups(groupsResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  /*
   * THỐNG KÊ NGƯỜI DÙNG
   */

  const userCount = profiles.length;

  const activeCount = profiles.filter(
    (item) => item.is_active
  ).length;

  const adminCount = profiles.filter(
    (item) => item.role === "admin"
  ).length;

  const delegateCount = profiles.filter(
    (item) => item.role === "delegate"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100">

      {/* HEADER */}

      <header className="border-b border-slate-300 bg-white">

        <div className="mx-auto max-w-6xl px-6 py-3.5">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-4">

              <div>


                <h1 className="mt-0.5 text-2xl font-bold text-emerald-900">
                  Thiết lập hệ thống
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Quản lý người dùng, thành phần và dữ liệu nền.
                </p>

              </div>

            </div>

            <Link
  href="/quan-tri/tai-khoan"
  className="hidden cursor-pointer items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 transition hover:bg-emerald-100 sm:flex"
>

  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
    👤
  </div>

  <div className="text-right">

    <div className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
      Khu vực
    </div>

    <div className="mt-0.5 text-sm font-semibold text-emerald-900">
      Quản trị viên
    </div>

  </div>

</Link>
          </div>

        </div>

      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-6xl px-3 py-3">

        {/* TỔNG QUAN */}

        <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">

          <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">

            <div className="flex items-center gap-3">

              <div>
                <h2 className="text-base font-bold text-slate-900">
                <span className="text-emerald-600">👤 </span>
                  Tổng quan người dùng
                </h2>

                <p className="text-xs text-slate-500">
                  Tình trạng người dùng và dữ liệu hệ thống
                </p>
              </div>

            </div>

          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 sm:divide-y-0">

            {/* QUẢN TRỊ */}

            <div className="p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-700">
                  🔑
                </div>

                <div>
                  <div className="text-xs text-slate-500">
                    Quản trị viên
                  </div>

                  <div className="text-xl font-bold text-slate-900">
                    {loading ? "—" : adminCount}
                  </div>

                  <div className="text-[11px] text-slate-400">
                    người
                  </div>
                </div>

              </div>

            </div>

            {/* ĐIỀU HÀNH */}

            

            {/* NGƯỜI DÙNG */}

            <div className="p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  👥
                </div>

                <div>
                  <div className="text-xs text-slate-500">
                    Người dùng
                  </div>

                  <div className="text-xl font-bold text-slate-900">
                    {loading ? "—" : userCount}
                  </div>

                  <div className="text-[11px] text-slate-400">
                    tài khoản
                  </div>
                </div>

              </div>

            </div>

            {/* HOẠT ĐỘNG */}

            <div className="p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  ●
                </div>

                <div>
                  <div className="text-xs text-slate-500">
                    Đang hoạt động
                  </div>

                  <div className="text-xl font-bold text-emerald-700">
                    {loading ? "—" : activeCount}
                  </div>

                  <div className="text-[11px] text-slate-400">
                    người dùng
                  </div>
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* DỮ LIỆU HỆ THỐNG */}

        <section className="mt-3 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">

          <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">

            <div className="flex items-center gap-3">

              <div>

                <h2 className="text-base font-bold text-slate-900">
               
                  Dữ liệu hệ thống
                </h2>

                <p className="text-xs text-slate-500">
                  Các dữ liệu quản trị dùng chung
                </p>

              </div>

            </div>

          </div>

          <div className="divide-y divide-slate-200">

            {/* NGƯỜI DÙNG */}

            <Link
              href="/quan-tri/nguoi-dung"
              className="group flex items-center gap-4 px-5 py-4 transition hover:bg-emerald-50"
            >

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg text-blue-700">
                👤
              </div>

              <div className="min-w-0 flex-1">

                <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                  Người dùng
                </div>

                <div className="mt-0.5 text-xs text-slate-500">
                  Quản lý hồ sơ, tài khoản và trạng thái người dùng.
                </div>

              </div>

              <span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600">
                →
              </span>

            </Link>

            {/* THÀNH PHẦN */}

            <Link
              href="/quan-tri/thanh-phan"
              className="group flex items-center gap-4 px-5 py-4 transition hover:bg-emerald-50"
            >

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg text-emerald-700">
                👥
              </div>

              <div className="min-w-0 flex-1">

                <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                  Thành phần
                </div>

                <div className="mt-0.5 text-xs text-slate-500">
                  Gán người dùng vào các nhóm thành phần phù hợp.
                </div>

              </div>

              <span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600">
                →
              </span>

            </Link>

            {/* NHÓM */}

            <Link
              href="/quan-tri/nhom-thanh-phan"
              className="group flex items-center gap-4 px-5 py-4 transition hover:bg-emerald-50"
            >

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg text-amber-700">
                ⊞
              </div>

              <div className="min-w-0 flex-1">

                <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                  Nhóm thành phần
                </div>

                <div className="mt-0.5 text-xs text-slate-500">
                  Quản lý các nhóm được sử dụng khi tạo cuộc họp.
                </div>

              </div>

              <span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600">
                →
              </span>

            </Link>

            {/* TỔ CHỨC */}

            <Link
              href="/quan-tri/to-chuc"
              className="group flex items-center gap-4 px-5 py-4 transition hover:bg-emerald-50"
            >

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg text-violet-700">
                🏢
              </div>

              <div className="min-w-0 flex-1">

                <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                  Cơ cấu tổ chức
                </div>

                <div className="mt-0.5 text-xs text-slate-500">
                  Quản lý đơn vị, tổ chức và phạm vi hoạt động.
                </div>

              </div>

              <span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600">
                →
              </span>

            </Link>

          </div>

        </section>

        {/* QUYỀN TRUY CẬP */}

        <section className="mt-3 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">

          <div className="border-b border-slate-200 bg-slate-100 px-5 py-4">

            <div className="flex items-center gap-3">

              <div>

                <h2 className="text-base font-bold text-slate-900">
                  Quyền truy cập
                </h2>

                <p className="text-xs text-slate-500">
                  Phân loại tài khoản trong hệ thống
                </p>

              </div>

            </div>

          </div>

          <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">

            {/* QUẢN TRỊ */}

            <div className="flex items-center justify-between px-5 py-4">

              <div className="flex items-center gap-3">

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700">
                  🔑
                </div>

                <span className="text-sm font-medium text-slate-700">
                  Quản trị viên
                </span>

              </div>

              <span className="text-lg font-bold text-slate-900">
                {loading ? "—" : adminCount}
              </span>

            </div>

            {/* ĐIỀU HÀNH */}

            

            {/* ĐẠI BIỂU */}

            <div className="flex items-center justify-between px-5 py-4">

              <div className="flex items-center gap-3">

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  👤
                </div>

                <span className="text-sm font-medium text-slate-700">
                  Đại biểu
                </span>

              </div>

              <span className="text-lg font-bold text-slate-900">
                {loading ? "—" : delegateCount}
              </span>

            </div>

          </div>

        </section>

        {/* NHÓM HIỆN CÓ */}

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-5 py-4">

            <div className="flex items-center gap-3">

            

              <div>

                <h2 className="text-base font-bold text-slate-900">
                  Nhóm thành phần hiện có
                </h2>

                <p className="text-xs text-slate-500">
                  Dữ liệu đang được sử dụng trong hệ thống
                </p>

              </div>

            </div>

            <Link
              href="/quan-tri/nhom-thanh-phan"
              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
            >
              Quản lý
            </Link>

          </div>

          {loading ? (

            <div className="px-5 py-8 text-center text-sm text-slate-500">
              Đang tải dữ liệu...
            </div>

          ) : groups.length === 0 ? (

            <div className="px-5 py-8 text-center text-sm text-slate-500">
              Chưa có nhóm thành phần.
            </div>

          ) : (

            <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">

{groups.map((group, index) => (

<div
  key={group.id}
  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
>

  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold text-amber-700 shadow-sm">
    {index + 1}
  </div>

  <span className="text-sm font-medium text-slate-700">
    {group.name}
  </span>

</div>

))}

            </div>

          )}

        </section>

      </div>

    </main>
  );
}