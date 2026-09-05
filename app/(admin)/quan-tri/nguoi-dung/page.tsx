"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  username: string;
  full_name: string;
  position: string | null;
  organization: string | null;
  role: string;
  is_active: boolean;
  email: string | null;
  member_group: string | null;
  created_at: string;
  updated_at: string;
};

type MemberGroup = {
  id: number;
  name: string;
};

type GroupMember = {
  id: number;
  group_id: number;
  user_id: string;
};

const USERS_PER_PAGE = 10;

export default function NguoiDungPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<MemberGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedUser, setSelectedUser] =
    useState<Profile | null>(null);

  const [editingUser, setEditingUser] =
    useState<Profile | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);

  // =========================
  // FORM
  // =========================

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("delegate");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =========================
  // TẢI DỮ LIỆU
  // =========================

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error("Chưa có phiên đăng nhập.");
      }

      // NGƯỜI DÙNG
      const {
        data: profilesData,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          email,
          full_name,
          position,
          organization,
          role,
          is_active,
          created_at,
          updated_at,
          member_group
        `)
        .order("full_name", {
          ascending: true,
        });

      if (profilesError) {
        console.error(
          "LỖI TẢI NGƯỜI DÙNG:",
          profilesError
        );

        throw profilesError;
      }

      setProfiles(profilesData || []);

      // NHÓM
      const {
        data: groupsData,
        error: groupsError,
      } = await supabase
        .from("member_groups")
        .select("id, name")
        .order("id", {
          ascending: true,
        });

      if (!groupsError) {
        setGroups(groupsData || []);
      }

      // PHÂN NHÓM
      const {
        data: groupMembersData,
        error: groupMembersError,
      } = await supabase
        .from("group_members")
        .select("id, group_id, user_id");

      if (!groupMembersError) {
        setGroupMembers(groupMembersData || []);
      }
    } catch (err) {
      console.error("LỖI loadData:", err);

      if (err instanceof Error) {
        setError(
          `Không thể tải danh sách người dùng: ${err.message}`
        );
      } else {
        setError(
          "Không thể tải danh sách người dùng."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // LỌC
  // =========================

  const filteredProfiles = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return profiles.filter((profile) => {
      const matchSearch =
        !keyword ||
        profile.full_name
          .toLowerCase()
          .includes(keyword) ||
        profile.username
          .toLowerCase()
          .includes(keyword) ||
        profile.email
          ?.toLowerCase()
          .includes(keyword) ||
        profile.position
          ?.toLowerCase()
          .includes(keyword) ||
        profile.organization
          ?.toLowerCase()
          .includes(keyword);

      const matchRole =
        roleFilter === "all" ||
        profile.role === roleFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          profile.is_active) ||
        (statusFilter === "locked" &&
          !profile.is_active);

      return (
        matchSearch &&
        matchRole &&
        matchStatus
      );
    });
  }, [
    profiles,
    search,
    roleFilter,
    statusFilter,
  ]);

  // =========================
  // PHÂN TRANG
  // =========================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredProfiles.length /
        USERS_PER_PAGE
    )
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    roleFilter,
    statusFilter,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [
    currentPage,
    totalPages,
  ]);

  const paginatedProfiles = useMemo(() => {
    const startIndex =
      (currentPage - 1) *
      USERS_PER_PAGE;

    return filteredProfiles.slice(
      startIndex,
      startIndex + USERS_PER_PAGE
    );
  }, [
    filteredProfiles,
    currentPage,
  ]);

  // =========================
  // NHÓM
  // =========================

  function getUserGroups(userId: string) {
    const groupIds = groupMembers
      .filter(
        (item) =>
          item.user_id === userId
      )
      .map(
        (item) => item.group_id
      );

    return groups.filter(
      (group) =>
        groupIds.includes(group.id)
    );
  }

  // =========================
  // RESET FORM
  // =========================

  function resetForm() {
    setEditingUser(null);
    setShowAddForm(false);

    setFullName("");
    setUsername("");
    setPassword("");
    setEmail("");
    setPosition("");
    setOrganization("");
    setRole("delegate");
  }

  // =========================
  // MỞ THÊM
  // =========================

  function openAdd() {
    setEditingUser(null);

    setFullName("");
    setUsername("");
    setPassword("");
    setEmail("");
    setPosition("");
    setOrganization("");
    setRole("delegate");

    setMessage("");
    setError("");

    setShowAddForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =========================
  // MỞ SỬA
  // =========================

  function openEdit(profile: Profile) {
    setEditingUser(profile);
    setShowAddForm(false);

    setFullName(profile.full_name);
    setUsername(profile.username);
    setPassword("");
    setEmail(profile.email || "");
    setPosition(profile.position || "");
    setOrganization(profile.organization || "");
    setRole(profile.role);

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =========================
  // SUBMIT
  // =========================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    const trimmedFullName =
      fullName.trim();

    const trimmedUsername =
      username.trim();

    const trimmedPassword =
      password;

    const trimmedEmail =
      email.trim();

    const trimmedPosition =
      position.trim();

    const trimmedOrganization =
      organization.trim();

    if (!trimmedFullName) {
      setError(
        "Vui lòng nhập họ và tên."
      );
      return;
    }

    if (!trimmedUsername) {
      setError(
        "Vui lòng nhập tên đăng nhập."
      );
      return;
    }

    // =========================
    // THÊM
    // =========================

    if (showAddForm) {
      if (!trimmedPassword) {
        setError(
          "Vui lòng nhập mật khẩu."
        );
        return;
      }

      if (trimmedPassword.length < 6) {
        setError(
          "Mật khẩu phải có ít nhất 6 ký tự."
        );
        return;
      }

      setSaving(true);

      try {
        const response =
          await fetch(
            "/api/quan-tri/nguoi-dung",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                username:
                  trimmedUsername,

                password:
                  trimmedPassword,

                email:
                  trimmedEmail ||
                  null,

                full_name:
                  trimmedFullName,

                position:
                  trimmedPosition ||
                  null,

                organization:
                  trimmedOrganization ||
                  null,

                role,
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Không thể tạo người dùng."
          );
        }

        setMessage(
          "Đã tạo tài khoản người dùng thành công."
        );

        resetForm();

        await loadData();
      } catch (err) {
        console.error(
          "LỖI THÊM NGƯỜI DÙNG:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Không thể tạo người dùng."
        );
      } finally {
        setSaving(false);
      }

      return;
    }

    // =========================
    // SỬA
    // =========================

    if (!editingUser) {
      return;
    }

    setSaving(true);

    try {
      const {
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          username:
            trimmedUsername,

          full_name:
            trimmedFullName,

          email:
            trimmedEmail ||
            null,

          position:
            trimmedPosition ||
            null,

          organization:
            trimmedOrganization ||
            null,

          role,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          editingUser.id
        );

      if (updateError) {
        throw updateError;
      }

      setMessage(
        "Đã cập nhật thông tin người dùng."
      );

      resetForm();

      await loadData();
    } catch (err) {
      console.error(
        "LỖI SỬA NGƯỜI DÙNG:",
        err
      );

      setError(
        "Không thể cập nhật thông tin người dùng."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // KHÓA / MỞ KHÓA
  // =========================

  async function toggleActive(
    profile: Profile
  ) {
    setMessage("");
    setError("");

    const action =
      profile.is_active
        ? "khóa"
        : "mở khóa";

    const confirmed =
      window.confirm(
        `Bạn có chắc muốn ${action} tài khoản "${profile.full_name}" không?`
      );

    if (!confirmed) return;

    setSaving(true);

    try {
      const {
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          is_active:
            !profile.is_active,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          profile.id
        );

      if (updateError) {
        throw updateError;
      }

      setMessage(
        profile.is_active
          ? "Đã khóa tài khoản."
          : "Đã mở khóa tài khoản."
      );

      await loadData();
    } catch (err) {
      console.error(
        "LỖI THAY ĐỔI TRẠNG THÁI:",
        err
      );

      setError(
        "Không thể thay đổi trạng thái tài khoản."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // XÓA
  // =========================

  async function deleteUser(
    profile: Profile
  ) {
    setMessage("");
    setError("");

    if (profile.role === "admin") {
      setError(
        "Không thể xóa tài khoản quản trị viên."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa người dùng "${profile.full_name}" khỏi hồ sơ hệ thống không?\n\nThao tác này không thể hoàn tác.`
      );

    if (!confirmed) return;

    setSaving(true);

    try {
      const {
        error: deleteError,
      } = await supabase
        .from("profiles")
        .delete()
        .eq(
          "id",
          profile.id
        );

      if (deleteError) {
        throw deleteError;
      }

      if (
        selectedUser?.id ===
        profile.id
      ) {
        setSelectedUser(null);
      }

      setMessage(
        "Đã xóa hồ sơ người dùng."
      );

      await loadData();
    } catch (err) {
      console.error(
        "LỖI XÓA NGƯỜI DÙNG:",
        err
      );

      setError(
        "Không thể xóa người dùng."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // CHI TIẾT
  // =========================

  function toggleUser(
    profile: Profile
  ) {
    if (
      selectedUser?.id ===
      profile.id
    ) {
      setSelectedUser(null);
      return;
    }

    setSelectedUser(profile);

    setMessage("");
    setError("");
  }

  // =========================
  // NHÃN VAI TRÒ
  // =========================

  function getRoleLabel(
    userRole: string
  ) {
    if (userRole === "admin") {
      return "Quản trị viên";
    }

    if (userRole === "delegate") {
      return "Đại biểu";
    }

    return userRole;
  }

  // =========================
  // TRANG
  // =========================

  const pageNumbers = Array.from(
    {
      length: totalPages,
    },
    (_, index) =>
      index + 1
  );

  const firstItem =
    filteredProfiles.length === 0
      ? 0
      : (currentPage - 1) *
          USERS_PER_PAGE +
        1;

  const lastItem = Math.min(
    currentPage *
      USERS_PER_PAGE,
    filteredProfiles.length
  );

  return (
    <main className="min-h-screen bg-slate-50">

     {/* =========================
    HEADER
========================= */}

<header className="border-b border-slate-300 bg-white">

<div className="mx-auto max-w-6xl px-6 py-3.5">

  <div className="flex items-center justify-between">

    <div>

      <h1 className="mt-0.5 text-2xl font-bold text-emerald-900">
       Thiết lập tài khoản người dùng
      </h1>

      <p className="mt-1 text-sm text-slate-500">
        Quản lý tài khoản và thông tin người dùng của hệ thống.
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
      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="mx-auto max-w-6xl px-6 py-6">

        {/* =================================================
            THÔNG BÁO
        ================================================= */}

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

        {/* =================================================
            FORM THÊM / SỬA
        ================================================= */}

        {(showAddForm ||
          editingUser) && (

          <section className="mb-5 overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">

              <h2 className="text-base font-bold text-slate-900">

                {showAddForm
                  ? "Thêm người dùng"
                  : "Sửa thông tin người dùng"}

              </h2>

              <p className="mt-0.5 text-xs text-slate-500">

                {showAddForm
                  ? "Tạo tài khoản mới cho người sử dụng hệ thống."
                  : `Cập nhật thông tin tài khoản ${editingUser?.username || ""}.`}

              </p>

            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5"
            >

              <div className="grid gap-4 md:grid-cols-2">

                {/* HỌ TÊN */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Họ và tên
                  </label>

                  <input
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value
                      )
                    }
                    placeholder="Nhập họ và tên"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                </div>

                {/* USERNAME */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Tên đăng nhập
                  </label>

                  <input
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value
                      )
                    }
                    placeholder="Nhập tên đăng nhập"
                    disabled={
                      !!editingUser
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500"
                  />

                </div>

                {/* MẬT KHẨU */}

                {showAddForm && (

                  <div>

                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Mật khẩu
                    </label>

                    <input
                      type="password"
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />

                  </div>

                )}

                {/* EMAIL */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="Có thể để trống"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                </div>

                {/* CHỨC VỤ */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Chức vụ
                  </label>

                  <input
                    value={position}
                    onChange={(event) =>
                      setPosition(
                        event.target.value
                      )
                    }
                    placeholder="Nhập chức vụ"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                </div>

                {/* ĐƠN VỊ */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Đơn vị
                  </label>

                  <input
                    value={organization}
                    onChange={(event) =>
                      setOrganization(
                        event.target.value
                      )
                    }
                    placeholder="Nhập đơn vị"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                </div>

                {/* VAI TRÒ */}

                <div>

                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Vai trò
                  </label>

                  <select
                    value={role}
                    onChange={(event) =>
                      setRole(
                        event.target.value
                      )
                    }
                    className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >

                    <option value="admin">
                      Quản trị viên
                    </option>

                    <option value="delegate">
                      Đại biểu
                    </option>

                  </select>

                </div>

              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {saving
                    ? "Đang lưu..."
                    : showAddForm
                    ? "Tạo người dùng"
                    : "Lưu thay đổi"}

                </button>

              </div>

            </form>

          </section>
        )}

        {/* =================================================
            DANH SÁCH NGƯỜI DÙNG
        ================================================= */}

        <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">

          {/* =================================================
              TIÊU ĐỀ + TÌM KIẾM + THÊM
          ================================================= */}

          <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              {/* TIÊU ĐỀ */}

              <div className="flex items-center justify-between gap-4">

<div>

  <h2 className="text-base font-bold text-slate-900">
    Danh sách người dùng
  </h2>

  <p className="mt-0.5 text-xs text-slate-500">
    Hiển thị tối đa{" "}
    {USERS_PER_PAGE}{" "}
    người dùng mỗi trang.
    Tổng cộng{" "}
    {profiles.length}{" "}
    tài khoản.
  </p>

</div>

<button
  type="button"
  onClick={openAdd}
  className="shrink-0 cursor-pointer rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800"
>
  + Thêm người dùng
</button>

</div>

              {/* BỘ LỌC + THÊM */}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

                {/* TÌM KIẾM */}

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Tìm người dùng..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-64"
                />

                {/* VAI TRÒ */}

                <select
                  value={roleFilter}
                  onChange={(event) =>
                    setRoleFilter(
                      event.target.value
                    )
                  }
                  className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >

                  <option value="all">
                    Tất cả vai trò
                  </option>

                  <option value="admin">
                    Quản trị viên
                  </option>

                  <option value="delegate">
                    Đại biểu
                  </option>

                </select>

                {/* TRẠNG THÁI */}

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >

                  <option value="all">
                    Tất cả trạng thái
                  </option>

                  <option value="active">
                    Hoạt động
                  </option>

                  <option value="locked">
                    Đã khóa
                  </option>

                </select>

                {/* THÊM NGƯỜI DÙNG */}

               

              </div>

            </div>

          </div>

          {/* =================================================
              BẢNG
          ================================================= */}

          {loading ? (

            <div className="px-5 py-12 text-center text-sm text-slate-500">
              Đang tải dữ liệu...
            </div>

          ) : paginatedProfiles.length === 0 ? (

            <div className="px-5 py-12 text-center">

              <div className="text-3xl text-slate-300">
                👤
              </div>

              <p className="mt-3 text-sm font-medium text-slate-600">
                Không tìm thấy người dùng
              </p>

            </div>

          ) : (

            <div className="w-full overflow-hidden">

              <table className="w-full table-fixed border-collapse">

                <thead className="bg-slate-50">

                  <tr className="border-b border-slate-200">

                    <th className="w-10 px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      STT
                    </th>

                    <th className="w-[29%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Người dùng
                    </th>

                    <th className="hidden w-[17%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 md:table-cell">
                      Chức vụ
                    </th>

                    <th className="hidden w-[17%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 lg:table-cell">
                      Đơn vị
                    </th>

                    <th className="w-[15%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Vai trò
                    </th>

                    <th className="hidden w-[14%] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 sm:table-cell">
                      Nhóm
                    </th>

                    <th className="w-[14%] px-2 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Thao tác
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {paginatedProfiles.map(
                    (
                      profile,
                      index
                    ) => {

                      const userGroups =
                        getUserGroups(
                          profile.id
                        );

                      const isSelected =
                        selectedUser?.id ===
                        profile.id;

                      const rowNumber =
                        (currentPage - 1) *
                          USERS_PER_PAGE +
                        index +
                        1;

                      return (

                        <tr
                          key={profile.id}
                          className={`border-b border-slate-100 ${
                            isSelected
                              ? "bg-emerald-50/50"
                              : "hover:bg-slate-50"
                          }`}
                        >

                          {/* STT */}

                          <td className="px-2 py-3 text-center align-top text-xs font-semibold text-slate-400">
                            {rowNumber}
                          </td>

                          {/* NGƯỜI DÙNG */}

                          <td className="px-3 py-3 align-top">

                            <button
                              type="button"
                              onClick={() =>
                                toggleUser(
                                  profile
                                )
                              }
                              className="flex w-full min-w-0 cursor-pointer items-start gap-2 text-left"
                            >

                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm text-emerald-700">
                                👤
                              </div>

                              <div className="min-w-0">

                                <div className="truncate text-sm font-bold text-slate-900">
                                  {
                                    profile.full_name
                                  }
                                </div>

                                <div className="mt-0.5 truncate text-[11px] text-slate-400">
                                  @
                                  {
                                    profile.username
                                  }
                                </div>

                                <span
                                  className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                                    profile.is_active
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-200 text-slate-500"
                                  }`}
                                >
                                  {profile.is_active
                                    ? "Hoạt động"
                                    : "Đã khóa"}
                                </span>

                              </div>

                            </button>

                          </td>

                          {/* CHỨC VỤ */}

                          <td className="hidden px-3 py-3 align-top md:table-cell">

                            <div className="truncate text-sm text-slate-700">
                              {
                                profile.position ||
                                "—"
                              }
                            </div>

                          </td>

                          {/* ĐƠN VỊ */}

                          <td className="hidden px-3 py-3 align-top lg:table-cell">

                            <div className="truncate text-sm text-slate-700">
                              {
                                profile.organization ||
                                "—"
                              }
                            </div>

                          </td>

                          {/* VAI TRÒ */}

                          <td className="px-3 py-3 align-top">

                            <span className="inline-flex max-w-full rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">

                              <span className="truncate">
                                {getRoleLabel(
                                  profile.role
                                )}
                              </span>

                            </span>

                          </td>

                          {/* NHÓM */}

                          <td className="hidden px-3 py-3 align-top sm:table-cell">

                            <div className="flex max-w-full flex-wrap gap-1">

                              {userGroups.length ===
                              0 ? (

                                <span className="text-[11px] italic text-slate-400">
                                  Chưa phân nhóm
                                </span>

                              ) : (

                                <>
                                  {userGroups
                                    .slice(
                                      0,
                                      1
                                    )
                                    .map(
                                      (
                                        group
                                      ) => (
                                        <span
                                          key={
                                            group.id
                                          }
                                          className="max-w-full truncate rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700"
                                        >
                                          {
                                            group.name
                                          }
                                        </span>
                                      )
                                    )}

                                  {userGroups.length >
                                    1 && (

                                    <span
                                      key={`${profile.id}-more-groups`}
                                      className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500"
                                    >
                                      +
                                      {userGroups.length -
                                        1}
                                    </span>

                                  )}

                                </>

                              )}

                            </div>

                          </td>

                          {/* THAO TÁC */}

                          <td className="px-2 py-3 align-top">

                            <div className="flex flex-wrap justify-end gap-1">

                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(
                                    profile
                                  )
                                }
                                disabled={saving}
                                title="Sửa thông tin"
                                className="cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                ✎
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleActive(
                                    profile
                                  )
                                }
                                disabled={saving}
                                title={
                                  profile.is_active
                                    ? "Khóa tài khoản"
                                    : "Mở khóa tài khoản"
                                }
                                className={`cursor-pointer rounded-md px-2 py-1.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                  profile.is_active
                                    ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                {profile.is_active
                                  ? "🔒"
                                  : "🔓"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteUser(
                                    profile
                                  )
                                }
                                disabled={
                                  saving ||
                                  profile.role ===
                                    "admin"
                                }
                                title={
                                  profile.role ===
                                  "admin"
                                    ? "Không thể xóa quản trị viên"
                                    : "Xóa người dùng"
                                }
                                className="cursor-pointer rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                🗑
                              </button>

                            </div>

                          </td>

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </table>

              {/* =================================================
                  CHI TIẾT
              ================================================= */}

              {selectedUser && (

                <div className="border-t border-emerald-200 bg-emerald-50/30 px-4 py-4 sm:px-5">

                  {(() => {

                    const detailGroups =
                      getUserGroups(
                        selectedUser.id
                      );

                    return (

                      <div>

                        <div className="flex items-start justify-between gap-4">

                          <div>

                            <h3 className="text-sm font-bold text-slate-900">
                              Thông tin người dùng
                            </h3>

                            <p className="mt-0.5 text-xs text-slate-500">
                              Chi tiết tài khoản và nhóm thành phần.
                            </p>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedUser(
                                null
                              )
                            }
                            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                          >
                            Thu gọn
                          </button>

                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

                          <div className="rounded-lg bg-white p-3">

                            <div className="text-[10px] font-semibold uppercase text-slate-400">
                              Tên đăng nhập
                            </div>

                            <div className="mt-1 truncate text-sm font-semibold text-slate-800">
                              {
                                selectedUser.username
                              }
                            </div>

                          </div>

                          <div className="rounded-lg bg-white p-3">

                            <div className="text-[10px] font-semibold uppercase text-slate-400">
                              Email
                            </div>

                            <div className="mt-1 truncate text-sm font-semibold text-slate-800">
                              {
                                selectedUser.email ||
                                "—"
                              }
                            </div>

                          </div>

                          <div className="rounded-lg bg-white p-3">

                            <div className="text-[10px] font-semibold uppercase text-slate-400">
                              Chức vụ
                            </div>

                            <div className="mt-1 truncate text-sm font-semibold text-slate-800">
                              {
                                selectedUser.position ||
                                "—"
                              }
                            </div>

                          </div>

                          <div className="rounded-lg bg-white p-3">

                            <div className="text-[10px] font-semibold uppercase text-slate-400">
                              Đơn vị
                            </div>

                            <div className="mt-1 truncate text-sm font-semibold text-slate-800">
                              {
                                selectedUser.organization ||
                                "—"
                              }
                            </div>

                          </div>

                        </div>

                        <div className="mt-3 rounded-lg bg-white p-3">

                          <div className="text-[10px] font-semibold uppercase text-slate-400">
                            Nhóm thành phần
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">

                            {detailGroups.length ===
                            0 ? (

                              <span className="text-xs italic text-slate-400">
                                Chưa phân nhóm
                              </span>

                            ) : (

                              detailGroups.map(
                                (
                                  group
                                ) => (

                                  <span
                                    key={
                                      group.id
                                    }
                                    className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
                                  >
                                    {
                                      group.name
                                    }
                                  </span>

                                )
                              )

                            )}

                          </div>

                        </div>

                      </div>

                    );
                  })()}

                </div>

              )}

            </div>

          )}

          {/* =================================================
              PHÂN TRANG
          ================================================= */}

          {!loading &&
            filteredProfiles.length >
              0 && (

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">

                <div className="text-xs text-slate-500">

                  Hiển thị{" "}

                  <strong className="text-slate-700">
                    {firstItem}
                  </strong>

                  {" – "}

                  <strong className="text-slate-700">
                    {lastItem}
                  </strong>

                  {" / "}

                  <strong className="text-slate-700">
                    {
                      filteredProfiles.length
                    }
                  </strong>

                  {" người dùng"}

                </div>

                <div className="flex items-center justify-center gap-1">

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.max(
                            1,
                            page - 1
                          )
                      )
                    }
                    disabled={
                      currentPage ===
                      1
                    }
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Trước
                  </button>

                  <div className="flex items-center gap-1">

                    {pageNumbers.map(
                      (pageNumber) => (

                        <button
                          key={
                            `page-${pageNumber}`
                          }
                          type="button"
                          onClick={() =>
                            setCurrentPage(
                              pageNumber
                            )
                          }
                          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            currentPage ===
                            pageNumber
                              ? "bg-emerald-700 text-white"
                              : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {
                            pageNumber
                          }
                        </button>

                      )
                    )}

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.min(
                            totalPages,
                            page + 1
                          )
                      )
                    }
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau →
                  </button>

                </div>

              </div>

            )}

        </section>

        {/* =================================================
            GHI CHÚ
        ================================================= */}

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">

          <strong>Lưu ý:</strong>{" "}
          Vai trò tài khoản và nhóm thành phần là hai dữ liệu độc lập.
          Vai trò quyết định quyền sử dụng hệ thống; nhóm thành phần
          xác định người dùng thuộc những nhóm nào trong tổ chức.

        </div>

      </div>

    </main>
  );
}

