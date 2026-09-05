"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
type Profile = {
  id: string;
  full_name: string;
  position: string | null;
  organization: string | null;
  role: string;
  is_active: boolean;
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

export default function ThanhPhanPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<MemberGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =========================
  // TẢI DỮ LIỆU
  // =========================

  async function loadData() {
    setLoading(true);
    setError("");

    const [profilesResult, groupsResult, membersResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, position, organization, role, is_active"
          )
          .order("full_name"),

        supabase
          .from("member_groups")
          .select("id, name")
          .order("id"),

        supabase
          .from("group_members")
          .select("id, group_id, user_id")
          .order("id"),
      ]);

    if (profilesResult.error) {
      console.error(
        "LỖI TẢI NGƯỜI DÙNG:",
        profilesResult.error
      );
      setError("Không thể tải danh sách người dùng.");
    }

    if (groupsResult.error) {
      console.error(
        "LỖI TẢI NHÓM THÀNH PHẦN:",
        groupsResult.error
      );
      setError("Không thể tải nhóm thành phần.");
    }

    if (membersResult.error) {
      console.error(
        "LỖI TẢI THÀNH PHẦN:",
        membersResult.error
      );
      setError("Không thể tải dữ liệu phân nhóm.");
    }

    setProfiles(profilesResult.data || []);
    setGroups(groupsResult.data || []);
    setGroupMembers(membersResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // LỌC NGƯỜI DÙNG
  // =========================

  const filteredProfiles = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return profiles.filter((profile) => {
      const matchSearch =
        !keyword ||
        profile.full_name.toLowerCase().includes(keyword) ||
        profile.position?.toLowerCase().includes(keyword) ||
        profile.organization?.toLowerCase().includes(keyword);

      const matchGroup =
        selectedGroup === null ||
        groupMembers.some(
          (item) =>
            item.user_id === profile.id &&
            item.group_id === selectedGroup
        );

      return matchSearch && matchGroup;
    });
  }, [
    profiles,
    search,
    selectedGroup,
    groupMembers,
  ]);

  // =========================
  // LẤY NHÓM CỦA NGƯỜI DÙNG
  // =========================

  function getUserGroups(userId: string) {
    const groupIds = groupMembers
      .filter((item) => item.user_id === userId)
      .map((item) => item.group_id);

    return groups.filter((group) =>
      groupIds.includes(group.id)
    );
  }

  // =========================
  // MỞ THIẾT LẬP
  // =========================

  function openUser(profile: Profile) {
    // Nếu đang mở chính người này thì bấm lại sẽ thu gọn
    if (selectedUser?.id === profile.id) {
      setSelectedUser(null);
      setSelectedGroups([]);
      setMessage("");
      setError("");
      return;
    }
  
    // Nếu chọn người khác thì mở người đó
    setSelectedUser(profile);
  
    const currentGroupIds = groupMembers
      .filter((item) => item.user_id === profile.id)
      .map((item) => item.group_id);
  
    setSelectedGroups(currentGroupIds);
  
    setMessage("");
    setError("");
  }

  // =========================
  // ĐÓNG THIẾT LẬP
  // =========================

  function closeUser() {
    if (selectedUser) {
      const originalGroups = groupMembers
        .filter(
          (item) =>
            item.user_id === selectedUser.id
        )
        .map((item) => item.group_id);
  
      setSelectedGroups(originalGroups);
    }
  
    setSelectedUser(null);
    setMessage("");
    setError("");
  }

  // =========================
  // CHỌN / BỎ NHÓM
  // =========================

  function toggleGroup(groupId: number) {
    setSelectedGroups((current) => {
      if (current.includes(groupId)) {
        return current.filter(
          (id) => id !== groupId
        );
      }

      return [...current, groupId];
    });
  }

  // =========================
  // LƯU PHÂN NHÓM
  // =========================

  async function saveUserGroups() {
    if (!selectedUser) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      // Xóa quan hệ cũ
      const { error: deleteError } =
        await supabase
          .from("group_members")
          .delete()
          .eq("user_id", selectedUser.id);

      if (deleteError) {
        console.error(
          "LỖI XÓA PHÂN NHÓM CŨ:",
          deleteError
        );

        throw deleteError;
      }

      // Nếu không chọn nhóm nào thì chỉ cần xóa quan hệ cũ
      if (selectedGroups.length > 0) {
        const rows = selectedGroups.map(
          (groupId) => ({
            group_id: groupId,
            user_id: selectedUser.id,
          })
        );

        const { error: insertError } =
          await supabase
            .from("group_members")
            .insert(rows);

            if (insertError) {
              console.error(
                "LỖI THÊM PHÂN NHÓM:",
                JSON.stringify(insertError, null, 2)
              );
            
              setError(
                `Không thể phân nhóm: ${
                  insertError.message ||
                  "Lỗi không xác định"
                }`
              );
            
              return;
            }
      }

      setMessage(
        `Đã cập nhật thành phần cho ${selectedUser.full_name}.`
      );

      await loadData();

      // Cập nhật lại trạng thái lựa chọn
      setSelectedGroups(
        groupMembers
          .filter(
            (item) =>
              item.user_id === selectedUser.id
          )
          .map((item) => item.group_id)
      );
    } catch (err) {
      console.error(
        "LỖI LƯU PHÂN NHÓM:",
        err
      );

      setError(
        "Không thể lưu thành phần. Vui lòng kiểm tra quyền truy cập dữ liệu."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // XÓA MỘT NHÓM KHỎI NGƯỜI DÙNG
  // =========================

  async function removeGroup(
    userId: string,
    groupId: number
  ) {
    const group = groups.find(
      (item) => item.id === groupId
    );

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa "${group?.name || "nhóm này"}" khỏi người dùng này?`
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { error: deleteError } =
        await supabase
          .from("group_members")
          .delete()
          .eq("user_id", userId)
          .eq("group_id", groupId);

      if (deleteError) {
        console.error(
          "LỖI XÓA THÀNH PHẦN:",
          deleteError
        );

        throw deleteError;
      }

      setGroupMembers((current) =>
        current.filter(
          (item) =>
            !(
              item.user_id === userId &&
              item.group_id === groupId
            )
        )
      );

      setSelectedGroups((current) =>
        current.filter(
          (id) => id !== groupId
        )
      );

      setMessage(
        `Đã xóa "${group?.name || "nhóm"}" khỏi người dùng.`
      );
    } catch (err) {
      console.error(
        "LỖI XÓA THÀNH PHẦN:",
        err
      );

      setError(
        "Không thể xóa thành phần."
      );
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
       Phân nhóm thành phần người dùng
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



      <div className="mx-auto max-w-7xl px-6 py-6">

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

        {/* GHI CHÚ */}

        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">

          <strong>ⓘ</strong>{" "}

          Một người dùng có thể thuộc nhiều nhóm thành phần.

          Ví dụ: một đồng chí có thể đồng thời thuộc
          Thường trực, Ban Thường vụ, Ban Chấp hành và
          cán bộ cơ quan Tỉnh đoàn.

        </div>

        {/* DANH SÁCH */}

        <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">

          {/* TIÊU ĐỀ */}

          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

              <div>

                <h2 className="text-base font-bold text-slate-900">
                  Danh sách thành phần
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {loading
                    ? "Đang tải dữ liệu..."
                    : `${filteredProfiles.length} người dùng`}
                </p>

              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                {/* TÌM KIẾM */}

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Tìm người dùng..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-64"
                />

                {/* LỌC NHÓM */}

                <select
                  value={selectedGroup ?? ""}
                  onChange={(event) =>
                    setSelectedGroup(
                      event.target.value
                        ? Number(event.target.value)
                        : null
                    )
                  }
                  className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
                >

                  <option value="">
                    Tất cả nhóm
                  </option>

                  {groups.map((group) => (
                    <option
                      key={group.id}
                      value={group.id}
                    >
                      {group.name}
                    </option>
                  ))}

                </select>

              </div>

            </div>

          </div>

          {/* ĐANG TẢI */}

          {loading ? (

            <div className="px-5 py-12 text-center text-sm text-slate-500">
              Đang tải dữ liệu...
            </div>

          ) : filteredProfiles.length === 0 ? (

            <div className="px-5 py-12 text-center">

              <div className="text-3xl text-slate-300">
                👤
              </div>

              <p className="mt-3 text-sm font-medium text-slate-600">
                Không tìm thấy người dùng
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Thử thay đổi từ khóa hoặc nhóm thành phần.
              </p>

            </div>

          ) : (

            <div className="divide-y divide-slate-200">

              {filteredProfiles.map((profile) => {

                const userGroups =
                  getUserGroups(profile.id);

                const isSelected =
                  selectedUser?.id === profile.id;

                return (

                  <div
                    key={profile.id}
                    className={`px-5 py-4 transition ${
                      isSelected
                        ? "bg-emerald-50/60"
                        : "hover:bg-slate-50"
                    }`}
                  >

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">

                      {/* NGƯỜI DÙNG */}

                      <div className="flex min-w-0 flex-1 items-start gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                          👤
                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="truncate text-sm font-bold text-slate-900">
                              {profile.full_name}
                            </span>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
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

                          <div className="mt-1 text-xs text-slate-500">
                            {profile.position ||
                              "Chưa cập nhật chức vụ"}
                          </div>

                          <div className="mt-0.5 text-xs text-slate-400">
                            {profile.organization ||
                              "Chưa cập nhật đơn vị"}
                          </div>

                        </div>

                      </div>

                      {/* NHÓM */}

                      <div className="flex min-w-0 flex-1 flex-wrap gap-2">

                        {userGroups.length === 0 ? (

                          <span className="text-xs italic text-slate-400">
                            Chưa phân nhóm
                          </span>

                        ) : (

                          userGroups.map((group) => (

                            <span
                              key={group.id}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                            >

                              {group.name}

                              <button
                                type="button"
                                title="Xóa nhóm khỏi người dùng"
                                disabled={saving}
                                onClick={() =>
                                  removeGroup(
                                    profile.id,
                                    group.id
                                  )
                                }
                                className="cursor-pointer ml-0.5 text-emerald-400 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                ×
                              </button>

                            </span>

                          ))

                        )}

                      </div>

                      {/* THAO TÁC */}

                      <button
                        type="button"
                        onClick={() =>
                          openUser(profile)
                        }
                        className="cursor-pointer shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                      >
                        {isSelected
                          ? "Đang thiết lập"
                          : "Phân nhóm"}
                      </button>

                    </div>

                    {/* FORM PHÂN NHÓM */}

                    {isSelected && (

                      <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">

                        <div className="mb-3 flex items-center justify-between">

                          <div>

                            <h3 className="text-sm font-bold text-slate-900">
                              Phân nhóm cho{" "}
                              {profile.full_name}
                            </h3>

                            <p className="mt-0.5 text-xs text-slate-500">
                              Có thể chọn nhiều nhóm cùng lúc.
                            </p>

                          </div>

                          <button
  type="button"
  onClick={closeUser}
  disabled={saving}
  className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
  Hủy
</button>

                        </div>

                        {groups.length === 0 ? (

                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                            Chưa có nhóm thành phần. Hãy tạo nhóm
                            trước tại trang <strong>Nhóm thành phần</strong>.
                          </div>

                        ) : (

                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">

                            {groups.map((group) => {

                              const checked =
                                selectedGroups.includes(
                                  group.id
                                );

                              return (

                                <label
                                  key={group.id}
                                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition ${
                                    checked
                                      ? "border-emerald-300 bg-emerald-50"
                                      : "border-slate-200 hover:border-emerald-200 hover:bg-slate-50"
                                  }`}
                                >

                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      toggleGroup(
                                        group.id
                                      )
                                    }
                                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                                  />

                                  <span
                                    className={`text-sm ${
                                      checked
                                        ? "font-semibold text-emerald-800"
                                        : "text-slate-700"
                                    }`}
                                  >
                                    {group.name}
                                  </span>

                                </label>

                              );
                            })}

                          </div>

                        )}

                        {/* CHÂN FORM */}

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">

<div className="text-xs text-slate-500">
  Đã chọn{" "}
  <span className="font-bold text-slate-700">
    {selectedGroups.length}
  </span>{" "}
  nhóm
</div>

<div className="flex items-center gap-2">

  <button
    type="button"
    onClick={closeUser}
    disabled={saving}
    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
  >
    Hủy
  </button>

  <button
    type="button"
    onClick={saveUserGroups}
    disabled={saving}
    className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {saving
      ? "Đang lưu..."
      : "Lưu thay đổi"}
  </button>

</div>

</div>

                      </div>

                    )}

                  </div>

                );
              })}

            </div>

          )}

        </section>

        {/* GHI CHÚ CUỐI */}

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">

          <strong>Lưu ý:</strong> Thành phần được quản lý độc lập
          với vai trò tài khoản. Một người dùng có thể thuộc nhiều
          nhóm thành phần cùng lúc.

        </div>

      </div>

    </main>
  );
}