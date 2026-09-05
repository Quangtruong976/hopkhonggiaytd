"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MemberGroup = {
  id: number;
  name: string;
  description: string | null;
};

type Profile = {
  id: string;
  full_name: string;
  position: string | null;
  organization: string | null;
  role: string;
  is_active: boolean;
};

type GroupMember = {
  id: number;
  group_id: number;
  user_id: string;
};

export default function TaoCuocHopPage() {
  const router = useRouter();
  const [currentUserName, setCurrentUserName] =
  useState("");
  const [groups, setGroups] = useState<MemberGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);

  const [saved, setSaved] = useState(false);
  const [meetingId, setMeetingId] = useState<number | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  const [loadingGroups, setLoadingGroups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // TẢI NHÓM THÀNH PHẦN
  // =========================================================

  useEffect(() => {
    async function loadGroups() {
      setLoadingGroups(true);
      setError("");
  
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
  
      console.log("=== TAO CUOC HOP - KIEM TRA AUTH ===");
      console.log("AUTH USER ID:", session?.user?.id);
      console.log("AUTH EMAIL:", session?.user?.email);
      console.log("SESSION ERROR:", sessionError);
  
      if (sessionError) {
        console.error(
          "LỖI LẤY SESSION:",
          sessionError
        );
  
        setError(
          "Không thể kiểm tra phiên đăng nhập."
        );
  
        setGroups([]);
        setLoadingGroups(false);
        return;
      }
  
      if (!session?.user) {
        setError(
          "Không có phiên đăng nhập Supabase. Vui lòng đăng nhập lại."
        );
  
        setGroups([]);
        setLoadingGroups(false);
        return;
      }
  
      const {
        data,
        error,
      } = await supabase
        .from("member_groups")
        .select("id, name, description")
        .order("id");
  
      console.log("=== TAO CUOC HOP - MEMBER_GROUPS ===");
      console.log("DATA:", data);
      console.log("ERROR:", error);
  
      if (error) {
        console.error(
          "LỖI TẢI NHÓM:",
          error
        );
  
        setError(
          `Không thể tải nhóm thành phần: ${error.message}`
        );
  
        setGroups([]);
      } else {
        setGroups(data || []);
      }
  
      setLoadingGroups(false);
    }
  
    loadGroups();
  }, []);
  useEffect(() => {
    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCurrentUserName("");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(
          "LỖI TẢI THÔNG TIN NGƯỜI DÙNG:",
          error
        );

        setCurrentUserName("");
        return;
      }

      setCurrentUserName(
        data?.full_name || ""
      );
    }

    loadCurrentUser();
  }, []);
  // =========================================================
  // CHỌN / BỎ NHÓM
  // =========================================================

  function toggleGroup(groupId: number) {
    setSelectedGroups((current) => {
      if (current.includes(groupId)) {
        return current.filter((id) => id !== groupId);
      }

      return [...current, groupId];
    });
  }

  // =========================================================
  // TẠO CUỘC HỌP
  // =========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const formData = new FormData(event.currentTarget);

      const title = String(
        formData.get("title") || ""
      ).trim();

      const meetingDate = String(
        formData.get("meetingDate") || ""
      );

      const startTime = String(
        formData.get("startTime") || ""
      );

      const endTime = String(
        formData.get("endTime") || ""
      );

      const location = String(
        formData.get("location") || ""
      ).trim();

      const chairperson = String(
        formData.get("chairperson") || ""
      ).trim();

      const secretary = String(
        formData.get("secretary") || ""
      ).trim();

      const description = String(
        formData.get("description") || ""
      ).trim();

      // =====================================================
      // KIỂM TRA DỮ LIỆU
      // =====================================================

      if (!title) {
        setError("Vui lòng nhập tên cuộc họp.");
        setSaving(false);
        return;
      }

      if (!meetingDate) {
        setError("Vui lòng chọn ngày họp.");
        setSaving(false);
        return;
      }

      if (!startTime) {
        setError("Vui lòng chọn giờ bắt đầu.");
        setSaving(false);
        return;
      }

      if (!location) {
        setError("Vui lòng nhập địa điểm.");
        setSaving(false);
        return;
      }

      if (selectedGroups.length === 0) {
        setError(
          "Vui lòng chọn ít nhất một nhóm thành phần được mời."
        );
        setSaving(false);
        return;
      }

      // =====================================================
      // 1. TẠO CUỘC HỌP
      // =====================================================

      const {
        data: meeting,
        error: meetingError,
      } = await supabase
        .from("meetings")
        .insert({
          title,
          meeting_date: meetingDate,
          start_time: startTime,
          end_time: endTime || null,
          location,
          chairperson,
          secretary,
          description,
          status: "Đang chuẩn bị",
        })
        .select("id")
        .single();

      if (meetingError || !meeting) {
        console.error(
          "LỖI TẠO CUỘC HỌP:",
          meetingError
        );

        throw new Error(
          meetingError?.message ||
            "Không thể tạo cuộc họp."
        );
      }

      const newMeetingId = meeting.id;

      // =====================================================
      // 2. LƯU CÁC NHÓM ĐƯỢC MỜI
      // =====================================================

      const inviteGroupRows = selectedGroups.map(
        (groupId) => ({
          meeting_id: newMeetingId,
          group_id: groupId,
        })
      );

      const {
        error: inviteGroupError,
      } = await supabase
        .from("meeting_invite_groups")
        .insert(inviteGroupRows);

      if (inviteGroupError) {
        console.error(
          "LỖI LƯU NHÓM ĐƯỢC MỜI:",
          inviteGroupError
        );

        await supabase
          .from("meetings")
          .delete()
          .eq("id", newMeetingId);

        throw new Error(
          `Không thể lưu nhóm thành phần được mời: ${inviteGroupError.message}`
        );
      }

      // =====================================================
      // 3. LẤY THÀNH VIÊN THUỘC CÁC NHÓM ĐƯỢC CHỌN
      // =====================================================

      const {
        data: groupMemberData,
        error: groupMemberError,
      } = await supabase
        .from("group_members")
        .select("id, group_id, user_id")
        .in("group_id", selectedGroups);

      if (groupMemberError) {
        console.error(
          "LỖI TẢI THÀNH VIÊN NHÓM:",
          groupMemberError
        );

        await supabase
          .from("meeting_invite_groups")
          .delete()
          .eq("meeting_id", newMeetingId);

        await supabase
          .from("meetings")
          .delete()
          .eq("id", newMeetingId);

        throw new Error(
          `Không thể lấy danh sách đại biểu: ${groupMemberError.message}`
        );
      }

      // =====================================================
      // 4. KHÔNG ĐỂ TRÙNG ĐẠI BIỂU
      // =====================================================

      const uniqueUserIds = Array.from(
        new Set(
          (groupMemberData || []).map(
            (item: GroupMember) =>
              item.user_id
          )
        )
      );

      // =====================================================
      // 5. LẤY THÔNG TIN PROFILE
      // =====================================================

      let profiles: Profile[] = [];

      if (uniqueUserIds.length > 0) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, position, organization, role, is_active"
          )
          .in("id", uniqueUserIds)
          .eq("is_active", true);

        if (profileError) {
          console.error(
            "LỖI TẢI PROFILE:",
            profileError
          );

          await supabase
            .from("meeting_invite_groups")
            .delete()
            .eq("meeting_id", newMeetingId);

          await supabase
            .from("meetings")
            .delete()
            .eq("id", newMeetingId);

          throw new Error(
            `Không thể lấy thông tin đại biểu: ${profileError.message}`
          );
        }

        profiles = profileData || [];
      }

      // =====================================================
      // 6. TẠO SNAPSHOT ĐẠI BIỂU CHO CUỘC HỌP
      // =====================================================

      const participantRows = profiles.map(
        (profile) => ({
          meeting_id: newMeetingId,
          full_name: profile.full_name,
          position: profile.position,
          organization: profile.organization,
          role: profile.role,
          attendance_status:
            "Chưa xác nhận",
        })
      );

      // =====================================================
      // 7. LƯU DANH SÁCH ĐẠI BIỂU
      // =====================================================

      if (participantRows.length > 0) {
        const {
          error: participantError,
        } = await supabase
          .from("meeting_participants")
          .insert(participantRows);

        if (participantError) {
          console.error(
            "LỖI TẠO ĐẠI BIỂU CUỘC HỌP:",
            participantError
          );

          await supabase
            .from("meeting_invite_groups")
            .delete()
            .eq("meeting_id", newMeetingId);

          await supabase
            .from("meetings")
            .delete()
            .eq("id", newMeetingId);

          throw new Error(
            `Không thể tạo danh sách đại biểu: ${participantError.message}`
          );
        }
      }

      // =====================================================
      // HOÀN TẤT
      // =====================================================

      setMeetingId(newMeetingId);

      setParticipantCount(
        participantRows.length
      );

      setSaved(true);
    } catch (err) {
      console.error(
        "LỖI TẠO CUỘC HỌP:",
        err
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
          "Không thể tạo cuộc họp."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // HEADER
  // =========================================================

  function Header() {
    return (
      <header className="border-b border-emerald-600 bg-emerald-800 text-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          {/* LOGO + TÊN HỆ THỐNG */}

          <div className="flex items-center gap-3">

         

            <div>

            <h1 className="text-xl font-bold tracking-wide">
              PHÒNG HỌP KHÔNG GIẤY
            </h1>

            <p className="mt-0.5 text-sm text-emerald-100">
              Trang quản lý, điều hành dành cho Quản trị
            </p>
            </div>

          </div>


          {/* THÔNG TIN NGƯỜI DÙNG */}

          <Link
  href="/quan-tri/tai-khoan"
  className="hidden cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-emerald-700 md:flex"
>
  <div className="text-right">
    <p className="text-[11px] text-emerald-100">
      Xin chào,
    </p>

    <p className="text-sm font-semibold">
      {currentUserName || "Đang tải..."}
    </p>
  </div>

  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
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
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0"
      />
    </svg>
  </div>
</Link>


</div>

      </header>
    );
  }

  // =========================================================
  // SAU KHI TẠO THÀNH CÔNG
  // =========================================================

  if (saved && meetingId) {
    return (
      <main className="min-h-screen bg-slate-100">

        {/* HEADER RIÊNG */}

        <Header />

        {/* NỘI DUNG TẠO CUỘC HỌP */}

        <div className="mx-auto max-w-3xl p-6">

          <div className="rounded-2xl border border-emerald-200 bg-white p-10 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
              ✓
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Đã tạo hồ sơ cuộc họp
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Hồ sơ đã được lưu vào hệ thống.
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">

              <p className="text-xs text-slate-400">
                Mã hồ sơ
              </p>

              <p className="mt-1 text-lg font-bold text-slate-700">
                #{meetingId}
              </p>

              <p className="mt-2 text-sm text-emerald-700">
                Đã tự động tạo{" "}
                <strong>
                  {participantCount}
                </strong>{" "}
                đại biểu từ các nhóm thành phần đã chọn.
              </p>

            </div>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/quan-tri/dieu-hanh/phong-hop/${meetingId}`
                  )
                }
                className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Mở hồ sơ cuộc họp
              </button>

              <Link
                href="/quan-tri/dieu-hanh/phong-hop"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Về danh sách cuộc họp
              </Link>

            </div>

          </div>

        </div>

      </main>
    );
  }

  // =========================================================
  // FORM TẠO CUỘC HỌP
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-100">

      {/* =====================================================
          HEADER RIÊNG
      ===================================================== */}

      <Header />


      {/* =====================================================
          PHẦN TẠO CUỘC HỌP
      ===================================================== */}

      <div className="mx-auto max-w-5xl p-6">

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* =================================================
    TIÊU ĐỀ TRANG
================================================= */}

<div className="flex items-center justify-between gap-4">

<div>

<h2 className="text-lg font-bold text-emerald-900">
<span className="text-amber-500">📋 </span>
    Tạo cuộc họp mới
  </h2>

  <p className="mt-1 text-sm text-slate-500">
    Tạo hồ sơ điện tử, chuẩn bị nội dung và xác định thành phần được mời.
  </p>

</div>

<Link
  href="/quan-tri/dieu-hanh/phong-hop"
  className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-50"
>
  ← Quay lại phòng họp
</Link>

</div>


          {/* =================================================
              LỖI
          ================================================= */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

              <strong>
                Không thể tạo cuộc họp:
              </strong>

              <div className="mt-1">
                {error}
              </div>

            </div>
          )}


          {/* =================================================
              1. THÔNG TIN CUỘC HỌP
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="mb-5 font-bold text-slate-900">
              1. Thông tin cuộc họp
            </h2>

            <div className="grid gap-5">

              <Field
                name="title"
                label="Tên cuộc họp"
                required
                placeholder="Ví dụ: Họp Ban Thường vụ Tỉnh đoàn tháng 8/2026"
              />

              <div className="grid gap-5 md:grid-cols-2">

                <Field
                  name="meetingDate"
                  label="Ngày họp"
                  type="date"
                  required
                />

                <Field
                  name="startTime"
                  label="Giờ bắt đầu"
                  type="time"
                  required
                  defaultValue="08:00"
                />

              </div>

              <div className="grid gap-5 md:grid-cols-2">

                <Field
                  name="endTime"
                  label="Giờ kết thúc"
                  type="time"
                  defaultValue="11:30"
                />

                <Field
                  name="location"
                  label="Địa điểm"
                  required
                  placeholder="Phòng họp số 1"
                />

              </div>

            </div>

          </section>


          {/* =================================================
              2. ĐIỀU HÀNH
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="mb-5 font-bold text-slate-900">
              2. Điều hành
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <SelectField
                name="chairperson"
                label="Chủ trì"
                required
              >

                <option value="">
                  Chọn người chủ trì
                </option>

                <option>
                  Bí thư Tỉnh đoàn
                </option>

                <option>
                  Phó Bí thư Tỉnh đoàn
                </option>

                <option>
                  Chánh Văn phòng
                </option>

              </SelectField>


              <SelectField
                name="secretary"
                label="Thư ký"
              >

                <option value="">
                  Chọn thư ký
                </option>

                <option>
                  Chánh Văn phòng
                </option>

                <option>
                  Phó Chánh Văn phòng
                </option>

                <option>
                  Cán bộ Văn phòng
                </option>

              </SelectField>

            </div>

          </section>


          {/* =================================================
              3. NỘI DUNG
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="mb-5 font-bold text-slate-900">
              3. Nội dung
            </h2>

            <label className="block">

              <span className="mb-2 block text-sm font-medium text-slate-700">
                Nội dung chính
              </span>

              <textarea
                name="description"
                rows={6}
                placeholder="Nhập nội dung, mục đích và các vấn đề cần thảo luận..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

            </label>

          </section>


          {/* =================================================
              4. NHÓM THÀNH PHẦN
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

              <div>

                <h2 className="font-bold text-slate-900">
                  4. Thành phần được mời
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Chọn nhóm thành phần. Hệ thống sẽ tự động lấy các đại biểu thuộc nhóm để đưa vào hồ sơ cuộc họp.
                </p>

              </div>

              <div className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                {selectedGroups.length} nhóm đã chọn
              </div>

            </div>


            <div className="mt-5">

              {loadingGroups ? (

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Đang tải nhóm thành phần...
                </div>

              ) : groups.length === 0 ? (

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">

                  Chưa có nhóm thành phần.

                  <div className="mt-1">

                    Hãy vào{" "}
                    <strong>
                      Quản trị → Nhóm thành phần
                    </strong>{" "}
                    để tạo nhóm trước.

                  </div>

                </div>

              ) : (

                <div className="grid gap-3 md:grid-cols-2">

                  {groups.map((group) => {

                    const checked =
                      selectedGroups.includes(
                        group.id
                      );

                    return (
                      <label
                        key={group.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                          checked
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50"
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
                          className="mt-0.5 h-4 w-4 cursor-pointer accent-emerald-700"
                        />

                        <div className="min-w-0">

                        <div
  className={`text-sm ${
    checked
      ? "text-emerald-800"
      : "text-slate-800"
  }`}
>
  {group.name}
</div>

                          {group.description && (
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {group.description}
                            </p>
                          )}

                        </div>

                      </label>
                    );
                  })}

                </div>

              )}

            </div>


            {selectedGroups.length > 0 && (

              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">

                <strong>
                  Nguyên tắc:
                </strong>{" "}
                hệ thống sẽ lấy toàn bộ người đang thuộc các nhóm đã chọn,
                loại bỏ người trùng nhau và tạo thành danh sách đại biểu
                riêng của cuộc họp.

              </div>

            )}

          </section>


          {/* =================================================
              NÚT
          ================================================= */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <Link
              href="/quan-tri/dieu-hanh/phong-hop"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </Link>

            <button
              type="submit"
              disabled={
                saving ||
                loadingGroups ||
                groups.length === 0
              }
              className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Đang tạo hồ sơ..."
                : "Lưu và tạo hồ sơ"}
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}


// =========================================================
// FIELD
// =========================================================

function Field({
  name,
  label,
  required = false,
  type = "text",
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-sm font-medium text-slate-700">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </span>

      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />

    </label>
  );
}


// =========================================================
// SELECT FIELD
// =========================================================

function SelectField({
  name,
  label,
  required = false,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-sm font-medium text-slate-700">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </span>

      <select
        name={name}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
      >
        {children}
      </select>

    </label>
  );
}