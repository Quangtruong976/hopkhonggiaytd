"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type ViewMode = "week" | "day";

type ScheduleItem = {
  id: string;
  sourceType: "schedule" | "meeting";

  title: string;
  schedule_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
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

function isMorning(item: ScheduleItem) {
  const hour = Number(
    item.start_time?.slice(0, 2)
  );

  return hour < 12;
}

/* =========================================================
   PAGE
========================================================= */

export default function DaiBieuLichCongTacPage() {
  const [schedules, setSchedules] =
    useState<ScheduleItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [currentUserName, setCurrentUserName] =
    useState("");

  const [error, setError] =
    useState("");

  const [view, setView] =
    useState<ViewMode>("week");

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [selectedScheduleId, setSelectedScheduleId] =
    useState<string | null>(null);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  async function loadSchedules() {
    setLoading(true);
    setError("");

    try {
      /* -------------------------------------------------------
         LẤY ĐẠI BIỂU ĐANG ĐĂNG NHẬP
      ------------------------------------------------------- */

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } =
          await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();

        setCurrentUserName(
          profile?.full_name || "Đại biểu"
        );
      }

      /* -------------------------------------------------------
         1. LỊCH CÔNG TÁC DO QUẢN TRỊ TẠO
         
         Bảng: work_schedules
      ------------------------------------------------------- */

      const {
        data: scheduleData,
        error: scheduleError,
      } = await supabase
        .from("work_schedules")
        .select(`
          id,
          title,
          schedule_date,
          start_time,
          end_time,
          location
        `)
        .order("schedule_date", {
          ascending: true,
        })
        .order("start_time", {
          ascending: true,
        });

      if (scheduleError) {
        throw new Error(
          `Không thể tải lịch công tác: ${scheduleError.message}`
        );
      }

      /* -------------------------------------------------------
         2. LỊCH PHÒNG HỌP KHÔNG GIẤY
         
         Bảng: meetings
      ------------------------------------------------------- */

      const {
        data: meetingData,
        error: meetingError,
      } = await supabase
        .from("meetings")
        .select(`
          id,
          title,
          meeting_date,
          start_time,
          end_time,
          location
        `)
        .order("meeting_date", {
          ascending: true,
        })
        .order("start_time", {
          ascending: true,
        });

      if (meetingError) {
        throw new Error(
          `Không thể tải lịch phòng họp: ${meetingError.message}`
        );
      }

      /* -------------------------------------------------------
         CHUYỂN work_schedules
         THÀNH ScheduleItem
      ------------------------------------------------------- */

      const schedulesFromWork: ScheduleItem[] =
        (scheduleData || []).map(
          (item) => ({
            id: `schedule-${item.id}`,
            sourceType: "schedule",

            title: item.title,

            schedule_date:
              item.schedule_date,

            start_time:
              item.start_time,

            end_time:
              item.end_time,

            location:
              item.location,
          })
        );

      /* -------------------------------------------------------
         CHUYỂN meetings
         THÀNH ScheduleItem
      ------------------------------------------------------- */

      const schedulesFromMeetings: ScheduleItem[] =
        (meetingData || []).map(
          (item) => ({
            id: `meeting-${item.id}`,
            sourceType: "meeting",

            title: item.title,

            schedule_date:
              item.meeting_date,

            start_time:
              item.start_time,

            end_time:
              item.end_time,

            location:
              item.location,
          })
        );

      /* -------------------------------------------------------
         GỘP 2 NGUỒN
      ------------------------------------------------------- */

      const combinedSchedules = [
        ...schedulesFromWork,
        ...schedulesFromMeetings,
      ].sort((a, b) => {
        const dateCompare =
          a.schedule_date.localeCompare(
            b.schedule_date
          );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return a.start_time.localeCompare(
          b.start_time
        );
      });

      setSchedules(
        combinedSchedules
      );
    } catch (err) {
      console.error(err);

      setSchedules([]);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải lịch công tác."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadSchedules();
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
     GET SCHEDULES BY DATE
  ========================================================= */

  function getSchedulesForDate(
    dateString: string
  ) {
    return schedules
      .filter(
        (item) =>
          item.schedule_date ===
          dateString
      )
      .sort((a, b) =>
        a.start_time.localeCompare(
          b.start_time
        )
      );
  }

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
     SELECT SCHEDULE
  ========================================================= */

  function selectSchedule(
    scheduleId: string
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
      (item) =>
        item.id ===
        selectedScheduleId
    ) || null;

  /* =========================================================
     DAY VIEW
  ========================================================= */

  const daySchedules =
    getSchedulesForDate(
      dateToString(currentDate)
    );

  /* =========================================================
     HEADER TITLE
  ========================================================= */

  function getHeaderTitle() {
    if (view === "day") {
      return formatDateVN(
        dateToString(currentDate)
      );
    }

    return `Lịch công tác hiển thị từ ngày ${shortDate(
      dateToString(weekStart)
    )} đến ngày ${shortDate(
      dateToString(weekEnd)
    )}/${weekEnd.getFullYear()}.`;
  }

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

          {/* BÊN TRÁI */}

          <div className="min-w-0">

            <h1 className="text-xl font-bold tracking-wide">
              PHÒNG HỌP KHÔNG GIẤY
            </h1>

            <p className="mt-0.5 text-sm text-emerald-100">
              Trang thông tin dành cho đại biểu
            </p>

          </div>


          {/* TÀI KHOẢN ĐẠI BIỂU */}

          <Link
            href="/dai-bieu/tai-khoan"
            className="group hidden items-center gap-3 rounded-xl px-3 py-1.5 transition hover:bg-emerald-700 md:flex"
          >

            <div className="text-right">

              <p className="text-[11px] text-emerald-100">
                Xin chào,
              </p>

              <p className="text-sm font-semibold text-white">
                {currentUserName || "Đang tải..."}
              </p>

            </div>


            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white transition group-hover:bg-emerald-500">

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

      <div className="mx-auto max-w-7xl px-5 py-5">

        {/* ===================================================
            TITLE
        =================================================== */}

        <section className="mb-5">

          <h2 className="text-xl font-bold text-emerald-900">

            <span className="text-amber-500">
              📅{" "}
            </span>

            Lịch công tác của Thường trực Tỉnh đoàn

          </h2>

          <p className="mt-1 text-sm text-slate-500">

            Đại biểu theo dõi lịch công tác và
            các hoạt động của Tỉnh đoàn để
            chủ động sắp xếp thời gian tham dự.

          </p>

        </section>


        {/* ===================================================
            CALENDAR
        =================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* =================================================
              TOOLBAR
          ================================================= */}

          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">

            {/* ĐIỀU HƯỚNG */}

            <div className="flex min-w-0 flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={previousPeriod}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                ←
              </button>

              <button
                type="button"
                onClick={nextPeriod}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                →
              </button>

              <button
                type="button"
                onClick={goToday}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Hôm nay
              </button>

              <div className="ml-1 min-w-0">

                <div className="truncate text-sm font-normal text-emerald-600">
                  {getHeaderTitle()}
                </div>

              </div>

            </div>


            {/* NGÀY / TUẦN */}

            <div className="flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1">

              <button
                type="button"
                onClick={() => {
                  setView("day");
                  setSelectedScheduleId(null);
                }}
                className={`cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition ${
                  view === "day"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Ngày
              </button>

              <button
                type="button"
                onClick={() => {
                  setView("week");
                  setSelectedScheduleId(null);
                }}
                className={`cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition ${
                  view === "week"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Tuần
              </button>

            </div>

          </div>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (

            <div className="py-16 text-center text-sm text-slate-500">

              Đang tải lịch công tác...

            </div>

          )}


          {/* =================================================
              ERROR
          ================================================= */}

          {!loading && error && (

            <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">

              {error}

            </div>

          )}


          {/* =================================================
              WEEK VIEW - MOBILE
              
              Điện thoại / iPad dọc:
              Ngày nằm dọc
              Sáng / Chiều nằm ngang
          ================================================= */}

          {!loading &&
            !error &&
            view === "week" && (

              <>
                {/* -------------------------------------------------
                    MOBILE WEEK
                ------------------------------------------------- */}

                <div className="lg:hidden p-3">

                  {/* HEADER */}

                  <div className="grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-t-xl border border-slate-200">

                    <div className="flex items-center justify-center border-r border-slate-200 bg-slate-50 px-1 py-3 text-[10px] font-bold text-slate-500">
                      NGÀY
                    </div>

                    <div className="flex items-center justify-center border-r border-slate-200 bg-amber-50 py-3 text-xs font-bold text-amber-700">
                      Sáng
                    </div>

                    <div className="flex items-center justify-center bg-blue-50 py-3 text-xs font-bold text-blue-700">
                      Chiều
                    </div>

                  </div>


                  {/* 7 NGÀY */}

                  <div className="overflow-hidden rounded-b-xl border-x border-b border-slate-200">

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

                        const morningSchedules =
                          getSchedulesForDate(
                            dateString
                          ).filter(
                            isMorning
                          );

                        const afternoonSchedules =
                          getSchedulesForDate(
                            dateString
                          ).filter(
                            (item) =>
                              !isMorning(
                                item
                              )
                          );

                        return (

                          <div
                            key={dateString}
                            className="grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)] border-b border-slate-200 last:border-b-0"
                          >

                            {/* NGÀY */}

                            <div
                              className={`flex min-h-[112px] flex-col items-center justify-center border-r border-slate-200 px-1 py-2 ${
                                isToday
                                  ? "bg-emerald-50"
                                  : "bg-slate-50"
                              }`}
                            >

                              <div className="text-[10px] font-bold uppercase text-slate-500">
                                {date.toLocaleDateString(
                                  "vi-VN",
                                  {
                                    weekday:
                                      "short",
                                  }
                                )}
                              </div>

                              <div
                                className={`mt-1 text-lg font-bold ${
                                  isToday
                                    ? "text-emerald-700"
                                    : "text-slate-800"
                                }`}
                              >
                                {String(
                                  date.getDate()
                                ).padStart(
                                  2,
                                  "0"
                                )}
                              </div>

                              <div className="text-[10px] text-slate-400">
                                {String(
                                  date.getMonth() +
                                    1
                                ).padStart(
                                  2,
                                  "0"
                                )}
                              </div>

                              {isToday && (
                                <span className="mt-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[8px] font-bold text-white">
                                  HÔM NAY
                                </span>
                              )}

                            </div>


                            {/* SÁNG */}

                            <div className="min-w-0 border-r border-slate-200 bg-white p-1.5">

                              {morningSchedules.length ===
                              0 ? (

                                <div className="flex min-h-[96px] items-center justify-center text-xs text-slate-300">
                                  —
                                </div>

                              ) : (

                                <div className="space-y-1.5">

                                  {morningSchedules.map(
                                    (item) => (

                                      <ScheduleCard
                                        key={item.id}
                                        schedule={item}
                                        selected={
                                          selectedScheduleId ===
                                          item.id
                                        }
                                        onSelect={
                                          selectSchedule
                                        }
                                      />

                                    )
                                  )}

                                </div>

                              )}

                            </div>


                            {/* CHIỀU */}

                            <div className="min-w-0 bg-white p-1.5">

                              {afternoonSchedules.length ===
                              0 ? (

                                <div className="flex min-h-[96px] items-center justify-center text-xs text-slate-300">
                                  —
                                </div>

                              ) : (

                                <div className="space-y-1.5">

                                  {afternoonSchedules.map(
                                    (item) => (

                                      <ScheduleCard
                                        key={item.id}
                                        schedule={item}
                                        selected={
                                          selectedScheduleId ===
                                          item.id
                                        }
                                        onSelect={
                                          selectSchedule
                                        }
                                      />

                                    )
                                  )}

                                </div>

                              )}

                            </div>

                          </div>

                        );

                      }
                    )}

                  </div>

                </div>


                {/* -------------------------------------------------
                    DESKTOP WEEK
                    GIỮ NGUYÊN GIAO DIỆN CŨ
                ------------------------------------------------- */}

                <div className="hidden lg:block p-4">

                  {/* DAY HEADER */}

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


                  {/* MORNING */}

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


                  {/* AFTERNOON */}

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
                            (item) =>
                              !isMorning(
                                item
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

              </>

            )}


          {/* =================================================
              DAY VIEW
          ================================================= */}

          {!loading &&
            !error &&
            view === "day" && (

              <div className="p-3 lg:p-5">

                {daySchedules.length ===
                0 ? (

                  <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">

                    Không có lịch công tác
                    trong ngày.

                  </div>

                ) : (

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

                    {daySchedules.map(
                      (
                        item,
                        index
                      ) => (

                        <div
                          key={item.id}
                          className={`px-3 py-3 transition hover:bg-emerald-50/50 lg:flex lg:items-center lg:gap-4 lg:px-5 lg:py-4 ${
                            index !==
                            daySchedules.length -
                              1
                              ? "border-b border-slate-100"
                              : ""
                          }`}
                        >

                          {/* -------------------------------------------------
                              MOBILE DAY VIEW
                          ------------------------------------------------- */}

                          <div className="lg:hidden">

                            <div className="flex items-start gap-3">

                              {/* THỜI GIAN */}

                              <div className="w-[58px] shrink-0 rounded-lg bg-emerald-50 px-2 py-2 text-center">

                                <p className="text-xs font-bold text-emerald-700">

                                  {formatTime(
                                    item.start_time
                                  )}

                                </p>

                                {item.end_time && (

                                  <p className="mt-0.5 text-[10px] text-emerald-600">

                                    –
                                    {" "}
                                    {formatTime(
                                      item.end_time
                                    )}

                                  </p>

                                )}

                              </div>


                              {/* NỘI DUNG */}

                              <div className="min-w-0 flex-1">

                                <p className="text-sm font-semibold leading-5 text-slate-800">

                                  {item.title}

                                </p>

                                <p className="mt-1 text-xs leading-4 text-slate-500">

                                  📍{" "}
                                  {item.location ||
                                    "Chưa cập nhật"}

                                </p>

                              </div>

                            </div>


                            {/* CHI TIẾT */}

                            <button
                              type="button"
                              onClick={() =>
                                selectSchedule(
                                  item.id
                                )
                              }
                              className="mt-2 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >

                              Chi tiết →

                            </button>

                          </div>


                          {/* -------------------------------------------------
                              DESKTOP DAY VIEW
                              GIỮ NGUYÊN
                          ------------------------------------------------- */}

                          <div className="hidden lg:flex lg:w-full lg:items-center lg:gap-4">

                            {/* THỜI GIAN */}

                            <div className="w-32 shrink-0">

                              <p className="text-sm font-bold text-emerald-700">

                                {formatTime(
                                  item.start_time
                                )}

                                {item.end_time &&
                                  ` – ${formatTime(
                                    item.end_time
                                  )}`}

                              </p>

                            </div>


                            {/* NỘI DUNG */}

                            <div className="min-w-0 flex-1">

                              <p className="truncate text-sm font-semibold text-slate-800">

                                {item.title}

                              </p>

                              <p className="mt-1 truncate text-xs text-slate-500">

                                📍{" "}
                                {item.location ||
                                  "Chưa cập nhật"}

                              </p>

                            </div>


                            {/* CHI TIẾT */}

                            <button
                              type="button"
                              onClick={() =>
                                selectSchedule(
                                  item.id
                                )
                              }
                              className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >

                              Chi tiết →

                            </button>

                          </div>

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

          <section className="mt-4 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">

            {/* HEADER */}

            <div className="flex items-start justify-between gap-3 bg-emerald-600 px-4 py-3 lg:px-5">

              <div className="min-w-0">

                <p className="text-[11px] font-semibold text-emerald-100">
                  Chi tiết lịch công tác
                </p>

                <h2 className="mt-1 text-sm font-bold leading-5 text-white">
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
                className="shrink-0 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
              >
                Đóng
              </button>

            </div>


            {/* =================================================
                CHI TIẾT
            ================================================= */}

            <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 lg:grid-cols-4 lg:gap-5 lg:p-5">

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
                label="Nội dung"
                value={
                  selectedSchedule.title
                }
              />

              <InfoItem
                label="Địa điểm"
                value={
                  selectedSchedule.location ||
                  "Chưa cập nhật"
                }
              />

            </div>

          </section>

        )}

      </div>

    </main>
  );
}


/* =========================================================
   CALENDAR CELL
   DESKTOP
========================================================= */

function CalendarCell({
  schedules,
  selectedScheduleId,
  onSelect,
}: {
  schedules: ScheduleItem[];
  selectedScheduleId: string | null;
  onSelect: (id: string) => void;
}) {

  return (

    <div className="min-h-[150px] border-r border-slate-200 bg-white p-1">

      {schedules.length === 0 ? (

        <div className="flex h-full min-h-[130px] items-center justify-center text-xs text-slate-300">
          —
        </div>

      ) : (

        <div className="space-y-1">

          {schedules.map(
            (item) => (

              <ScheduleCard
                key={item.id}
                schedule={item}
                selected={
                  selectedScheduleId ===
                  item.id
                }
                onSelect={onSelect}
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
  schedule: ScheduleItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {

  return (

    <button
      type="button"
      onClick={() =>
        onSelect(schedule.id)
      }
      className={`w-full min-w-0 rounded-lg border px-2 py-2 text-center transition ${
        selected
          ? "border-emerald-400 bg-emerald-50 shadow-sm"
          : schedule.sourceType === "meeting"
            ? "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100"
            : "border-emerald-100 bg-emerald-100 hover:border-emerald-300 hover:bg-emerald-200"
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

    <div className="min-w-0">

      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 lg:text-xs">

        {label}

      </p>

      <p className="mt-1.5 break-words text-xs font-semibold leading-5 text-slate-800 lg:text-sm">

        {value}

      </p>

    </div>

  );

}
