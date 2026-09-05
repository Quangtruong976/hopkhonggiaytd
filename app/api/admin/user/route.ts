import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_ROLES = [
  "admin",
  "delegate",
] as const;

export async function POST(request: Request) {
  try {
    // =========================
    // ĐỌC DỮ LIỆU
    // =========================

    const body = await request.json();

    const {
      username,
      password,
      email,
      full_name,
      position,
      organization,
      role,
    } = body;

    // =========================
    // KIỂM TRA DỮ LIỆU BẮT BUỘC
    // =========================

    if (
      typeof username !== "string" ||
      !username.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Vui lòng nhập tên đăng nhập.",
        },
        { status: 400 }
      );
    }

    if (
      typeof password !== "string" ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "Vui lòng nhập mật khẩu.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Mật khẩu phải có ít nhất 6 ký tự.",
        },
        { status: 400 }
      );
    }

    if (
      typeof full_name !== "string" ||
      !full_name.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Vui lòng nhập họ và tên.",
        },
        { status: 400 }
      );
    }

    // =========================
    // CHUẨN HÓA
    // =========================

    const trimmedUsername =
      username.trim();

    const trimmedFullName =
      full_name.trim();

    const trimmedEmail =
      typeof email === "string" &&
      email.trim()
        ? email.trim().toLowerCase()
        : null;

    const trimmedPosition =
      typeof position === "string" &&
      position.trim()
        ? position.trim()
        : null;

    const trimmedOrganization =
      typeof organization === "string" &&
      organization.trim()
        ? organization.trim()
        : null;

    const selectedRole =
      typeof role === "string" &&
      ALLOWED_ROLES.includes(
        role as (typeof ALLOWED_ROLES)[number]
      )
        ? role
        : "delegate";

    // =========================
    // KIỂM TRA USERNAME
    // =========================

    const {
      data: existingUsername,
      error: usernameError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", trimmedUsername)
      .maybeSingle();

    if (usernameError) {
      console.error(
        "LỖI KIỂM TRA USERNAME:",
        usernameError
      );

      return NextResponse.json(
        {
          error:
            "Không thể kiểm tra tên đăng nhập.",
        },
        { status: 500 }
      );
    }

    if (existingUsername) {
      return NextResponse.json(
        {
          error:
            "Tên đăng nhập đã tồn tại.",
        },
        { status: 400 }
      );
    }

    // =========================
    // KIỂM TRA EMAIL
    // =========================

    if (trimmedEmail) {
      const {
        data: existingEmail,
        error: emailCheckError,
      } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", trimmedEmail)
        .maybeSingle();

      if (emailCheckError) {
        console.error(
          "LỖI KIỂM TRA EMAIL:",
          emailCheckError
        );

        return NextResponse.json(
          {
            error:
              "Không thể kiểm tra email.",
          },
          { status: 500 }
        );
      }

      if (existingEmail) {
        return NextResponse.json(
          {
            error:
              "Email đã được sử dụng.",
          },
          { status: 400 }
        );
      }
    }

    // =========================
    // EMAIL CHO SUPABASE AUTH
    // =========================
    //
    // Supabase Auth yêu cầu email.
    // Nếu người dùng không nhập email,
    // tạo email nội bộ duy nhất.
    //
    // Email này KHÔNG lưu vào profiles.email.
    // =========================

    const authEmail =
      trimmedEmail ||
      `${trimmedUsername.toLowerCase()}@no-email.local`;

    // =========================
    // TẠO TÀI KHOẢN AUTH
    // =========================

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser(
        {
          email: authEmail,
          password,
          email_confirm: true,

          user_metadata: {
            username:
              trimmedUsername,

            full_name:
              trimmedFullName,

            role:
              selectedRole,
          },
        }
      );

    if (authError) {
      console.error(
        "LỖI TẠO AUTH USER:",
        authError
      );

      return NextResponse.json(
        {
          error:
            authError.message ||
            "Không thể tạo tài khoản đăng nhập.",
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        {
          error:
            "Không tạo được tài khoản Auth.",
        },
        { status: 500 }
      );
    }

    const authUserId =
      authData.user.id;

    // =========================
    // TẠO PROFILE
    // =========================

    const {
      data: profileData,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .insert({
          id: authUserId,

          username:
            trimmedUsername,

          email:
            trimmedEmail,

          full_name:
            trimmedFullName,

          position:
            trimmedPosition,

          organization:
            trimmedOrganization,

          role:
            selectedRole,

          is_active: true,
        })
        .select()
        .single();

    // =========================
    // PROFILE LỖI
    // → XÓA AUTH USER
    // =========================

    if (profileError) {
      console.error(
        "LỖI TẠO PROFILE:",
        profileError
      );

      try {
        await supabaseAdmin.auth.admin.deleteUser(
          authUserId
        );
      } catch (rollbackError) {
        console.error(
          "LỖI ROLLBACK AUTH USER:",
          rollbackError
        );
      }

      return NextResponse.json(
        {
          error:
            "Không thể tạo hồ sơ người dùng.",

          details:
            profileError.message,
        },
        { status: 500 }
      );
    }

    // =========================
    // THÀNH CÔNG
    // =========================

    return NextResponse.json(
      {
        success: true,

        message:
          "Đã tạo tài khoản người dùng.",

        user: profileData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "LỖI API TẠO NGƯỜI DÙNG:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Có lỗi xảy ra khi tạo người dùng.",
      },
      { status: 500 }
    );
  }
}