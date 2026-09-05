"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

import DocumentsTab from "./DocumentsTab";
import ParticipantsTab from "./ParticipantsTab";
import AgendaTab from "./AgendaTab";
import OpinionsTab from "./OpinionsTab";
import VotingTab from "./VotingTab";
import ConclusionTab from "./ConclusionTab";
import TasksTab from "./TasksTab";
import MinutesTab from "./MinutesTab";

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
  status: string | null;
};

type TabKey =
  | "agenda"
  | "documents"
  | "participants"
  | "opinions"
  | "voting"
  | "conclusion"
  | "tasks"
  | "minutes";

const tabs: {
  key: TabKey;
  icon: string;
  label: string;
}[] = [
  {
    key: "agenda",
    icon: "📋",
    label: "Chương trình",
  },
  {
    key: "documents",
    icon: "📄",
    label: "Tài liệu",
  },
  {
    key: "participants",
    icon: "👥",
    label: "Thành phần",
  },
  {
    key: "opinions",
    icon: "💬",
    label: "Ý kiến",
  },
  {
    key: "voting",
    icon: "🗳️",
    label: "Biểu quyết",
  },
  {
    key: "conclusion",
    icon: "📝",
    label: "Kết luận",
  },
  {
    key: "tasks",
    icon: "✅",
    label: "Nhiệm vụ",
  },
  {
    key: "minutes",
    icon: "📑",
    label: "Biên bản",
  },
  
];

export default function MeetingDetailPage() {
  const params = useParams();

  const id = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const meetingId = Number(id);

  const [meeting, setMeeting] =
    useState<Meeting | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [currentUserName, setCurrentUserName] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<TabKey>("agenda");

  // =====================================================
  // TẢI THÔNG TIN NGƯỜI DÙNG
  // =====================================================

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

  // =====================================================
  // TẢI CUỘC HỌP
  // =====================================================

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

      const { data, error } =
        await supabase
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
            description,
            status
          `
          )
          .eq("id", meetingId)
          .single();

      if (error || !data) {
        console.error(error);

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

  // =====================================================
  // ĐANG TẢI
  // =====================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100">

        <div className="mx-auto max-w-7xl px-5 py-10">

          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">

            Đang tải hồ sơ cuộc họp...

          </div>

        </div>

      </main>
    );
  }

  // =====================================================
  // LỖI / KHÔNG TÌM THẤY
  // =====================================================

  if (error || !meeting) {
    return (
      <main className="min-h-screen bg-slate-100">

        <div className="mx-auto max-w-3xl px-5 py-10">

          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error ||
              "Không tìm thấy cuộc họp."}
          </div>

          <Link
            href="/quan-tri/dieu-hanh/phong-hop"
            className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            ← Quay lại phòng họp
          </Link>

        </div>

      </main>
    );
  }

  // =====================================================
  // TRẠNG THÁI
  // =====================================================

  const status =
    meeting.status ||
    "Đang chuẩn bị";

  const isFinished =
    status === "Đã kết thúc";

  // =====================================================
  // GIAO DIỆN
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-100">

      {/* =====================================================
          HEADER HỒ SƠ
      ===================================================== */}

      <header className="border-b border-emerald-600 bg-emerald-800 text-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          {/* TÊN HỆ THỐNG */}

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


          {/* NGƯỜI DÙNG */}

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
          THÔNG TIN HỒ SƠ
      ===================================================== */}

      <section className="border-b border-slate-200 bg-white">

        <div className="mx-auto max-w-7xl px-5 py-4">

          <div className="flex items-start justify-between gap-4">

            <div className="min-w-0">

              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Hồ sơ cuộc họp #{meeting.id}
              </div>

              <h1 className="text-lg font-bold text-red-800">

                <span className="text-amber-500">
                  📝{" "}
                </span>

                {meeting.title}

              </h1>


              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">

                <span>
                  📅{" "}
                  {formatDate(
                    meeting.meeting_date
                  )}
                </span>

                <span>
                  🕐{" "}
                  {formatTime(
                    meeting.start_time,
                    meeting.end_time
                  )}
                </span>

                <span>
                  📍{" "}
                  {meeting.location ||
                    "Chưa xác định"}
                </span>

                <span>
                  👤 Chủ trì:{" "}
                  {meeting.chairperson ||
                    "Chưa xác định"}
                </span>

              </div>

            </div>


            {/* BÊN PHẢI */}

            <div className="flex shrink-0 flex-col items-end gap-2">

              <Link
                href="/quan-tri/dieu-hanh/phong-hop"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                ← Quay lại phòng họp
              </Link>


              {/* TRẠNG THÁI */}

              <div
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  isFinished
                    ? "bg-slate-100 text-slate-500"
                    : status === "Đã phát hành"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                }`}
              >

                {isFinished
                  ? "✓ Đã hoàn thành"
                  : status}

              </div>
             

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          NỘI DUNG
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-1 py-1">

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* =================================================
              THANH TAB
          ================================================= */}

          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">

            <div className="flex flex-wrap gap-1">

              {tabs.map((tab) => {

                const active =
                  activeTab === tab.key;

                return (

                  <button
                    key={tab.key}
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        tab.key
                      )
                    }
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "text-slate-600 hover:bg-white hover:text-emerald-700"
                    }`}
                  >

                    <span>
                      {tab.icon}
                    </span>

                    <span>
                      {tab.label}
                    </span>

                  </button>

                );

              })}

            </div>

          </div>


          {/* =================================================
              KHU VỰC NỘI DUNG
          ================================================= */}

          <div
            className={
              isFinished
                ? "relative p-4"
                : "p-4"
            }
          >

            {/* =================================================
                THÔNG BÁO HỒ SƠ ĐÃ KẾT THÚC
            ================================================= */}

            {isFinished && (

              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

                <div className="flex items-start gap-3">

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-sm text-slate-500">
                    ✓
                  </div>

                  <div>

                    <p className="text-sm font-medium text-slate-700">
                      Cuộc họp đã kết thúc
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Hồ sơ cuộc họp đã được khóa. Chỉ được phép xem lại thông tin, tài liệu và nội dung đã lưu.
                    </p>

                  </div>

                </div>

              </div>

            )}


            {/* =================================================
                TAB CHƯƠNG TRÌNH
            ================================================= */}

            {activeTab === "agenda" && (
              <div
                className={
                  isFinished
                    ? "pointer-events-none"
                    : ""
                }
              >
                <AgendaTab
                  meetingId={meeting.id}
                />
              </div>
            )}


            {/* =================================================
                TAB TÀI LIỆU
            ================================================= */}

            {activeTab === "documents" && (
              <div
                className={
                  isFinished
                    ? "pointer-events-none"
                    : ""
                }
              >
                <DocumentsTab
                  meetingId={meeting.id}
                />
              </div>
            )}


            {/* =================================================
                TAB THÀNH PHẦN
            ================================================= */}

            {activeTab === "participants" && (
              <div
                className={
                  isFinished
                    ? "pointer-events-none"
                    : ""
                }
              >
                <ParticipantsTab
                  meetingId={meeting.id}
                />
              </div>
            )}


            {/* =================================================
                TAB Ý KIẾN
            ================================================= */}

            {activeTab === "opinions" && (
              <div
                className={
                  isFinished
                    ? "pointer-events-none"
                    : ""
                }
              >
                <OpinionsTab
                  meetingId={meeting.id}
                />
              </div>
            )}


            {/* =================================================
                TAB BIỂU QUYẾT
            ================================================= */}

            {activeTab === "voting" && (
              <div
                className={
                  isFinished
                    ? "pointer-events-none"
                    : ""
                }
              >
                <VotingTab
                  meetingId={meeting.id}
                />
              </div>
            )}


            {/* =================================================
                TAB KẾT LUẬN
            ================================================= */}

            {activeTab === "conclusion" && (
              <div
                className={
                  isFinished
                    ? "pointer-events-none"
                    : ""
                }
              >
                <ConclusionTab
                  meetingId={meeting.id}
                />
              </div>
            )}


            {/* =================================================
                TAB NHIỆM VỤ
            ================================================= */}

            {activeTab === "tasks" && (
              <div
                className={
                  isFinished
                    ? "pointer-events-none"
                    : ""
                }
              >
                <TasksTab
                  meetingId={meeting.id}
                />
              </div>
            )}


            {/* =================================================
                TAB BIÊN BẢN
            ================================================= */}

            {activeTab === "minutes" && (
              <div
                className={
                  isFinished
                    ? "pointer-events-none"
                    : ""
                }
              >
                <MinutesTab
                  meetingId={meeting.id}
                />
              </div>
            )}


            {/* =================================================
                TAB GHI ÂM
            ================================================= */}

           
          </div>

        </section>

      </div>

    </main>
  );
}


/* =========================================================
   GHI ÂM
========================================================= */


/* =========================================================
   FORMAT NGÀY
========================================================= */

function formatDate(
  date: string | null
) {
  if (!date) {
    return "Chưa xác định";
  }

  const [
    year,
    month,
    day,
  ] = date.split("-");

  return `${day}/${month}/${year}`;
}


/* =========================================================
   FORMAT GIỜ
========================================================= */

function formatTime(
  start: string | null,
  end: string | null
) {
  if (!start) {
    return "Chưa xác định";
  }

  const startTime =
    start.slice(0, 5);

  if (!end) {
    return startTime;
  }

  return `${startTime} – ${end.slice(
    0,
    5
  )}`;
}

