import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
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
    // KIỂM TRA DỮ LIỆU
    // =========================

    if (!username?.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Vui lòng nhập mật khẩu." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "Mật khẩu phải có ít nhất 6 ký tự.",
        },
        { status: 400 }
      );
    }

    if (!full_name?.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập họ và tên." },
        { status: 400 }
      );
    }

    // =========================
    // CHUẨN HÓA
    // =========================

    const trimmedUsername = username.trim();
    const trimmedEmail = email?.trim() || null;
    const trimmedFullName = full_name.trim();
    const trimmedPosition = position?.trim() || null;
    const trimmedOrganization =
      organization?.trim() || null;

    const selectedRole =
      role === "admin" || role === "delegate"
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
          error: "Tên đăng nhập đã tồn tại.",
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
            error: "Không thể kiểm tra email.",
          },
          { status: 500 }
        );
      }

      if (existingEmail) {
        return NextResponse.json(
          {
            error: "Email đã được sử dụng.",
          },
          { status: 400 }
        );
      }
    }

    // =========================
    // EMAIL CHO SUPABASE AUTH
    // =========================

    const authEmail =
      trimmedEmail ||
      `${trimmedUsername}@no-email.local`;

    // =========================
    // TẠO AUTH USER
    // =========================

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username: trimmedUsername,
          full_name: trimmedFullName,
        },
      });

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
          error: "Không tạo được tài khoản Auth.",
        },
        { status: 500 }
      );
    }

    // =========================
    // TẠO PROFILE
    // =========================

    const {
      data: profileData,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        username: trimmedUsername,
        email: trimmedEmail,
        full_name: trimmedFullName,
        position: trimmedPosition,
        organization: trimmedOrganization,
        role: selectedRole,
        is_active: true,
      })
      .select()
      .single();

    // =========================
    // NẾU TẠO PROFILE THẤT BẠI
    // → XÓA AUTH USER
    // =========================

    if (profileError) {
      console.error(
        "LỖI TẠO PROFILE:",
        profileError
      );

      await supabaseAdmin.auth.admin.deleteUser(
        authData.user.id
      );

      return NextResponse.json(
        {
          error:
            "Không thể tạo hồ sơ người dùng.",
          details: profileError.message,
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
        message: "Đã tạo tài khoản người dùng.",
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

// ======================================================
// CẬP NHẬT NGƯỜI DÙNG
// ======================================================

export async function PATCH(request: Request) {
  try {
    // =========================
    // KIỂM TRA PHIÊN ĐĂNG NHẬP
    // =========================

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Bạn chưa đăng nhập.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization
      .replace("Bearer ", "")
      .trim();

    const {
      data: authUserData,
      error: authUserError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authUserError || !authUserData.user) {
      return NextResponse.json(
        {
          error:
            "Phiên đăng nhập không hợp lệ.",
        },
        { status: 401 }
      );
    }

    // =========================
    // KIỂM TRA QUYỀN ADMIN
    // =========================

    const {
      data: currentAdmin,
      error: currentAdminError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", authUserData.user.id)
      .single();

    if (
      currentAdminError ||
      !currentAdmin ||
      currentAdmin.role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Bạn không có quyền thực hiện thao tác này.",
        },
        { status: 403 }
      );
    }

    if (currentAdmin.is_active === false) {
      return NextResponse.json(
        {
          error:
            "Tài khoản quản trị đang bị khóa.",
        },
        { status: 403 }
      );
    }

    // =========================
    // NHẬN DỮ LIỆU
    // =========================

    const body = await request.json();

    const {
      userId,
      username,
      password,
      email,
      full_name,
      position,
      organization,
      role,
    } = body;

    if (!userId) {
      return NextResponse.json(
        {
          error: "Thiếu ID người dùng.",
        },
        { status: 400 }
      );
    }

    if (!full_name?.trim()) {
      return NextResponse.json(
        {
          error: "Vui lòng nhập họ và tên.",
        },
        { status: 400 }
      );
    }

    if (!username?.trim()) {
      return NextResponse.json(
        {
          error: "Vui lòng nhập tên đăng nhập.",
        },
        { status: 400 }
      );
    }

    // =========================
    // KIỂM TRA USERNAME
    // Không cho trùng với người khác
    // =========================

    const trimmedUsername = username.trim();

    const {
      data: existingUsername,
      error: usernameError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", trimmedUsername)
      .neq("id", userId)
      .maybeSingle();

    if (usernameError) {
      console.error(
        "LỖI KIỂM TRA USERNAME KHI SỬA:",
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
          error: "Tên đăng nhập đã tồn tại.",
        },
        { status: 400 }
      );
    }

    // =========================
    // CHUẨN HÓA
    // =========================

    const trimmedEmail =
      email?.trim() || null;

    const trimmedFullName =
      full_name.trim();

    const trimmedPosition =
      position?.trim() || null;

    const trimmedOrganization =
      organization?.trim() || null;

    const selectedRole =
      role === "admin" || role === "delegate"
        ? role
        : "delegate";

    // =========================
    // KIỂM TRA EMAIL
    // =========================

    if (trimmedEmail) {
      const {
        data: existingEmail,
        error: emailError,
      } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", trimmedEmail)
        .neq("id", userId)
        .maybeSingle();

      if (emailError) {
        console.error(
          "LỖI KIỂM TRA EMAIL KHI SỬA:",
          emailError
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
            error: "Email đã được sử dụng.",
          },
          { status: 400 }
        );
      }
    }

    // =========================
    // CẬP NHẬT PROFILE
    // =========================

    const {
      data: updatedProfile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        username: trimmedUsername,
        email: trimmedEmail,
        full_name: trimmedFullName,
        position: trimmedPosition,
        organization: trimmedOrganization,
        role: selectedRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (profileError) {
      console.error(
        "LỖI CẬP NHẬT PROFILE:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Không thể cập nhật thông tin người dùng.",
          details: profileError.message,
        },
        { status: 500 }
      );
    }

    // =========================
    // CẬP NHẬT MẬT KHẨU NẾU CÓ NHẬP
    // =========================

    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json(
          {
            error:
              "Mật khẩu mới phải có ít nhất 6 ký tự.",
          },
          { status: 400 }
        );
      }

      const {
        error: passwordError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            password,
          }
        );

      if (passwordError) {
        console.error(
          "LỖI CẬP NHẬT MẬT KHẨU:",
          passwordError
        );

        return NextResponse.json(
          {
            error:
              passwordError.message ||
              "Không thể cập nhật mật khẩu.",
          },
          { status: 500 }
        );
      }
    }

    // =========================
    // THÀNH CÔNG
    // =========================

    return NextResponse.json({
      success: true,
      message: password?.trim()
        ? "Đã cập nhật thông tin và mật khẩu người dùng."
        : "Đã cập nhật thông tin người dùng.",
      user: updatedProfile,
    });
  } catch (error) {
    console.error(
      "LỖI API CẬP NHẬT NGƯỜI DÙNG:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Có lỗi xảy ra khi cập nhật người dùng.",
      },
      { status: 500 }
    );
  }
}