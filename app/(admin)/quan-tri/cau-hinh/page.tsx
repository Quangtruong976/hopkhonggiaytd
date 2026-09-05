"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
type SystemSettings = {
  id: number;
  system_name: string;
  organization_name: string;
  logo_url: string | null;
  primary_color: string;
  is_active: boolean;
};

type SystemModule = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function CauHinhPage() {
  // =========================
  // CẤU HÌNH CHUNG
  // =========================

  const [settings, setSettings] =
    useState<SystemSettings | null>(null);

  const [systemName, setSystemName] = useState("");
  const [organizationName, setOrganizationName] =
    useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] =
    useState("#047857");
  const [isSystemActive, setIsSystemActive] =
    useState(true);

  // =========================
  // MODULE
  // =========================

  const [modules, setModules] =
    useState<SystemModule[]>([]);

  // =========================
  // TRẠNG THÁI
  // =========================

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] =
    useState(false);
  const [savingModules, setSavingModules] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =========================
  // TẢI DỮ LIỆU
  // =========================

  async function loadData() {
    setLoading(true);
    setError("");

    const [
      settingsResult,
      modulesResult,
    ] = await Promise.all([
      supabase
        .from("system_settings")
        .select(
          "id, system_name, organization_name, logo_url, primary_color, is_active"
        )
        .order("id", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("system_modules")
        .select(
          "id, code, name, description, sort_order, is_active"
        )
        .order("sort_order", {
          ascending: true,
        }),
    ]);

    // =========================
    // CẤU HÌNH CHUNG
    // =========================

    if (settingsResult.error) {
      console.error(
        "LỖI TẢI CẤU HÌNH:",
        settingsResult.error
      );

      setError(
        `Không thể tải cấu hình hệ thống: ${settingsResult.error.message}`
      );
    } else if (settingsResult.data) {
      const data = settingsResult.data;

      setSettings(data);

      setSystemName(
        data.system_name || ""
      );

      setOrganizationName(
        data.organization_name || ""
      );

      setLogoUrl(
        data.logo_url || ""
      );

      setPrimaryColor(
        data.primary_color || "#047857"
      );

      setIsSystemActive(
        data.is_active
      );
    }

    // =========================
    // MODULE
    // =========================

    if (modulesResult.error) {
      console.error(
        "LỖI TẢI MODULE:",
        modulesResult.error
      );

      setError(
        `Không thể tải module hệ thống: ${modulesResult.error.message}`
      );
    } else {
      setModules(
        modulesResult.data || []
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // LƯU CẤU HÌNH CHUNG
  // =========================

  async function saveSettings() {
    if (!settings) return;

    setMessage("");
    setError("");

    if (!systemName.trim()) {
      setError(
        "Vui lòng nhập tên hệ thống."
      );
      return;
    }

    if (!organizationName.trim()) {
      setError(
        "Vui lòng nhập tên cơ quan."
      );
      return;
    }

    setSavingSettings(true);

    try {
      const { data, error } =
        await supabase
          .from("system_settings")
          .update({
            system_name:
              systemName.trim(),

            organization_name:
              organizationName.trim(),

            logo_url:
              logoUrl.trim() || null,

            primary_color:
              primaryColor.trim() ||
              "#047857",

            is_active:
              isSystemActive,

            updated_at:
              new Date().toISOString(),
          })
          .eq("id", settings.id)
          .select()
          .single();

      if (error) {
        console.error(
          "LỖI LƯU CẤU HÌNH:",
          error
        );

        setError(
          `Không thể lưu cấu hình: ${error.message}`
        );

        return;
      }

      setSettings(data);

      setMessage(
        "Đã lưu cấu hình hệ thống thành công."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  // =========================
  // KHÔI PHỤC CẤU HÌNH
  // =========================

  function resetSettings() {
    if (!settings) return;

    setSystemName(
      settings.system_name || ""
    );

    setOrganizationName(
      settings.organization_name || ""
    );

    setLogoUrl(
      settings.logo_url || ""
    );

    setPrimaryColor(
      settings.primary_color ||
        "#047857"
    );

    setIsSystemActive(
      settings.is_active
    );

    setMessage("");
    setError("");
  }

  // =========================
  // BẬT / TẮT MODULE
  // =========================

  function toggleModule(
    moduleId: number
  ) {
    setModules((current) =>
      current.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              is_active:
                !module.is_active,
            }
          : module
      )
    );

    setMessage("");
    setError("");
  }

  // =========================
  // THAY ĐỔI THỨ TỰ
  // =========================

  function changeModuleOrder(
    moduleId: number,
    value: string
  ) {
    const order = Number(value);

    if (
      !Number.isFinite(order) ||
      order < 1
    ) {
      return;
    }

    setModules((current) =>
      current.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              sort_order: order,
            }
          : module
      )
    );

    setMessage("");
    setError("");
  }

  // =========================
  // ĐƯA MODULE LÊN
  // =========================

  function moveModuleUp(
    moduleId: number
  ) {
    const sorted = [...modules].sort(
      (a, b) =>
        a.sort_order -
        b.sort_order
    );

    const index = sorted.findIndex(
      (module) =>
        module.id === moduleId
    );

    if (index <= 0) return;

    const current =
      sorted[index];

    const previous =
      sorted[index - 1];

    const currentOrder =
      current.sort_order;

    const previousOrder =
      previous.sort_order;

    setModules((items) =>
      items.map((module) => {
        if (
          module.id === current.id
        ) {
          return {
            ...module,
            sort_order:
              previousOrder,
          };
        }

        if (
          module.id === previous.id
        ) {
          return {
            ...module,
            sort_order:
              currentOrder,
          };
        }

        return module;
      })
    );

    setMessage("");
    setError("");
  }

  // =========================
  // ĐƯA MODULE XUỐNG
  // =========================

  function moveModuleDown(
    moduleId: number
  ) {
    const sorted = [...modules].sort(
      (a, b) =>
        a.sort_order -
        b.sort_order
    );

    const index = sorted.findIndex(
      (module) =>
        module.id === moduleId
    );

    if (
      index === -1 ||
      index >= sorted.length - 1
    ) {
      return;
    }

    const current =
      sorted[index];

    const next =
      sorted[index + 1];

    const currentOrder =
      current.sort_order;

    const nextOrder =
      next.sort_order;

    setModules((items) =>
      items.map((module) => {
        if (
          module.id === current.id
        ) {
          return {
            ...module,
            sort_order:
              nextOrder,
          };
        }

        if (
          module.id === next.id
        ) {
          return {
            ...module,
            sort_order:
              currentOrder,
          };
        }

        return module;
      })
    );

    setMessage("");
    setError("");
  }

  // =========================
  // LƯU MODULE
  // =========================

  async function saveModules() {
    if (modules.length === 0) {
      setError(
        "Chưa có module hệ thống."
      );
      return;
    }

    setSavingModules(true);
    setMessage("");
    setError("");

    try {
      const sorted = [...modules].sort(
        (a, b) =>
          a.sort_order -
          b.sort_order
      );

      // Chuẩn hóa thứ tự thành
      // 1, 2, 3, 4, 5, 6
      const normalized =
        sorted.map(
          (module, index) => ({
            ...module,
            sort_order:
              index + 1,
          })
        );

      for (const module of normalized) {
        const { error } =
          await supabase
            .from("system_modules")
            .update({
              sort_order:
                module.sort_order,

              is_active:
                module.is_active,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              module.id
            );

        if (error) {
          console.error(
            "LỖI LƯU MODULE:",
            error
          );

          throw error;
        }
      }

      setModules(normalized);

      setMessage(
        "Đã lưu cấu hình module thành công."
      );
    } catch (error) {
      console.error(
        "LỖI LƯU MODULE:",
        error
      );

      setError(
        error instanceof Error
          ? `Không thể lưu module: ${error.message}`
          : "Không thể lưu cấu hình module."
      );
    } finally {
      setSavingModules(false);
    }
  }

  // =========================
  // KHÔI PHỤC MODULE
  // =========================

  async function resetModules() {
    setMessage("");
    setError("");

    const { data, error } =
      await supabase
        .from("system_modules")
        .select(
          "id, code, name, description, sort_order, is_active"
        )
        .order("sort_order", {
          ascending: true,
        });

    if (error) {
      setError(
        `Không thể khôi phục module: ${error.message}`
      );
      return;
    }

    setModules(data || []);

    setMessage(
      "Đã khôi phục cấu hình module chưa lưu."
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}

<header className="border-b border-slate-300 bg-white">

<div className="mx-auto max-w-6xl px-6 py-3.5">

  <div className="flex items-center justify-between">

    <div>

      <h1 className="mt-0.5 text-2xl font-bold text-emerald-900">
        Thiết lập cấu hình hệ thống 
      </h1>

      <p className="mt-1 text-sm text-slate-500">
        Quản lý giao diện, thiết lập các module điều hành
      </p>

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



      <div className="mx-auto max-w-5xl px-6 py-6">

        {/* =========================
            THÔNG BÁO
        ========================= */}

        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
            Đang tải cấu hình hệ thống...
          </div>

        ) : (

          <div className="space-y-5">

            {/* =========================
                1. THÔNG TIN CHUNG
            ========================= */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">

                <h2 className="text-sm font-bold text-slate-900">
                  Thông tin chung
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Các thông tin hiển thị chung trong hệ thống.
                </p>

              </div>

              <div className="space-y-5 p-5">

                <label className="block">

                  <span className="text-sm font-semibold text-slate-700">
                    Tên hệ thống
                  </span>

                  <input
                    type="text"
                    value={systemName}
                    onChange={(event) =>
                      setSystemName(
                        event.target.value
                      )
                    }
                    disabled={savingSettings}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                  />

                </label>

                <label className="block">

                  <span className="text-sm font-semibold text-slate-700">
                    Tên cơ quan
                  </span>

                  <input
                    type="text"
                    value={organizationName}
                    onChange={(event) =>
                      setOrganizationName(
                        event.target.value
                      )
                    }
                    disabled={savingSettings}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                  />

                </label>

                <label className="block">

                  <span className="text-sm font-semibold text-slate-700">
                    Đường dẫn logo
                  </span>

                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(event) =>
                      setLogoUrl(
                        event.target.value
                      )
                    }
                    disabled={savingSettings}
                    placeholder="/logo-doan.png"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Có thể để trống nếu chưa sử dụng logo tùy chỉnh.
                  </p>

                </label>

              </div>

              <div className="flex justify-end border-t border-slate-100 px-5 py-4">

                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={
                    savingSettings ||
                    !systemName.trim() ||
                    !organizationName.trim()
                  }
                  className="cursor-pointer rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {savingSettings
                    ? "Đang lưu..."
                    : "Lưu thông tin"}
                </button>

              </div>

            </section>

            {/* =========================
                2. GIAO DIỆN
            ========================= */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">

                <h2 className="text-sm font-bold text-slate-900">
                  Giao diện hệ thống
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Thiết lập màu chủ đạo sử dụng cho giao diện.
                </p>

              </div>

              <div className="p-5">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">

                  <label className="flex-1">

                    <span className="text-sm font-semibold text-slate-700">
                      Màu chủ đạo
                    </span>

                    <div className="mt-2 flex gap-2">

                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(event) =>
                          setPrimaryColor(
                            event.target.value
                          )
                        }
                        disabled={savingSettings}
                        className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                      />

                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(event) =>
                          setPrimaryColor(
                            event.target.value
                          )
                        }
                        disabled={savingSettings}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />

                    </div>

                  </label>

                  <div
                    className="h-11 rounded-lg px-5 py-3 text-center text-sm font-semibold text-white"
                    style={{
                      backgroundColor:
                        primaryColor,
                    }}
                  >
                    Xem trước
                  </div>

                </div>

              </div>

              <div className="flex justify-end border-t border-slate-100 px-5 py-4">

                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="cursor-pointer rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {savingSettings
                    ? "Đang lưu..."
                    : "Lưu giao diện"}
                </button>

              </div>

            </section>

            {/* =========================
                3. TRẠNG THÁI
            ========================= */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">

                <h2 className="text-sm font-bold text-slate-900">
                  Trạng thái hệ thống
                </h2>

              </div>

              <div className="p-5">

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50">

                  <div>

                    <div className="text-sm font-semibold text-slate-800">
                      Hệ thống đang hoạt động
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Cho phép người dùng truy cập và sử dụng hệ thống.
                    </div>

                  </div>

                  <input
                    type="checkbox"
                    checked={isSystemActive}
                    onChange={(event) =>
                      setIsSystemActive(
                        event.target.checked
                      )
                    }
                    disabled={savingSettings}
                    className="h-5 w-5 cursor-pointer rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                  />

                </label>

              </div>

              <div className="flex justify-end border-t border-slate-100 px-5 py-4">

                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="cursor-pointer rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {savingSettings
                    ? "Đang lưu..."
                    : "Lưu trạng thái"}
                </button>

              </div>

            </section>

            {/* =========================
                4. MODULE HỆ THỐNG
            ========================= */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <h2 className="text-sm font-bold text-slate-900">
                      Module hệ thống
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Quản lý các module được phép sử dụng trong hệ thống.
                    </p>

                  </div>

                  <div className="text-xs text-slate-500">
                    {modules.filter(
                      (module) =>
                        module.is_active
                    ).length}{" "}
                    / {modules.length} đang bật
                  </div>

                </div>

              </div>

              <div className="divide-y divide-slate-100">

                {modules.length === 0 ? (

                  <div className="px-5 py-10 text-center text-sm text-slate-500">
                    Chưa có module hệ thống.
                  </div>

                ) : (

                  [...modules]
                    .sort(
                      (a, b) =>
                        a.sort_order -
                        b.sort_order
                    )
                    .map(
                      (
                        module,
                        index,
                        sortedModules
                      ) => (

                        <div
                          key={module.id}
                          className="px-5 py-4 transition hover:bg-slate-50"
                        >

                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">

                            {/* SỐ THỨ TỰ */}

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                              {index + 1}
                            </div>

                            {/* THÔNG TIN */}

                            <div className="min-w-0 flex-1">

                              <div className="flex flex-wrap items-center gap-2">

                                <span className="text-sm font-bold text-slate-800">
                                  {module.name}
                                </span>

                                <span className="text-[10px] text-slate-400">
                                  {module.code}
                                </span>

                              </div>

                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {module.description ||
                                  "Chưa có mô tả."}
                              </p>

                            </div>

                            {/* TRẠNG THÁI */}

                            <button
                              type="button"
                              onClick={() =>
                                toggleModule(
                                  module.id
                                )
                              }
                              disabled={
                                savingModules
                              }
                              className={`cursor-pointer inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                module.is_active
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >

                              <span
                                className={`h-2 w-2 rounded-full ${
                                  module.is_active
                                    ? "bg-emerald-500"
                                    : "bg-slate-400"
                                }`}
                              />

                              {module.is_active
                                ? "Đang bật"
                                : "Đang tắt"}

                            </button>

                            {/* THỨ TỰ */}

                            <div className="flex shrink-0 items-center gap-1">

                              <button
                                type="button"
                                onClick={() =>
                                  moveModuleUp(
                                    module.id
                                  )
                                }
                                disabled={
                                  savingModules ||
                                  index === 0
                                }
                                className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
                                title="Đưa lên"
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  moveModuleDown(
                                    module.id
                                  )
                                }
                                disabled={
                                  savingModules ||
                                  index ===
                                    sortedModules.length -
                                      1
                                }
                                className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
                                title="Đưa xuống"
                              >
                                ↓
                              </button>

                            </div>

                          </div>

                        </div>

                      )
                    )

                )}

              </div>

              {/* CHÂN MODULE */}

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="text-xs text-slate-400">
                  Thay đổi chỉ có hiệu lực sau khi lưu.
                </div>

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={resetModules}
                    disabled={savingModules}
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Khôi phục
                  </button>

                  <button
                    type="button"
                    onClick={saveModules}
                    disabled={
                      savingModules ||
                      modules.length === 0
                    }
                    className="cursor-pointer rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {savingModules
                      ? "Đang lưu..."
                      : "Lưu module"}
                  </button>

                </div>

              </div>

            </section>

          </div>

        )}

      </div>

    </main>
  );
}
