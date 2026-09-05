"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
type MemberGroup = {
  id: number;
  name: string;
  description: string | null;
};

export default function NhomThanhPhanPage() {
  const [groups, setGroups] = useState<MemberGroup[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // =========================
  // TẢI DANH SÁCH NHÓM
  // =========================

  async function loadGroups() {
    setLoading(true);
    setError("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    console.log("=================================");
    console.log("KIỂM TRA SUPABASE AUTH");
    console.log("AUTH USER ID:", session?.user?.id);
    console.log("AUTH EMAIL:", session?.user?.email);
    console.log("SESSION ERROR:", sessionError);
    console.log("=================================");

    if (sessionError) {
      console.error(
        "LỖI LẤY SESSION:",
        JSON.stringify(sessionError, null, 2)
      );

      setError("Không thể kiểm tra phiên đăng nhập.");
      setGroups([]);
      setLoading(false);
      return;
    }

    if (!session?.user) {
      setError(
        "Không có phiên đăng nhập Supabase. Vui lòng đăng nhập lại."
      );

      setGroups([]);
      setLoading(false);
      return;
    }

    // =========================
    // TẢI DỮ LIỆU MEMBER_GROUPS
    // =========================

    const { data, error } = await supabase
      .from("member_groups")
      .select("id, name, description")
      .order("id");

    console.log("=================================");
    console.log("KẾT QUẢ TẢI MEMBER_GROUPS");
    console.log("DATA:", data);
    console.log(
      "ERROR:",
      error ? JSON.stringify(error, null, 2) : null
    );
    console.log("=================================");

    if (error) {
      console.error(
        "LỖI TẢI NHÓM THÀNH PHẦN:",
        JSON.stringify(error, null, 2)
      );

      setError(
        `Không thể tải danh sách nhóm thành phần. ${
          error.message || ""
        }`
      );

      setGroups([]);
    } else {
      setGroups(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadGroups();
  }, []);

  // =========================
  // RESET FORM
  // =========================

  function resetForm() {
    setName("");
    setDescription("");
    setEditingId(null);
  }

  // =========================
  // THÊM / SỬA NHÓM
  // =========================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Vui lòng nhập tên nhóm thành phần.");
      return;
    }

    // =========================
    // KIỂM TRA SESSION
    // =========================

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    console.log(
      "SUBMIT - AUTH USER ID:",
      session?.user?.id
    );

    if (sessionError) {
      console.error(
        "SUBMIT - SESSION ERROR:",
        JSON.stringify(sessionError, null, 2)
      );
    }

    if (!session?.user) {
      setError(
        "Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại."
      );
      return;
    }

    setSaving(true);

    try {
      // =========================
      // SỬA NHÓM
      // =========================

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from("member_groups")
          .update({
            name: trimmedName,
            description: trimmedDescription || null,
          })
          .eq("id", editingId);

        if (updateError) {
          console.error(
            "LỖI CẬP NHẬT NHÓM:",
            JSON.stringify(updateError, null, 2)
          );

          throw updateError;
        }

        setMessage("Đã cập nhật nhóm thành phần.");
      }

      // =========================
      // THÊM NHÓM
      // =========================

      else {
        const { error: insertError } = await supabase
          .from("member_groups")
          .insert({
            name: trimmedName,
            description: trimmedDescription || null,
          });

        if (insertError) {
          console.error(
            "LỖI THÊM NHÓM:",
            JSON.stringify(insertError, null, 2)
          );

          throw insertError;
        }

        setMessage("Đã thêm nhóm thành phần.");
      }

      resetForm();

      await loadGroups();
    } catch (err) {
      console.error(
        "LỖI TRONG handleSubmit:",
        JSON.stringify(err, null, 2)
      );

      if (
        err &&
        typeof err === "object" &&
        "message" in err
      ) {
        setError(
          String(
            (
              err as {
                message?: string;
              }
            ).message
          )
        );
      } else {
        setError(
          "Không thể lưu nhóm thành phần."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // BẮT ĐẦU SỬA
  // =========================

  function handleEdit(group: MemberGroup) {
    setEditingId(group.id);
    setName(group.name);
    setDescription(group.description || "");

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =========================
  // XÓA NHÓM
  // =========================

  async function handleDelete(group: MemberGroup) {
    setMessage("");
    setError("");

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa nhóm "${group.name}" không?`
    );

    if (!confirmed) return;

    // =========================
    // KIỂM TRA SESSION
    // =========================

    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log(
      "DELETE - AUTH USER ID:",
      session?.user?.id
    );

    if (!session?.user) {
      setError(
        "Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại."
      );
      return;
    }

    setSaving(true);

    try {
      // =========================
      // KIỂM TRA NHÓM ĐANG ĐƯỢC SỬ DỤNG
      // =========================

      const {
        count,
        error: countError,
      } = await supabase
        .from("group_members")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("group_id", group.id);

      if (countError) {
        console.error(
          "LỖI KIỂM TRA NHÓM:",
          JSON.stringify(countError, null, 2)
        );

        throw countError;
      }

      if ((count || 0) > 0) {
        setError(
          `Không thể xóa "${group.name}" vì nhóm đang được sử dụng cho ${count} người dùng. Hãy bỏ phân nhóm trước.`
        );

        return;
      }

      // =========================
      // XÓA NHÓM
      // =========================

      const { error: deleteError } = await supabase
        .from("member_groups")
        .delete()
        .eq("id", group.id);

      if (deleteError) {
        console.error(
          "LỖI XÓA NHÓM:",
          JSON.stringify(deleteError, null, 2)
        );

        throw deleteError;
      }

      setMessage("Đã xóa nhóm thành phần.");

      if (editingId === group.id) {
        resetForm();
      }

      await loadGroups();
    } catch (err) {
      console.error(
        "LỖI TRONG handleDelete:",
        JSON.stringify(err, null, 2)
      );

      if (
        err &&
        typeof err === "object" &&
        "message" in err
      ) {
        setError(
          String(
            (
              err as {
                message?: string;
              }
            ).message
          )
        );
      } else {
        setError(
          "Không thể xóa nhóm thành phần."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">

      {/* HEADER */}

<header className="border-b border-slate-300 bg-white">

<div className="mx-auto max-w-6xl px-6 py-3.5">

  <div className="flex items-center justify-between">

    <div>

      <h1 className="mt-0.5 text-2xl font-bold text-emerald-900">
        Thiết lập nhóm thành phần người dùng
      </h1>

      <p className="mt-1 text-sm text-slate-500">
        Quản lý người dùng thuộc các nhóm thành phần của hệ thống.
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



      <div className="mx-auto max-w-6xl px-6 py-6">

        {/* THÔNG BÁO */}

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

        {/* FORM */}

        <section className="rounded-2xl border border-slate-300 bg-white shadow-sm">

          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">

            <h2 className="text-base font-bold text-slate-900">
              {editingId !== null
                ? "Sửa nhóm thành phần"
                : "Thêm nhóm thành phần"}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {editingId !== null
                ? "Cập nhật thông tin nhóm."
                : "Tạo nhóm mới để sử dụng khi phân nhóm người dùng."}
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="p-5"
          >

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Tên nhóm
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Ví dụ: Ban Thường vụ Tỉnh đoàn"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Mô tả
                </label>

                <input
                  type="text"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Mô tả ngắn về nhóm"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

            </div>

            <div className="mt-4 flex items-center justify-end gap-2">

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Đang lưu..."
                  : editingId !== null
                    ? "Lưu thay đổi"
                    : "Thêm nhóm"}
              </button>

            </div>

          </form>

        </section>

        {/* DANH SÁCH */}

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">

            <div>
              <h2 className="text-base font-bold text-slate-900">
                Danh sách nhóm thành phần
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Có {groups.length} nhóm trong hệ thống.
              </p>
            </div>

            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              {groups.length} nhóm
            </div>

          </div>

          {loading ? (

            <div className="px-5 py-12 text-center text-sm text-slate-500">
              Đang tải dữ liệu...
            </div>

          ) : groups.length === 0 ? (

            <div className="px-5 py-12 text-center">

              <div className="text-3xl text-slate-300">
                ♧
              </div>

              <p className="mt-3 text-sm font-medium text-slate-600">
                Chưa có nhóm thành phần
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Hãy thêm nhóm đầu tiên ở phía trên.
              </p>

            </div>

          ) : (

            <div className="divide-y divide-slate-200">

              {groups.map((group, index) => (

                <div
                  key={group.id}
                  className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                >

                  {/* STT */}

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500">
                    {index + 1}
                  </div>

                  {/* THÔNG TIN */}

                  <div className="min-w-0 flex-1">

                    <div className="text-sm font-bold text-slate-900">
                      {group.name}
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {group.description ||
                        "Chưa có mô tả."}
                    </p>

                  </div>

                  {/* THAO TÁC */}

                  <div className="flex shrink-0 items-center gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(group)
                      }
                      disabled={saving}
                      className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                    >
                      ✎ Sửa
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(group)
                      }
                      disabled={saving}
                      className="cursor-pointer rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      🗑 Xóa
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

        {/* GHI CHÚ */}

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
          <strong>Lưu ý:</strong> Nhóm thành phần là dữ liệu nền
          dùng để phân loại người dùng. Sau khi tạo nhóm, trang
          <strong> Thành phần </strong>
          sẽ sử dụng các nhóm này để gán người dùng vào một hoặc
          nhiều nhóm.
        </div>

      </div>

    </main>
  );
}