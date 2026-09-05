"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function DangNhapPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const cleanUsername =
        username.trim();

      /*
       * KIỂM TRA DỮ LIỆU NHẬP
       */

      if (!cleanUsername) {
        setError(
          "Vui lòng nhập tên đăng nhập."
        );

        return;
      }

      if (!password) {
        setError(
          "Vui lòng nhập mật khẩu."
        );

        return;
      }

      /*
       * =====================================================
       * BƯỚC 1
       * TÌM EMAIL TỪ USERNAME
       * =====================================================
       */

      const {
        data: loginEmail,
        error: emailError,
      } = await supabase.rpc(
        "get_login_email",
        {
          p_username: cleanUsername,
        }
      );

      if (emailError) {
        setError(
          "Không thể xác định tài khoản. Vui lòng thử lại."
        );
      
        return;
      }

      /*
       * RPC có thể trả về:
       *
       * - string email
       * - null
       */

      if (
        !loginEmail ||
        typeof loginEmail !== "string"
      ) {
        setError(
          "Tên đăng nhập không tồn tại hoặc tài khoản đã bị khóa."
        );

        return;
      }

      /*
       * =====================================================
       * BƯỚC 2
       * ĐĂNG NHẬP SUPABASE AUTH
       * =====================================================
       */

      const {
        data: authData,
        error: loginError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: loginEmail,
            password,
          }
        );

        if (loginError) {
          setError(
            "Tên đăng nhập hoặc mật khẩu không đúng."
          );
        
          return;
        }

      /*
       * Không có user
       */

      if (!authData.user) {
        setError(
          "Không xác định được tài khoản đăng nhập."
        );

        return;
      }

      /*
       * =====================================================
       * BƯỚC 3
       * LẤY PROFILE
       *
       * Chỉ thực hiện SAU KHI đăng nhập thành công.
       * Không thực hiện trong Proxy.
       * =====================================================
       */

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, username, email, full_name, role, is_active"
        )
        .eq(
          "id",
          authData.user.id
        )
        .maybeSingle();

      if (profileError) {
        console.error(
          "profile error:",
          profileError
        );

        await supabase.auth.signOut();

        setError(
          "Đăng nhập thành công nhưng không thể tải thông tin tài khoản."
        );

        return;
      }

      /*
       * Không tìm thấy profile
       */

      if (!profile) {
        await supabase.auth.signOut();

        setError(
          "Tài khoản chưa được cấu hình trong hệ thống."
        );

        return;
      }

      /*
       * =====================================================
       * BƯỚC 4
       * KIỂM TRA TRẠNG THÁI
       * =====================================================
       */

      if (!profile.is_active) {
        await supabase.auth.signOut();

        setError(
          "Tài khoản đã bị khóa."
        );

        return;
      }

      /*
       * =====================================================
       * BƯỚC 5
       * ĐIỀU HƯỚNG THEO QUYỀN
       * =====================================================
       */

      if (profile.role === "admin") {
        router.replace("/quan-tri");
        return;
      }

      if (profile.role === "delegate") {
        router.replace("/dai-bieu");
        return;
      }

      /*
       * Vai trò không hợp lệ
       */

      await supabase.auth.signOut();

      setError(
        "Tài khoản chưa được cấp quyền truy cập hệ thống."
      );
    } catch (err) {
      console.error(
        "LOGIN UNEXPECTED ERROR:",
        err
      );

      setError(
        "Không thể đăng nhập lúc này. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">

      <div className="w-full max-w-md">

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">

          {/* LOGO */}

          <div className="mb-2 flex justify-center">

          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white">
  <img
    src="/logo-doan.png"
    alt="Logo Đoàn TNCS Hồ Chí Minh"
    className="h-20 w-20 object-contain"
  />
</div>

          </div>

          {/* TIÊU ĐỀ */}

          <div className="text-center">

          <h1 className="text-2xl font-bold text-emerald-800">
              Phòng họp không giấy
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Hệ thống điều hành nội bộ Tỉnh đoàn
            </p>

          </div>

          {/* FORM */}

          <form
            onSubmit={handleLogin}
            className="mt-8 space-y-5"
          >

            {/* USERNAME */}

            <div>

              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Tên đăng nhập
              </label>

              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
              />

            </div>

            {/* PASSWORD */}

            <div>

              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Mật khẩu
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
              />

            </div>

            {/* ERROR */}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Đang đăng nhập..."
                : "Đăng nhập"}
            </button>

          </form>

        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Phòng họp không giấy • Tỉnh đoàn
        </p>

      </div>

    </main>
  );
}

