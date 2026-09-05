"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
/* =========================================================
   TYPES
========================================================= */

type ViewMode = "week" | "day";

type Schedule = {
  id: number;
  title: string;
  schedule_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  organization: string | null;
  schedule_type: string;
  description: string | null;
  source: string;
  status: string;
  created_at: string | null;
};

/* =========================================================
   HELPERS
========================================================= */

function formatDateVN(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function shortDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(time: string | null) {
  if (!time) return "";

  return time.slice(0, 5);
}

function getMonday(date: Date) {
  const result = new Date(date);
  const day = result.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);

  return result;
}

function dateToString(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getWeekDates(baseDate: Date) {
  const monday = getMonday(baseDate);

  return Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date(monday);

      date.setDate(
        monday.getDate() + index
      );

      return date;
    }
  );
}

function isMorning(schedule: Schedule) {
  const hour = Number(
    schedule.start_time?.slice(0, 2)
  );

  return hour < 12;
}

/* =========================================================
   PAGE
========================================================= */

export default function LichCongTacPage() {
  /* =======================================================
     USER
  ======================================================= */

  const [currentUserName, setCurrentUserName] =
    useState("");

  /* =======================================================
     DATA
  ======================================================= */

  const [schedules, setSchedules] =
    useState<Schedule[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  /* =======================================================
     MESSAGE
  ======================================================= */

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /* =======================================================
     VIEW
  ======================================================= */

  const [view, setView] =
    useState<ViewMode>("week");

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [selectedScheduleId, setSelectedScheduleId] =
    useState<number | null>(null);

  /* =======================================================
     CREATE / EDIT FORM
  ======================================================= */

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [editingScheduleId, setEditingScheduleId] =
    useState<number | null>(null);

  const [title, setTitle] =
    useState("");

  const [scheduleDate, setScheduleDate] =
    useState(
      dateToString(new Date())
    );

  const [startTime, setStartTime] =
    useState("08:00");

  const [endTime, setEndTime] =
    useState("09:30");

  const [location, setLocation] =
    useState("");

  /* =========================================================
     LOAD SCHEDULES
  ========================================================= */

  async function loadSchedules() {
    setLoading(true);
    setError("");

    const { data, error } =
      await supabase
        .from("work_schedules")
        .select(`
          id,
          title,
          schedule_date,
          start_time,
          end_time,
          location,
          organization,
          schedule_type,
          description,
          source,
          status,
          created_at
        `)
        .order("schedule_date", {
          ascending: true,
        })
        .order("start_time", {
          ascending: true,
        });

    if (error) {
      console.error(error);

      setError(
        `Không thể tải lịch công tác: ${error.message}`
      );

      setSchedules([]);
      setLoading(false);
      return;
    }

    setSchedules(
      (data || []) as Schedule[]
    );

    setLoading(false);
  }

  /* =========================================================
     LOAD CURRENT USER
  ========================================================= */

  useEffect(() => {
    loadSchedules();
  }, []);

  useEffect(() => {
    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } =
        await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

      setCurrentUserName(
        profile?.full_name ||
          "Quản trị viên"
      );
    }

    loadCurrentUser();
  }, []);

  /* =========================================================
     WEEK
  ========================================================= */

  const weekDates = useMemo(
    () => getWeekDates(currentDate),
    [currentDate]
  );

  const weekStart =
    weekDates[0];

  const weekEnd =
    weekDates[6];

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function previousPeriod() {
    const date = new Date(
      currentDate
    );

    if (view === "week") {
      date.setDate(
        date.getDate() - 7
      );
    } else {
      date.setDate(
        date.getDate() - 1
      );
    }

    setCurrentDate(date);
    setSelectedScheduleId(null);
  }

  function nextPeriod() {
    const date = new Date(
      currentDate
    );

    if (view === "week") {
      date.setDate(
        date.getDate() + 7
      );
    } else {
      date.setDate(
        date.getDate() + 1
      );
    }

    setCurrentDate(date);
    setSelectedScheduleId(null);
  }

  function goToday() {
    setCurrentDate(new Date());
    setSelectedScheduleId(null);
  }

  /* =========================================================
     RESET FORM
  ========================================================= */

  function resetForm() {
    setTitle("");

    setScheduleDate(
      dateToString(new Date())
    );

    setStartTime("08:00");
    setEndTime("09:30");
    setLocation("");

    setEditingScheduleId(null);
  }

  /* =========================================================
     OPEN CREATE FORM
  ========================================================= */

  function openCreateForm() {
    resetForm();

    setShowCreateForm(true);

    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =========================================================
     CLOSE FORM
  ========================================================= */

  function closeForm() {
    resetForm();

    setShowCreateForm(false);

    setError("");
  }

  /* =========================================================
     CREATE / UPDATE
  ========================================================= */

  async function saveSchedule() {
    if (!title.trim()) {
      setError(
        "Vui lòng nhập nội dung họp."
      );
      return;
    }

    if (!scheduleDate) {
      setError(
        "Vui lòng chọn ngày."
      );
      return;
    }

    if (!startTime) {
      setError(
        "Vui lòng nhập giờ bắt đầu."
      );
      return;
    }

    if (
      endTime &&
      endTime < startTime
    ) {
      setError(
        "Giờ kết thúc phải lớn hơn giờ bắt đầu."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      /* ===================================================
         UPDATE
      =================================================== */

      if (
        editingScheduleId !== null
      ) {
        const { error } =
          await supabase
            .from("work_schedules")
            .update({
              title: title.trim(),
              schedule_date:
                scheduleDate,
              start_time:
                startTime,
              end_time:
                endTime || null,
              location:
                location.trim() ||
                null,
            })
            .eq(
              "id",
              editingScheduleId
            );

        if (error) {
          console.error(error);

          setError(
            `Không thể cập nhật lịch: ${error.message}`
          );

          return;
        }

        setMessage(
          "Đã cập nhật lịch công tác thành công."
        );
      }

      /* ===================================================
         INSERT
      =================================================== */

      else {
        const { error } =
          await supabase
            .from("work_schedules")
            .insert({
              title: title.trim(),
              schedule_date:
                scheduleDate,
              start_time:
                startTime,
              end_time:
                endTime || null,
              location:
                location.trim() ||
                null,

              /*
               * Các trường bắt buộc
               * trong database nhưng
               * không hiển thị trên UI.
               */

              organization:
                "Cơ quan khác",

              schedule_type:
                "Công tác",

              source:
                "Cơ quan khác",

              status:
                "Đang thực hiện",
            });

        if (error) {
          console.error(error);

          setError(
            `Không thể tạo lịch: ${error.message}`
          );

          return;
        }

        setMessage(
          "Đã tạo lịch công tác thành công."
        );
      }

      resetForm();
      setShowCreateForm(false);

      await loadSchedules();
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     EDIT SCHEDULE
  ========================================================= */

  function editSchedule(
    schedule: Schedule
  ) {
    setEditingScheduleId(
      schedule.id
    );

    setTitle(
      schedule.title
    );

    setScheduleDate(
      schedule.schedule_date
    );

    setStartTime(
      formatTime(
        schedule.start_time
      )
    );

    setEndTime(
      schedule.end_time
        ? formatTime(
            schedule.end_time
          )
        : ""
    );

    setLocation(
      schedule.location || ""
    );

    setShowCreateForm(true);

    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =========================================================
     GET SCHEDULES BY DATE
  ========================================================= */

  function getSchedulesForDate(
    dateString: string
  ) {
    return schedules
      .filter(
        (schedule) =>
          schedule.schedule_date ===
          dateString
      )
      .sort((a, b) =>
        a.start_time.localeCompare(
          b.start_time
        )
      );
  }

  /* =========================================================
     SELECT
  ========================================================= */

  function selectSchedule(
    scheduleId: number
  ) {
    setSelectedScheduleId(
      (current) =>
        current === scheduleId
          ? null
          : scheduleId
    );
  }

  const selectedSchedule =
    schedules.find(
      (schedule) =>
        schedule.id ===
        selectedScheduleId
    ) || null;

  /* =========================================================
     DELETE
  ========================================================= */

  async function deleteSchedule() {
    if (!selectedSchedule) {
      return;
    }

    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa lịch công tác:\n\n"${selectedSchedule.title}"?\n\nChỉ lịch công tác này và thành phần liên quan sẽ bị xóa. Dữ liệu Phòng họp không bị ảnh hưởng.`
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/lich-cong-tac/xoa",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              scheduleId:
                selectedSchedule.id,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Không thể xóa lịch công tác."
        );
      }

      setSelectedScheduleId(null);

      setMessage(
        "Đã xóa lịch công tác thành công."
      );

      await loadSchedules();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Không thể xóa lịch công tác."
      );
    } finally {
      setDeleting(false);
    }
  }

  /* =========================================================
     HEADER TITLE
  ========================================================= */

  function getHeaderTitle() {
    if (view === "day") {
      return {
        dateText: formatDateVN(
          dateToString(currentDate)
        ),
        noSchedule: false,
      };
    }

    const weekStartString =
      dateToString(weekStart);

    const weekEndString =
      dateToString(weekEnd);

    const hasWeekSchedules =
      schedules.some(
        (schedule) =>
          schedule.schedule_date >=
            weekStartString &&
          schedule.schedule_date <=
            weekEndString
      );

    return {
      dateText: `Lịch công tác hiển thị từ ngày ${shortDate(
        weekStartString
      )} đến ngày ${shortDate(
        weekEndString
      )}/${weekEnd.getFullYear()}.`,

      noSchedule:
        !hasWeekSchedules,
    };
  }

  /* =========================================================
     DAY VIEW
  ========================================================= */

  const daySchedules =
    getSchedulesForDate(
      dateToString(currentDate)
    );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen bg-slate-100">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-emerald-600 bg-emerald-800 text-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div>

            <h1 className="text-xl font-bold tracking-wide">
              PHÒNG HỌP KHÔNG GIẤY
            </h1>

            <p className="mt-0.5 text-sm text-emerald-100">
              Trang quản lý, điều hành dành cho Quản trị
            </p>

          </div>

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

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-5 py-6">

        {/* ===================================================
            TITLE + CREATE
        =================================================== */}

        <div className="mb-5 flex items-center justify-between">

          <div>

            <h2 className="text-lg font-bold text-emerald-900">

              <span className="text-amber-500">
                📅{" "}
              </span>

              Lịch công tác

            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Quản lý và theo dõi lịch công tác của cơ quan.
            </p>

          </div>

          <button
            type="button"
            onClick={() => {
              if (showCreateForm) {
                closeForm();
              } else {
                openCreateForm();
              }
            }}
            className="cursor-pointer rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            {showCreateForm
              ? "Đóng tạo lịch"
              : "+ Tạo lịch"}
          </button>

        </div>

        {/* ===================================================
            MESSAGE
        =================================================== */}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {/* ===================================================
            CREATE / EDIT FORM
        =================================================== */}

        {showCreateForm && (

          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-4">

              <h2 className="text-lg font-bold text-slate-900">
                {editingScheduleId !== null
                  ? "Sửa lịch công tác"
                  : "Tạo lịch công tác"}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Lịch công tác được quản lý độc lập với hồ sơ Phòng họp.
              </p>

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              {/* =================================================
                  NỘI DUNG
              ================================================= */}

              <div className="md:col-span-2">

                <label className="text-sm font-semibold text-slate-700">
                  Nội dung họp *
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Họp Ban Thường vụ Tỉnh đoàn"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>

              {/* =================================================
                  NGÀY
              ================================================= */}

              <div>

                <label className="text-sm font-semibold text-slate-700">
                  Ngày *
                </label>

                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(event) =>
                    setScheduleDate(
                      event.target.value
                    )
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>

              {/* =================================================
                  THỜI GIAN
              ================================================= */}

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="text-sm font-semibold text-slate-700">
                    Bắt đầu *
                  </label>

                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) =>
                      setStartTime(
                        event.target.value
                      )
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                </div>

                <div>

                  <label className="text-sm font-semibold text-slate-700">
                    Kết thúc
                  </label>

                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) =>
                      setEndTime(
                        event.target.value
                      )
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                </div>

              </div>

              {/* =================================================
                  ĐỊA ĐIỂM
              ================================================= */}

              <div className="md:col-span-2">

                <label className="text-sm font-semibold text-slate-700">
                  Địa điểm họp
                </label>

                <input
                  value={location}
                  onChange={(event) =>
                    setLocation(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Phòng họp Tỉnh đoàn..."
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>

            </div>

            {/* =================================================
                FORM BUTTONS
            ================================================= */}

            <div className="mt-5 flex justify-end gap-2">

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveSchedule}
                className="cursor-pointer rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Đang lưu..."
                  : editingScheduleId !== null
                    ? "Cập nhật lịch"
                    : "Lưu lịch"}
              </button>

            </div>

          </section>

        )}

        {/* ===================================================
            CALENDAR
        =================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* =================================================
              TOOLBAR
          ================================================= */}

          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={previousPeriod}
                className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                ←
              </button>

              <button
                type="button"
                onClick={nextPeriod}
                className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                →
              </button>

              <button
                type="button"
                onClick={goToday}
                className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Hôm nay
              </button>

              <div className="ml-1">

                <div className="text-sm font-normal text-emerald-600">
                  {getHeaderTitle().dateText}
                </div>

                {getHeaderTitle()
                  .noSchedule && (
                  <div className="mt-1 text-sm font-medium text-red-600">
                    Không có lịch công tác trong tuần.
                  </div>
                )}

              </div>

            </div>

            {/* =================================================
                VIEW MODE
            ================================================= */}

            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">

              <button
                type="button"
                onClick={() => {
                  setView("day");
                  setCurrentDate(
                    new Date()
                  );
                  setSelectedScheduleId(
                    null
                  );
                }}
                className={`cursor-pointer rounded-md px-4 py-2 text-sm font-semibold ${
                  view === "day"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Ngày
              </button>

              <button
                type="button"
                onClick={() => {
                  setView("week");
                  setSelectedScheduleId(
                    null
                  );
                }}
                className={`cursor-pointer rounded-md px-4 py-2 text-sm font-semibold ${
                  view === "week"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Tuần
              </button>

            </div>

          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (

            <div className="py-16 text-center text-sm text-slate-500">
              Đang tải lịch công tác...
            </div>

          ) : view === "week" ? (

            /* =================================================
               WEEK VIEW
            ================================================= */

            <div className="p-4">

              {/* =================================================
                  DAY HEADER
              ================================================= */}

              <div className="grid grid-cols-[55px_repeat(7,minmax(70px,1fr))] border-b border-l border-t border-slate-200">

                <div className="border-r border-slate-200 bg-slate-50 p-3 text-center text-xs font-bold text-slate-500">
                  BUỔI
                </div>

                {weekDates.map(
                  (date) => {

                    const dateString =
                      dateToString(
                        date
                      );

                    const isToday =
                      dateString ===
                      dateToString(
                        new Date()
                      );

                    return (

                      <div
                        key={dateString}
                        className={`border-r border-slate-200 p-3 text-center ${
                          isToday
                            ? "bg-emerald-50"
                            : "bg-slate-50"
                        }`}
                      >

                        <div className="text-xs font-bold text-slate-600">
                          {date.toLocaleDateString(
                            "vi-VN",
                            {
                              weekday:
                                "short",
                            }
                          )}
                        </div>

                        <div
                          className={`mt-1 text-sm font-semibold ${
                            isToday
                              ? "text-emerald-700"
                              : "text-slate-800"
                          }`}
                        >
                          {shortDate(
                            dateString
                          )}
                        </div>

                        {isToday && (
                          <div className="mt-1 text-[10px] font-semibold text-emerald-600">
                            Hôm nay
                          </div>
                        )}

                      </div>

                    );
                  }
                )}

              </div>

              {/* =================================================
                  MORNING
              ================================================= */}

              <div className="grid grid-cols-[55px_repeat(7,minmax(70px,1fr))] border-l border-b border-slate-200">

                <div className="flex min-h-[150px] items-start justify-center border-r border-slate-200 bg-slate-50 p-4">

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                    Sáng
                  </span>

                </div>

                {weekDates.map(
                  (date) => {

                    const dateString =
                      dateToString(
                        date
                      );

                    const daySchedules =
                      getSchedulesForDate(
                        dateString
                      ).filter(
                        isMorning
                      );

                    return (

                      <CalendarCell
                        key={`morning-${dateString}`}
                        schedules={
                          daySchedules
                        }
                        selectedScheduleId={
                          selectedScheduleId
                        }
                        onSelect={
                          selectSchedule
                        }
                      />

                    );
                  }
                )}

              </div>

              {/* =================================================
                  AFTERNOON
              ================================================= */}

              <div className="grid grid-cols-[55px_repeat(7,minmax(70px,1fr))] border-l border-b border-slate-200">

                <div className="flex min-h-[150px] items-start justify-center border-r border-slate-200 bg-slate-50 p-4">

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    Chiều
                  </span>

                </div>

                {weekDates.map(
                  (date) => {

                    const dateString =
                      dateToString(
                        date
                      );

                    const daySchedules =
                      getSchedulesForDate(
                        dateString
                      ).filter(
                        (schedule) =>
                          !isMorning(
                            schedule
                          )
                      );

                    return (

                      <CalendarCell
                        key={`afternoon-${dateString}`}
                        schedules={
                          daySchedules
                        }
                        selectedScheduleId={
                          selectedScheduleId
                        }
                        onSelect={
                          selectSchedule
                        }
                      />

                    );
                  }
                )}

              </div>

            </div>

          ) : (

            /* =================================================
               DAY VIEW
            ================================================= */

            <div className="p-5">

              {daySchedules.length === 0 ? (

                <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">
                  Không có lịch công tác trong ngày.
                </div>

              ) : (

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

                  {daySchedules.map(
                    (schedule, index) => (

                      <div
                        key={schedule.id}
                        className={`flex items-center gap-4 px-5 py-4 transition hover:bg-emerald-50/50 ${
                          index !==
                          daySchedules.length - 1
                            ? "border-b border-slate-100"
                            : ""
                        }`}
                      >

                        {/* THỜI GIAN */}

                        <div className="w-32 shrink-0">

                          <p className="text-sm font-bold text-emerald-700">
                            {formatTime(
                              schedule.start_time
                            )}

                            {schedule.end_time &&
                              ` – ${formatTime(
                                schedule.end_time
                              )}`}
                          </p>

                        </div>

                        {/* NỘI DUNG */}

                        <div className="min-w-0 flex-1">

                          <p className="truncate text-sm font-medium text-slate-800">
                            {schedule.title}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {schedule.location ||
                              "Chưa cập nhật địa điểm"}
                          </p>

                        </div>

                        {/* CHI TIẾT */}

                        <button
                          type="button"
                          onClick={() =>
                            selectSchedule(
                              schedule.id
                            )
                          }
                          className="cursor-pointer shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Chi tiết →
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          )}

        </section>

        {/* ===================================================
            SELECTED SCHEDULE DETAIL
        =================================================== */}

        {selectedSchedule && (

          <section className="mt-4 rounded-2xl border border-emerald-200 bg-white shadow-sm">

            {/* =================================================
                DETAIL HEADER
            ================================================= */}

            <div className="flex items-start justify-between border-b border-emerald-700 bg-emerald-600 px-5 py-2">

              <div>

                <p className="text-[11px] font-bold text-emerald-100">
                  Chi tiết Lịch công tác
                </p>

                <h2 className="mt-1 text-sm font-bold text-white">
                  {selectedSchedule.title}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedScheduleId(
                    null
                  )
                }
                className="cursor-pointer rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                Đóng
              </button>

            </div>

            {/* =================================================
                DETAIL CONTENT
            ================================================= */}

            <div className="grid gap-5 p-5 md:grid-cols-2 lg:grid-cols-4">

              <InfoItem
                label="Ngày"
                value={formatDateVN(
                  selectedSchedule.schedule_date
                )}
              />

              <InfoItem
                label="Thời gian"
                value={`${formatTime(
                  selectedSchedule.start_time
                )}${
                  selectedSchedule.end_time
                    ? ` – ${formatTime(
                        selectedSchedule.end_time
                      )}`
                    : ""
                }`}
              />

              <InfoItem
                label="Nội dung họp"
                value={
                  selectedSchedule.title
                }
              />

              <InfoItem
                label="Địa điểm họp"
                value={
                  selectedSchedule.location ||
                  "Chưa cập nhật"
                }
              />

            </div>

            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">

              <button
                type="button"
                onClick={() =>
                  editSchedule(
                    selectedSchedule
                  )
                }
                className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                ✎ Sửa lịch
              </button>

              <button
                type="button"
                onClick={deleteSchedule}
                disabled={deleting}
                className="cursor-pointer rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting
                  ? "Đang xóa..."
                  : "🗑 Xóa lịch"}
              </button>

            </div>

          </section>

        )}

      </div>

    </main>
  );
}

/* =========================================================
   CALENDAR CELL
========================================================= */

function CalendarCell({
  schedules,
  selectedScheduleId,
  onSelect,
}: {
  schedules: Schedule[];
  selectedScheduleId: number | null;
  onSelect: (
    id: number
  ) => void;
}) {
  return (
    <div className="min-h-[120px] border-r border-slate-200 bg-white p-1">

      {schedules.length === 0 ? (

        <div className="flex h-full min-h-[130px] items-center justify-center text-xs text-slate-300">
          —
        </div>

      ) : (

        <div className="space-y-1">

          {schedules.map(
            (schedule) => (

              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                selected={
                  selectedScheduleId ===
                  schedule.id
                }
                onSelect={
                  onSelect
                }
              />

            )
          )}

        </div>

      )}

    </div>
  );
}

/* =========================================================
   SCHEDULE CARD
========================================================= */

function ScheduleCard({
  schedule,
  selected,
  onSelect,
}: {
  schedule: Schedule;
  selected: boolean;
  onSelect: (
    id: number
  ) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onSelect(schedule.id)
      }
      className={`w-full cursor-pointer rounded-lg border px-2 py-2 text-center transition ${
        selected
          ? "border-emerald-400 bg-emerald-50 shadow-sm"
          : "border-emerald-100 bg-emerald-100 hover:border-emerald-300 hover:bg-emerald-300"
      }`}
    >

      {/* THỜI GIAN */}

      <div className="text-[10px] font-semibold leading-4 text-emerald-700">
        {formatTime(
          schedule.start_time
        )}

        {schedule.end_time &&
          ` - ${formatTime(
            schedule.end_time
          )}`}
      </div>

      {/* NỘI DUNG */}

      <div
        className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-4 text-slate-700"
        title={schedule.title}
      >
        {schedule.title}
      </div>

    </button>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
        {label}
      </p>

      <p className="mt-1.5 text-sm font-semibold text-slate-800">
        {value}
      </p>

    </div>
  );
}

