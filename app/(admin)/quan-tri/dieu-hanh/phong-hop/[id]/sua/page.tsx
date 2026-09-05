"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useRef, useState, } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MemberGroup = {
  id: number;
  name: string;
  description: string | null;
};

type Meeting = {
  id: number;
  title: string;
  meeting_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  chairperson: string | null;
  secretary: string | null;
  description: string | null;
};

export default function SuaCuocHopPage() {
  const router = useRouter();
  const params = useParams();

  const id = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const meetingId = Number(id);

  const [currentUserName, setCurrentUserName] =
    useState("");

  const [meeting, setMeeting] =
    useState<Meeting | null>(null);

  const [groups, setGroups] =
    useState<MemberGroup[]>([]);

  const [selectedGroups, setSelectedGroups] =
    useState<number[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingGroups, setLoadingGroups] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [saved, setSaved] =
    useState(false);
    const savedMessageRef =
    useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      if (saved && savedMessageRef.current) {
        savedMessageRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, [saved]);
      
  // =========================================================
  // TẢI THÔNG TIN NGƯỜI DÙNG
  // =========================================================

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
  // TẢI CUỘC HỌP
  // =========================================================

  useEffect(() => {
    async function loadMeeting() {
      if (!Number.isInteger(meetingId)) {
        setError(
          "Mã cuộc họp không hợp lệ."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const {
        data,
        error,
      } = await supabase
        .from("meetings")
        .select(
          `
          id,
          title,
          meeting_date,
          start_time,
          end_time,
          location,
          chairperson,
          secretary,
          description
        `
        )
        .eq("id", meetingId)
        .single();

      if (error || !data) {
        console.error(
          "LỖI TẢI CUỘC HỌP:",
          error
        );

        setError(
          error?.message ||
            "Không tìm thấy cuộc họp."
        );

        setMeeting(null);
      } else {
        setMeeting(data);
      }

      setLoading(false);
    }

    loadMeeting();
  }, [meetingId]);

  // =========================================================
  // TẢI NHÓM THÀNH PHẦN
  // =========================================================

  useEffect(() => {
    async function loadGroups() {
      setLoadingGroups(true);

      const {
        data,
        error,
      } = await supabase
        .from("member_groups")
        .select(
          "id, name, description"
        )
        .order("id");

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

  // =========================================================
  // TẢI NHÓM ĐÃ CHỌN CỦA CUỘC HỌP
  // =========================================================

  useEffect(() => {
    async function loadSelectedGroups() {
      if (!Number.isInteger(meetingId)) {
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("meeting_invite_groups")
        .select("group_id")
        .eq("meeting_id", meetingId);

      if (error) {
        console.error(
          "LỖI TẢI NHÓM ĐƯỢC MỜI:",
          error
        );

        setError(
          `Không thể tải nhóm thành phần của cuộc họp: ${error.message}`
        );

        return;
      }

      setSelectedGroups(
        (data || []).map(
          (item) => item.group_id
        )
      );
    }

    loadSelectedGroups();
  }, [meetingId]);

  // =========================================================
  // CHỌN / BỎ NHÓM
  // =========================================================

  function toggleGroup(groupId: number) {
    setSelectedGroups((current) => {
      if (current.includes(groupId)) {
        return current.filter(
          (id) => id !== groupId
        );
      }

      return [
        ...current,
        groupId,
      ];
    });
  }

  // =========================================================
  // CẬP NHẬT CUỘC HỌP
  // =========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const formData =
        new FormData(
          event.currentTarget
        );

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
        setError(
          "Vui lòng nhập tên cuộc họp."
        );
        setSaving(false);
        return;
      }

      if (!meetingDate) {
        setError(
          "Vui lòng chọn ngày họp."
        );
        setSaving(false);
        return;
      }

      if (!startTime) {
        setError(
          "Vui lòng chọn giờ bắt đầu."
        );
        setSaving(false);
        return;
      }

      if (!location) {
        setError(
          "Vui lòng nhập địa điểm."
        );
        setSaving(false);
        return;
      }

      if (
        selectedGroups.length === 0
      ) {
        setError(
          "Vui lòng chọn ít nhất một nhóm thành phần được mời."
        );
        setSaving(false);
        return;
      }

      // =====================================================
      // KIỂM TRA GIỜ
      // =====================================================

      if (
        endTime &&
        startTime &&
        endTime <= startTime
      ) {
        setError(
          "Giờ kết thúc phải sau giờ bắt đầu."
        );
        setSaving(false);
        return;
      }

      // =====================================================
      // CẬP NHẬT THÔNG TIN CUỘC HỌP
      //
      // LƯU Ý:
      // Không cập nhật meeting_invite_groups ở đây.
      // Danh sách nhóm hiện tại được giữ nguyên.
      // =====================================================

      const {
        error: meetingError,
      } = await supabase
        .from("meetings")
        .update({
          title,
          meeting_date: meetingDate,
          start_time: startTime,
          end_time:
            endTime || null,
          location,
          chairperson,
          secretary,
          description,
        })
        .eq("id", meetingId);

      if (meetingError) {
        console.error(
          "LỖI CẬP NHẬT CUỘC HỌP:",
          meetingError
        );

        throw new Error(
          meetingError.message
        );
      }

      // =====================================================
      // HOÀN TẤT
      // =====================================================

      setSaved(true);

      // Cuộn trang lên đầu để người dùng thấy thông báo
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      
      
    

    } catch (err) {
      console.error(
        "LỖI SỬA CUỘC HỌP:",
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
          "Không thể cập nhật cuộc họp."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100">

        <Header
          currentUserName={
            currentUserName
          }
        />

        <div className="mx-auto max-w-5xl p-6">

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
            Đang tải thông tin cuộc họp...
          </div>

        </div>

      </main>
    );
  }

  // =========================================================
  // LỖI
  // =========================================================

  if (error || !meeting) {
    return (
      <main className="min-h-screen bg-slate-100">

        <Header
          currentUserName={
            currentUserName
          }
        />

        <div className="mx-auto max-w-5xl p-6">

          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error ||
              "Không tìm thấy cuộc họp."}
          </div>

        </div>

      </main>
    );
  }

  // =========================================================
  // FORM
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-100">

      <Header
        currentUserName={
          currentUserName
        }
      />

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

                <span className="text-amber-500">
                  ✏️{" "}
                </span>

                Sửa cuộc họp

              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Cập nhật thông tin hồ sơ cuộc họp.
              </p>

            </div>

            <Link
    href="/quan-tri/dieu-hanh/phong-hop"
    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-50"
  >
    ← Quay lại phòng họp
  </Link>

          </div>


          {/* =================================================
              THÔNG BÁO THÀNH CÔNG
          ================================================= */}

{saved && (
  <div
    ref={savedMessageRef}
    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
  >
    ✓ Bạn đã lưu thay đổi thành công.
  </div>
)}



          {/* =================================================
              LỖI
          ================================================= */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

              <strong>
                Không thể cập nhật cuộc họp:
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
                defaultValue={
                  meeting.title
                }
                placeholder="Ví dụ: Họp Ban Thường vụ Tỉnh đoàn tháng 8/2026"
              />

              <div className="grid gap-5 md:grid-cols-2">

                <Field
                  name="meetingDate"
                  label="Ngày họp"
                  type="date"
                  required
                  defaultValue={
                    meeting.meeting_date ||
                    ""
                  }
                />

                <Field
                  name="startTime"
                  label="Giờ bắt đầu"
                  type="time"
                  required
                  defaultValue={
                    meeting.start_time?.slice(
                      0,
                      5
                    ) || ""
                  }
                />

              </div>

              <div className="grid gap-5 md:grid-cols-2">

                <Field
                  name="endTime"
                  label="Giờ kết thúc"
                  type="time"
                  defaultValue={
                    meeting.end_time?.slice(
                      0,
                      5
                    ) || ""
                  }
                />

                <Field
                  name="location"
                  label="Địa điểm"
                  required
                  defaultValue={
                    meeting.location ||
                    ""
                  }
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
                defaultValue={
                  meeting.chairperson ||
                  ""
                }
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
                defaultValue={
                  meeting.secretary ||
                  ""
                }
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
                defaultValue={
                  meeting.description ||
                  ""
                }
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
                  Các nhóm thành phần hiện đang được mời tham dự cuộc họp.
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

                  {groups.map(
                    (group) => {

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
                            checked={
                              checked
                            }
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
                                {
                                  group.description
                                }
                              </p>
                            )}

                          </div>

                        </label>
                      );
                    }
                  )}

                </div>

              )}

            </div>

          </section>


          {/* =================================================
              NÚT
          ================================================= */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <Link
              href={`/quan-tri/dieu-hanh/phong-hop`}
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
                ? "Đang cập nhật..."
                : "Lưu thay đổi"}
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}


// =========================================================
// HEADER
// =========================================================

function Header({
  currentUserName,
}: {
  currentUserName: string;
}) {
  return (
    <header className="border-b border-emerald-600 bg-emerald-800 text-white">

      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">

        {/* LOGO + TÊN HỆ THỐNG */}

        <div className="flex items-center gap-3">

          <div>

            <h1 className="text-xl font-bold tracking-wide">
              PHÒNG HỌP KHÔNG GIẤY
            </h1>

            <p className="mt-0.5 text-sm text-emerald-100">
              Trang điều hành dành cho điều hành viên hệ thống
            </p>

          </div>

        </div>


        {/* THÔNG TIN NGƯỜI DÙNG */}

        <div className="hidden items-center gap-3 md:flex">

          <div className="text-right">

            <p className="text-[11px] text-emerald-100">
              Xin chào,
            </p>

            <p className="text-sm font-semibold">
              {currentUserName ||
                "Đang tải..."}
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
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1-7.5 0Z"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 20.25a7.5 7.5 0 0 1 15 0"
              />

            </svg>

          </div>

        </div>

      </div>

    </header>
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
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
      >
        {children}
      </select>

    </label>
  );
}

