"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
};

export default function QuanTriTaiKhoanPage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =====================================================
     FORM ĐỔI THÔNG TIN ĐĂNG NHẬP
  ====================================================== */

  const [showEditForm, setShowEditForm] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");

  /* =====================================================
     LOAD PROFILE
  ====================================================== */

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");

    try {
      /*
       * 1. XÁC ĐỊNH TÀI KHOẢN ĐANG ĐĂNG NHẬP
       */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "Không xác định được tài khoản đang đăng nhập."
        );
        return;
      }

      /*
       * 2. LẤY PROFILE
       */

      const { data, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, full_name, email, role, is_active"
          )
          .eq("id", user.id)
          .single();

      if (profileError) {
        console.error(
          "Lỗi lấy thông tin tài khoản:",
          profileError
        );

        setProfile({
          id: user.id,
          full_name: null,
          email: user.email || null,
          role: "admin",
          is_active: true,
        });

        setNewEmail(user.email || "");

        return;
      }

      /*
       * Chỉ cho tài khoản quản trị viên sử dụng
       * trang này.
       */

      if (data.role !== "admin") {
        setError(
          "Tài khoản hiện tại không có quyền quản trị."
        );
        return;
      }

      setProfile(data as Profile);

      /*
       * Email của Supabase Auth là thông tin đăng nhập
       * chính xác nhất.
       */

      setNewEmail(
        user.email || data.email || ""
      );
    } catch (error) {
      console.error(error);

      setError(
        "Không thể tải thông tin tài khoản."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     VAI TRÒ
  ====================================================== */

  function getRoleLabel(role: string | null) {
    if (role === "admin") {
      return "Quản trị viên";
    }

    return role || "Chưa xác định";
  }

  /* =====================================================
     TRẠNG THÁI
  ====================================================== */

  function getStatusLabel(
    isActive: boolean | null
  ) {
    if (isActive === false) {
      return "Đang bị khóa";
    }

    return "Đang hoạt động";
  }

  /* =====================================================
     MỞ / ĐÓNG FORM
  ====================================================== */

  function handleOpenEditForm() {
    setShowEditForm((value) => !value);

    setFormError("");
    setSuccessMessage("");
  }

  /* =====================================================
     ĐỔI TÊN ĐĂNG NHẬP
  ====================================================== */

  async function handleChangeEmail() {
    setFormError("");
    setSuccessMessage("");

    if (!profile) {
      return;
    }

    const email = newEmail.trim();

    if (!email) {
      setFormError(
        "Vui lòng nhập tên đăng nhập mới."
      );
      return;
    }

    if (email === profile.email) {
      setFormError(
        "Tên đăng nhập mới phải khác tên đăng nhập hiện tại."
      );
      return;
    }

    setSavingEmail(true);

    try {
      /*
       * Cập nhật email trong Supabase Auth
       */

      const { error } =
        await supabase.auth.updateUser({
          email,
        });

      if (error) {
        console.error(error);

        setFormError(
          `Không thể đổi tên đăng nhập: ${error.message}`
        );

        return;
      }

      /*
       * Cập nhật email trong profiles
       */

      const { error: updateProfileError } =
        await supabase
          .from("profiles")
          .update({
            email,
          })
          .eq("id", profile.id);

      if (updateProfileError) {
        console.warn(
          "Không cập nhật được email trong profiles:",
          updateProfileError
        );
      } else {
        setProfile((current) =>
          current
            ? {
                ...current,
                email,
              }
            : current
        );
      }

      setSuccessMessage(
        "Bạn đã đổi tên đăng nhập thành công. Nếu hệ thống yêu cầu xác nhận tên đăng nhập mới, vui lòng kiểm tra hộp thư."
      );
    } catch (error) {
      console.error(error);

      setFormError(
        "Đã xảy ra lỗi khi đổi tên đăng nhập."
      );
    } finally {
      setSavingEmail(false);
    }
  }

  /* =====================================================
     ĐỔI MẬT KHẨU
  ====================================================== */

  async function handleChangePassword() {
    setFormError("");
    setSuccessMessage("");

    if (!newPassword) {
      setFormError(
        "Vui lòng nhập mật khẩu mới."
      );
      return;
    }

    if (newPassword.length < 6) {
      setFormError(
        "Mật khẩu mới phải có ít nhất 6 ký tự."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError(
        "Mật khẩu xác nhận không khớp."
      );
      return;
    }

    setSavingPassword(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (error) {
        console.error(error);

        setFormError(
          `Không thể đổi mật khẩu: ${error.message}`
        );

        return;
      }

      setSuccessMessage(
        "Bạn đã đổi mật khẩu thành công."
      );

      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(error);

      setFormError(
        "Đã xảy ra lỗi khi đổi mật khẩu."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  /* =====================================================
     RENDER
  ====================================================== */

  return (
    <main className="min-h-screen bg-slate-100">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-300 bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">

          <div>

            <h1 className="text-2xl font-bold text-emerald-900">
              Tài khoản quản trị
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Thông tin và thiết lập tài khoản quản trị hệ thống.
            </p>

          </div>


          <div className="hidden items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 sm:flex">

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

          </div>

        </div>

      </header>


      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="mx-auto max-w-5xl px-6 py-8">

        {/* TIÊU ĐỀ */}

        <div className="mb-6">

          <h2 className="text-lg font-bold text-emerald-900">

            <span className="text-amber-500">
              👤{" "}
            </span>

            Tài khoản Quản trị viên

          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Thông tin tài khoản đang sử dụng trên hệ thống.
          </p>

        </div>


        {/* LỖI */}

        {error && (

          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>

        )}


        {/* LOADING */}

        {loading && (

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">

            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />

            <p className="mt-3 text-sm text-slate-500">
              Đang tải thông tin tài khoản...
            </p>

          </div>

        )}


        {/* =================================================
            THÔNG TIN TÀI KHOẢN
        ================================================== */}

        {!loading && profile && (

          <div className="space-y-5">

            {/* =================================================
                THÔNG TIN QUẢN TRỊ VIÊN
            ================================================== */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">

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
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                      />

                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 20.25a7.5 7.5 0 0 1 15 0"
                      />

                    </svg>

                  </div>

                  <div>

                    <h3 className="text-base font-bold text-slate-900">
                      Thông tin quản trị viên
                    </h3>

                  </div>

                </div>

              </div>


              <div className="divide-y divide-slate-100">

                {/* HỌ VÀ TÊN */}

                <div className="grid gap-2 px-6 py-4 sm:grid-cols-3">

                  <div className="text-sm font-medium text-slate-500">
                    Họ và tên
                  </div>

                  <div className="text-sm font-semibold text-slate-900 sm:col-span-2">
                    {profile.full_name || "Chưa cập nhật"}
                  </div>

                </div>


                {/* TÊN ĐĂNG NHẬP */}

                <div className="grid gap-2 px-6 py-4 sm:grid-cols-3">

                  <div className="text-sm font-medium text-slate-500">
                    Tên đăng nhập
                  </div>

                  <div className="text-sm text-slate-800 sm:col-span-2">
                    {profile.email || "Chưa cập nhật"}
                  </div>

                </div>


                {/* VAI TRÒ */}

                <div className="grid gap-2 px-6 py-4 sm:grid-cols-3">

                  <div className="text-sm font-medium text-slate-500">
                    Vai trò
                  </div>

                  <div className="sm:col-span-2">

                    <span className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      {getRoleLabel(profile.role)}
                    </span>

                  </div>

                </div>


                {/* TRẠNG THÁI */}

                <div className="grid gap-2 px-6 py-4 sm:grid-cols-3">

                  <div className="text-sm font-medium text-slate-500">
                    Trạng thái tài khoản
                  </div>

                  <div className="sm:col-span-2">

                    <span
                      className={`inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        profile.is_active === false
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {getStatusLabel(
                        profile.is_active
                      )}
                    </span>

                  </div>

                </div>

              </div>

            </section>


            {/* =================================================
                NÚT CHỨC NĂNG
            ================================================== */}

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">

              {/* ĐỔI THÔNG TIN */}

              <button
                type="button"
                onClick={handleOpenEditForm}
                className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                {showEditForm
                  ? "Đóng phần thay đổi"
                  : "Đổi thông tin tài khoản đăng nhập"}
              </button>


              {/* VỀ TRANG QUẢN TRỊ */}

              <Link
                href="/quan-tri"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              >
                ← Về trang quản trị
              </Link>

            </div>


            {/* =================================================
                THÔNG BÁO THÀNH CÔNG
            ================================================== */}

            {successMessage && (

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center text-sm font-medium text-emerald-700">
                ✓ {successMessage}
              </div>

            )}


            {/* =================================================
                FORM ĐỔI THÔNG TIN
            ================================================== */}

            {showEditForm && (

              <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">

                <div className="border-b border-emerald-100 bg-emerald-50/50 px-6 py-5">

                  <h3 className="text-base font-bold text-slate-900">
                    Đổi thông tin tài khoản đăng nhập
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Bạn có thể thay đổi tên đăng nhập hoặc mật khẩu.
                    Họ tên và vai trò Quản trị viên không thay đổi tại đây.
                  </p>

                </div>


                <div className="space-y-6 p-6">

                  {/* =================================================
                      ĐỔI TÊN ĐĂNG NHẬP
                  ================================================== */}

                  <div>

                    <label className="text-sm font-semibold text-slate-700">
                      Tên đăng nhập mới
                    </label>

                    <div className="mt-2 flex flex-col gap-3 sm:flex-row">

                      <input
                        type="email"
                        value={newEmail}
                        onChange={(event) =>
                          setNewEmail(
                            event.target.value
                          )
                        }
                        placeholder="Nhập tên đăng nhập mới"
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />

                      <button
                        type="button"
                        onClick={handleChangeEmail}
                        disabled={savingEmail}
                        className="cursor-pointer rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingEmail
                          ? "Đang lưu..."
                          : "Lưu tên đăng nhập"}
                      </button>

                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      Tên đăng nhập được sử dụng khi đăng nhập vào hệ thống.
                    </p>

                  </div>


                  {/* ĐƯỜNG KẺ */}

                  <div className="border-t border-slate-100" />


                  {/* =================================================
                      ĐỔI MẬT KHẨU
                  ================================================== */}

                  <div>

                    <label className="text-sm font-semibold text-slate-700">
                      Mật khẩu mới
                    </label>

                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) =>
                        setNewPassword(
                          event.target.value
                        )
                      }
                      placeholder="Nhập mật khẩu mới"
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />


                    <label className="mt-4 block text-sm font-semibold text-slate-700">
                      Nhập lại mật khẩu mới
                    </label>

                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value
                        )
                      }
                      placeholder="Nhập lại mật khẩu mới"
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />


                    <div className="mt-3 flex justify-end">

                      <button
                        type="button"
                        onClick={handleChangePassword}
                        disabled={savingPassword}
                        className="cursor-pointer rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingPassword
                          ? "Đang lưu..."
                          : "Lưu mật khẩu"}
                      </button>

                    </div>

                  </div>


                  {/* =================================================
                      LỖI FORM
                  ================================================== */}

                  {formError && (

                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {formError}
                    </div>

                  )}

                </div>

              </section>

            )}

          </div>

        )}

      </div>

    </main>
  );
}

