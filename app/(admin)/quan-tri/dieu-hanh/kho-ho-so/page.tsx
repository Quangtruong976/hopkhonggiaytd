"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

/* =========================================================
   TYPES
========================================================= */

type Meeting = {
  id: number;
  title: string;
  meeting_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  chairperson: string | null;
  secretary: string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
};

type MeetingDocument = {
  id: number;
  meeting_id: number;
  name: string | null;
  file_name: string | null;
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;
  status: string | null;
  uploaded_by: string | null;
  created_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  published_at: string | null;
  published_by: string | null;
};

type FilterStatus =
  | "Tất cả"
  | "Đang chuẩn bị"
  | "Đang diễn ra"
  | "Đã kết thúc"
  | "Đã hủy";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 5;

/* =========================================================
   HELPERS
========================================================= */

function formatDate(
  value: string | null | undefined
) {
  if (!value) return "—";

  const parts = value.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function formatTime(
  value: string | null | undefined
) {
  if (!value) return "";

  return value.slice(0, 5);
}

function formatFileSize(
  size: number | null | undefined
) {
  if (!size) return "";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

/* =========================================================
   STATUS STYLE
========================================================= */

function meetingStatusStyle(
  status: string | null
) {
  const value = (
    status || ""
  ).toLowerCase();

  if (value.includes("kết thúc")) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (value.includes("hủy")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value.includes("diễn ra")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function documentStatusStyle(
  status: string | null
) {
  const value = (
    status || ""
  ).toLowerCase();

  if (value.includes("phát hành")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (value.includes("duyệt")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value.includes("chỉnh sửa") ||
    value.includes("trả lại")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value.includes("chờ")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getMeetingDocumentStatus(
  meetingDocuments: MeetingDocument[]
) {
  if (meetingDocuments.length === 0) {
    return "Chưa có tài liệu";
  }

  const published =
    meetingDocuments.filter(
      (document) =>
        document.status === "Đã phát hành"
    ).length;

  const editing =
    meetingDocuments.filter(
      (document) =>
        document.status === "Cần chỉnh sửa"
    ).length;

  const pending =
    meetingDocuments.filter(
      (document) =>
        document.status === "Chờ duyệt"
    ).length;

  const approved =
    meetingDocuments.filter(
      (document) =>
        document.status === "Đã duyệt"
    ).length;

  if (
    published ===
    meetingDocuments.length
  ) {
    return "Đã phát hành";
  }

  if (editing > 0) {
    return "Cần chỉnh sửa";
  }

  if (pending > 0) {
    return "Chờ duyệt";
  }

  if (approved > 0) {
    return "Đã duyệt";
  }

  return "Đang xử lý";
}

/* =========================================================
   PAGE
========================================================= */

export default function KhoHoSoPage() {
  const [meetings, setMeetings] =
    useState<Meeting[]>([]);

  const [documents, setDocuments] =
    useState<MeetingDocument[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [selectedYear, setSelectedYear] =
    useState("Tất cả");

  const [selectedStatus, setSelectedStatus] =
    useState<FilterStatus>("Tất cả");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [expandedMeetingId, setExpandedMeetingId] =
    useState<number | null>(null);

  const [openingDocumentId, setOpeningDocumentId] =
    useState<number | null>(null);

  const [currentUserName, setCurrentUserName] =
    useState("");

  /* =========================================================
     LOAD CURRENT USER
  ========================================================= */

  async function loadCurrentUserName() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCurrentUserName("");
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error(
        "Không thể tải thông tin người dùng:",
        error
      );

      setCurrentUserName("");
      return;
    }

    setCurrentUserName(
      data?.full_name ||
        user.user_metadata?.full_name ||
        "Quản trị viên"
    );
  }

  /* =========================================================
     LOAD DATA
  ========================================================= */

  async function loadData() {
    setLoading(true);
    setError("");
    setMessage("");

    const meetingsResult =
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
            status,
            created_at
          `
        )
        .order("meeting_date", {
          ascending: false,
        })
        .order("start_time", {
          ascending: false,
        });

    if (meetingsResult.error) {
      console.error(
        "meetings:",
        meetingsResult.error
      );

      setError(
        `Không thể tải danh sách cuộc họp: ${meetingsResult.error.message}`
      );

      setLoading(false);
      return;
    }

    const documentsResult =
      await supabase
        .from("meeting_documents")
        .select(
          `
            id,
            meeting_id,
            name,
            file_name,
            file_path,
            file_type,
            file_size,
            status,
            uploaded_by,
            created_at,
            reviewed_by,
            reviewed_at,
            review_note,
            published_at,
            published_by
          `
        )
        .order("created_at", {
          ascending: false,
        });

    if (documentsResult.error) {
      console.error(
        "meeting_documents:",
        documentsResult.error
      );

      setError(
        `Không thể tải kho tài liệu: ${documentsResult.error.message}`
      );

      setLoading(false);
      return;
    }

    setMeetings(
      (meetingsResult.data || []) as Meeting[]
    );

    setDocuments(
      (documentsResult.data || []) as MeetingDocument[]
    );

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    loadCurrentUserName();
  }, []);

  /* =========================================================
     YEARS
========================================================= */

  const years = useMemo(() => {
    const yearSet = new Set<string>();

    meetings.forEach((meeting) => {
      if (meeting.meeting_date) {
        yearSet.add(
          meeting.meeting_date.slice(0, 4)
        );
      }
    });

    return [
      "Tất cả",
      ...Array.from(yearSet).sort(
        (a, b) =>
          Number(b) - Number(a)
      ),
    ];
  }, [meetings]);

  /* =========================================================
     DOCUMENT MAP
========================================================= */

  const documentsByMeeting =
    useMemo(() => {
      const map = new Map<
        number,
        MeetingDocument[]
      >();

      documents.forEach((document) => {
        const meetingId =
          Number(document.meeting_id);

        const current =
          map.get(meetingId) || [];

        current.push(document);

        map.set(
          meetingId,
          current
        );
      });

      return map;
    }, [documents]);

  /* =========================================================
     FILTER
========================================================= */

  const filteredMeetings =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return meetings.filter(
        (meeting) => {
          const title =
            meeting.title?.toLowerCase() ||
            "";

          const location =
            meeting.location?.toLowerCase() ||
            "";

          const chairperson =
            meeting.chairperson?.toLowerCase() ||
            "";

          const description =
            meeting.description?.toLowerCase() ||
            "";

          const year =
            meeting.meeting_date
              ? meeting.meeting_date.slice(
                  0,
                  4
                )
              : "";

          const matchesSearch =
            !keyword ||
            title.includes(keyword) ||
            location.includes(keyword) ||
            chairperson.includes(keyword) ||
            description.includes(keyword);

          const matchesYear =
            selectedYear ===
              "Tất cả" ||
            year === selectedYear;

          const status =
            (meeting.status ||
              "Đang chuẩn bị") as FilterStatus;

          const matchesStatus =
            selectedStatus ===
              "Tất cả" ||
            status === selectedStatus;

          return (
            matchesSearch &&
            matchesYear &&
            matchesStatus
          );
        }
      );
    }, [
      meetings,
      search,
      selectedYear,
      selectedStatus,
    ]);

  /* =========================================================
     PAGINATION
========================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredMeetings.length /
        PAGE_SIZE
    )
  );

  const paginatedMeetings =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        PAGE_SIZE;

      return filteredMeetings.slice(
        start,
        start + PAGE_SIZE
      );
    }, [
      filteredMeetings,
      currentPage,
    ]);

  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedMeetingId(null);
  }, [
    search,
    selectedYear,
    selectedStatus,
  ]);

  /* =========================================================
     SUMMARY
========================================================= */

  const totalDocuments =
    documents.length;

  const pendingDocuments =
    documents.filter(
      (document) =>
        document.status ===
        "Chờ duyệt"
    ).length;

  /* =========================================================
     OPEN DOCUMENT
========================================================= */

  async function openDocument(
    document: MeetingDocument
  ) {
    if (!document.file_path) {
      setError(
        "Tài liệu này chưa có đường dẫn lưu trữ."
      );
      return;
    }

    setOpeningDocumentId(
      document.id
    );

    setError("");
    setMessage("");

    const {
      data,
      error: storageError,
    } =
      await supabase.storage
        .from("meeting-documents")
        .createSignedUrl(
          document.file_path,
          60 * 10
        );

    if (storageError) {
      console.error(
        "Storage:",
        storageError
      );

      setError(
        `Không thể mở tài liệu: ${storageError.message}`
      );

      setOpeningDocumentId(null);
      return;
    }

    if (!data?.signedUrl) {
      setError(
        "Không tạo được đường dẫn mở tài liệu."
      );

      setOpeningDocumentId(null);
      return;
    }

    window.open(
      data.signedUrl,
      "_blank",
      "noopener,noreferrer"
    );

    setOpeningDocumentId(null);
  }

  /* =========================================================
     TOGGLE
========================================================= */

  function toggleMeeting(
    meetingId: number
  ) {
    setExpandedMeetingId(
      (current) =>
        current === meetingId
          ? null
          : meetingId
    );
  }

  /* =========================================================
     PAGE NUMBERS
========================================================= */

  function getPageNumbers() {
    const pages: (
      | number
      | string
    )[] = [];

    if (totalPages <= 7) {
      for (
        let i = 1;
        i <= totalPages;
        i++
      ) {
        pages.push(i);
      }

      return pages;
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push("...");
    }

    const start =
      Math.max(
        2,
        currentPage - 1
      );

    const end =
      Math.min(
        totalPages - 1,
        currentPage + 1
      );

    for (
      let i = start;
      i <= end;
      i++
    ) {
      pages.push(i);
    }

    if (
      currentPage <
      totalPages - 2
    ) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  }

  /* =========================================================
     RESET
========================================================= */

  function resetFilters() {
    setSearch("");
    setSelectedYear(
      "Tất cả"
    );
    setSelectedStatus(
      "Tất cả"
    );
    setCurrentPage(1);
    setExpandedMeetingId(
      null
    );
  }

  /* =========================================================
     RENDER
========================================================= */

  return (
    <main className="min-h-screen bg-slate-100">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-emerald-800 bg-emerald-800 text-white">

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

      <div className="mx-auto max-w-[1500px] px-5 py-5">

        {/* ===================================================
            TITLE
        =================================================== */}

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <h2 className="text-xl font-bold text-emerald-900">
              <span className="text-amber-500">
                📚{" "}
              </span>
              Hồ sơ cuộc họp
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Mỗi hồ sơ tương ứng với một cuộc họp.
            </p>

          </div>

          {/* SUMMARY */}

          <div className="flex gap-2">

            <div className="min-w-[100px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-center shadow-sm">

              <p className="text-xs text-slate-500">
                Cuộc họp
              </p>

              <p className="text-lg font-bold text-emerald-700">
                {meetings.length}
              </p>

            </div>

            <div className="min-w-[100px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-center shadow-sm">

              <p className="text-xs text-slate-500">
                Tài liệu
              </p>

              <p className="text-lg font-bold text-slate-700">
                {totalDocuments}
              </p>

            </div>

            <div className="min-w-[100px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-center shadow-sm">

              <p className="text-xs text-slate-500">
                Chờ duyệt
              </p>

              <p className="text-lg font-bold text-amber-700">
                {pendingDocuments}
              </p>

            </div>

          </div>

        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ===================================================
            SUCCESS MESSAGE
        =================================================== */}

        {message && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {/* ===================================================
            FILTER
        =================================================== */}

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">

          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_130px_170px_auto]">

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Tìm cuộc họp, địa điểm, chủ trì..."
              className="min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />

            <select
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(
                  event.target.value
                )
              }
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >

              {years.map(
                (year) => (
                  <option
                    key={`year-${year}`}
                    value={year}
                  >
                    {year ===
                    "Tất cả"
                      ? "Tất cả năm"
                      : year}
                  </option>
                )
              )}

            </select>

            <select
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(
                  event.target
                    .value as FilterStatus
                )
              }
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >

              <option value="Tất cả">
                Tất cả trạng thái
              </option>

              <option value="Đang chuẩn bị">
                Đang chuẩn bị
              </option>

              <option value="Đang diễn ra">
                Đang diễn ra
              </option>

              <option value="Đã kết thúc">
                Đã kết thúc
              </option>

              <option value="Đã hủy">
                Đã hủy
              </option>

            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              Đặt lại
            </button>

          </div>

        </div>

        {/* ===================================================
            TABLE
        =================================================== */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* TABLE HEADER */}

          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">

            <div>

              <h3 className="text-sm font-bold text-slate-900">
                Danh sách hồ sơ
              </h3>

              <p className="mt-0.5 text-xs text-slate-400">
                5 hồ sơ mỗi trang
              </p>

            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ↻ Làm mới
            </button>

          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (

            <div className="py-12 text-center text-sm text-slate-500">
              Đang tải kho hồ sơ...
            </div>

          ) : filteredMeetings.length === 0 ? (

            <div className="py-12 text-center">

              <div className="text-4xl">
                📁
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Chưa có hồ sơ phù hợp.
              </p>

            </div>

          ) : (

            <div className="w-full">

              <table className="w-full table-fixed border-collapse">

                <colgroup>

                  <col style={{ width: "5%" }} />

                  <col style={{ width: "29%" }} />

                  <col style={{ width: "12%" }} />

                  <col style={{ width: "15%" }} />

                  <col style={{ width: "9%" }} />

                  <col style={{ width: "15%" }} />

                  <col style={{ width: "15%" }} />

                </colgroup>

                <thead>

                  <tr className="border-b border-slate-200 bg-white">

                    <th className="px-2 py-3 text-center text-xs font-bold text-slate-500">
                      STT
                    </th>

                    <th className="px-2 py-3 text-left text-xs font-bold text-slate-500">
                      HỒ SƠ / CUỘC HỌP
                    </th>

                    <th className="px-2 py-3 text-left text-xs font-bold text-slate-500">
                      NGÀY / GIỜ
                    </th>

                    <th className="px-2 py-3 text-left text-xs font-bold text-slate-500">
                      ĐỊA ĐIỂM
                    </th>

                    <th className="px-2 py-3 text-center text-xs font-bold text-slate-500">
                      TÀI LIỆU
                    </th>

                    <th className="px-2 py-3 text-center text-xs font-bold text-slate-500">
                      TRẠNG THÁI
                    </th>

                    <th className="px-2 py-3 text-center text-xs font-bold text-slate-500">
                      THAO TÁC
                    </th>

                  </tr>

                </thead>

                {paginatedMeetings.map(
                  (
                    meeting,
                    index
                  ) => {

                    const meetingDocuments =
                      documentsByMeeting.get(
                        Number(
                          meeting.id
                        )
                      ) || [];

                    const documentStatus =
                      getMeetingDocumentStatus(
                        meetingDocuments
                      );

                    const expanded =
                      expandedMeetingId ===
                      meeting.id;

                    const globalIndex =
                      (currentPage -
                        1) *
                        PAGE_SIZE +
                      index +
                      1;

                    return (
                      <tbody
                        key={`meeting-group-${meeting.id}`}
                      >

                        {/* =================================================
                            MAIN ROW
                        ================================================= */}

                        <tr
                          className={`border-b border-slate-100 ${
                            expanded
                              ? "bg-emerald-50/40"
                              : "hover:bg-slate-50"
                          }`}
                        >

                          {/* STT */}

                          <td className="px-2 py-3 text-center text-sm text-slate-500">
                            {globalIndex}
                          </td>

                          {/* TITLE */}

                          <td className="px-2 py-3">

                            <button
                              type="button"
                              onClick={() =>
                                toggleMeeting(
                                  meeting.id
                                )
                              }
                              className="block w-full cursor-pointer text-left"
                            >

                              <div
                                className="line-clamp-2 text-sm font-semibold leading-5 text-slate-800 hover:text-emerald-700"
                                title={
                                  meeting.title
                                }
                              >
                                {
                                  meeting.title
                                }
                              </div>

                              <div
                                className="mt-1 truncate text-xs text-slate-400"
                                title={
                                  meeting.chairperson ||
                                  ""
                                }
                              >
                                Chủ trì:{" "}
                                {meeting.chairperson ||
                                  "—"}
                              </div>

                            </button>

                          </td>

                          {/* DATE */}

                          <td className="px-2 py-3">

                            <div className="text-sm text-slate-600">
                              {formatDate(
                                meeting.meeting_date
                              )}
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              {formatTime(
                                meeting.start_time
                              )}

                              {meeting.end_time
                                ? ` - ${formatTime(
                                    meeting.end_time
                                  )}`
                                : ""}
                            </div>

                          </td>

                          {/* LOCATION */}

                          <td className="px-2 py-3">

                            <div
                              className="line-clamp-2 text-sm leading-5 text-slate-600"
                              title={
                                meeting.location ||
                                ""
                              }
                            >
                              {meeting.location ||
                                "—"}
                            </div>

                          </td>

                          {/* DOCUMENT COUNT */}

                          <td className="px-2 py-3 text-center">

                            <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                              {
                                meetingDocuments.length
                              }
                            </span>

                          </td>

                          {/* STATUS */}

                          <td className="px-2 py-3 text-center">

                            <span
                              className={`inline-flex max-w-full items-center justify-center rounded-full border px-2.5 py-1 text-[10px] leading-4 ${documentStatusStyle(
                                documentStatus
                              )}`}
                            >
                              {
                                documentStatus
                              }
                            </span>

                          </td>

                          {/* ACTION */}

                          <td className="px-2 py-3">

                            <div className="flex items-center justify-center">

                              <button
                                type="button"
                                onClick={() =>
                                  toggleMeeting(
                                    meeting.id
                                  )
                                }
                                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition ${
                                  expanded
                                    ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                    : "bg-emerald-700 text-white hover:bg-emerald-800"
                                }`}
                              >
                                {expanded
                                  ? "Thu gọn"
                                  : "Xem"}
                              </button>

                            </div>

                          </td>

                        </tr>

                        {/* =================================================
                            DETAIL ROW
                        ================================================= */}

                        {expanded && (

                          <tr
                            className="border-b border-slate-200 bg-slate-50"
                          >

                            <td
                              colSpan={7}
                              className="px-3 py-3"
                            >

                              <div className="rounded-lg border border-slate-200 bg-white">

                                {/* MEETING INFO */}

                                <div className="grid gap-3 border-b border-slate-100 p-3 md:grid-cols-4">

                                  <div className="min-w-0">

                                    <div className="text-[10px] font-medium uppercase text-slate-400">
                                      Cuộc họp
                                    </div>

                                    <div className="mt-1 text-sm font-medium text-slate-700">
                                      {
                                        meeting.title
                                      }
                                    </div>

                                  </div>

                                  <div>

                                    <div className="text-[10px] font-medium uppercase text-slate-400">
                                      Thời gian
                                    </div>

                                    <div className="mt-1 text-sm text-slate-700">
                                      {formatDate(
                                        meeting.meeting_date
                                      )}

                                      {" • "}

                                      {formatTime(
                                        meeting.start_time
                                      )}

                                      {meeting.end_time
                                        ? ` - ${formatTime(
                                            meeting.end_time
                                          )}`
                                        : ""}
                                    </div>

                                  </div>

                                  <div className="min-w-0">

                                    <div className="text-[10px] font-medium uppercase text-slate-400">
                                      Địa điểm
                                    </div>

                                    <div className="mt-1 line-clamp-2 text-sm text-slate-700">
                                      {meeting.location ||
                                        "—"}
                                    </div>

                                  </div>

                                  <div>

                                    <div className="text-[10px] font-medium uppercase text-slate-400">
                                      Chủ trì
                                    </div>

                                    <div className="mt-1 text-sm text-slate-700">
                                      {meeting.chairperson ||
                                        "—"}
                                    </div>

                                  </div>

                                </div>

                                {/* DESCRIPTION */}

                                {meeting.description && (

                                  <div className="border-b border-slate-100 px-3 py-3">

                                    <div className="text-[10px] font-medium uppercase text-slate-400">
                                      Nội dung
                                    </div>

                                    <div className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
                                      {
                                        meeting.description
                                      }
                                    </div>

                                  </div>

                                )}

                                {/* SECRETARY + STATUS */}

                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-100 px-3 py-3">

                                  <div className="text-sm text-slate-500">

                                    Thư ký:

                                    <span className="ml-1 font-medium text-slate-700">
                                      {meeting.secretary ||
                                        "—"}
                                    </span>

                                  </div>

                                  <div className="text-sm text-slate-500">

                                    Trạng thái cuộc họp:

                                    <span
                                      className={`ml-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] ${meetingStatusStyle(
                                        meeting.status
                                      )}`}
                                    >
                                      {meeting.status ||
                                        "Đang chuẩn bị"}
                                    </span>

                                  </div>

                                </div>

                                {/* DOCUMENTS */}

                                <div className="p-3">

                                  <div className="mb-2 flex items-center justify-between">

                                    <h4 className="text-sm font-bold text-slate-700">
                                      Tài liệu cuộc họp
                                    </h4>

                                    <span className="text-xs text-slate-400">
                                      {
                                        meetingDocuments.length
                                      }{" "}
                                      tài liệu
                                    </span>

                                  </div>

                                  {meetingDocuments.length ===
                                  0 ? (

                                    <div className="rounded-lg border border-dashed border-slate-200 py-5 text-center text-xs text-slate-400">
                                      Hồ sơ này chưa có tài liệu.
                                    </div>

                                  ) : (

                                    <div className="overflow-hidden rounded-lg border border-slate-200">

                                      <table className="w-full table-fixed border-collapse">

                                        <colgroup>

                                          <col style={{ width: "5%" }} />

                                          <col style={{ width: "43%" }} />

                                          <col style={{ width: "13%" }} />

                                          <col style={{ width: "15%" }} />

                                          <col style={{ width: "12%" }} />

                                          <col style={{ width: "12%" }} />

                                        </colgroup>

                                        <thead>

                                          <tr className="border-b border-slate-100 bg-slate-50">

                                            <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500">
                                              STT
                                            </th>

                                            <th className="px-2 py-2.5 text-left text-[10px] font-bold text-slate-500">
                                              TÀI LIỆU
                                            </th>

                                            <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500">
                                              NGÀY
                                            </th>

                                            <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500">
                                              TRẠNG THÁI
                                            </th>

                                            <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500">
                                              NGƯỜI TẢI
                                            </th>

                                            <th className="px-2 py-2.5 text-center text-[10px] font-bold text-slate-500">
                                              XEM
                                            </th>

                                          </tr>

                                        </thead>

                                        <tbody>

                                          {meetingDocuments.map(
                                            (
                                              document,
                                              documentIndex
                                            ) => {

                                              const documentName =
                                                document.file_name ||
                                                document.name ||
                                                `Tài liệu ${
                                                  documentIndex +
                                                  1
                                                }`;

                                              return (
                                                <tr
                                                  key={`document-${meeting.id}-${document.id}`}
                                                  className="border-b border-slate-100 last:border-b-0"
                                                >

                                                  <td className="px-2 py-2.5 text-center text-xs text-slate-400">
                                                    {documentIndex +
                                                      1}
                                                  </td>

                                                  <td className="min-w-0 px-2 py-2.5">

                                                    <div
                                                      className="truncate text-sm text-slate-700"
                                                      title={
                                                        documentName
                                                      }
                                                    >
                                                      📄{" "}
                                                      {
                                                        documentName
                                                      }
                                                    </div>

                                                    {document.file_size && (

                                                      <div className="mt-0.5 text-xs text-slate-400">
                                                        {formatFileSize(
                                                          document.file_size
                                                        )}
                                                      </div>

                                                    )}

                                                  </td>

                                                  <td className="px-2 py-2.5 text-center text-xs text-slate-400">
                                                    {formatDate(
                                                      document.created_at
                                                    )}
                                                  </td>

                                                  <td className="px-2 py-2.5 text-center">

                                                    <span
                                                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] ${documentStatusStyle(
                                                        document.status
                                                      )}`}
                                                    >
                                                      {document.status ||
                                                        "Chờ duyệt"}
                                                    </span>

                                                  </td>

                                                  <td className="truncate px-2 py-2.5 text-center text-xs text-slate-500">
                                                    {document.uploaded_by ||
                                                      "—"}
                                                  </td>

                                                  <td className="px-2 py-2.5 text-center">

                                                    <button
                                                      type="button"
                                                      disabled={
                                                        openingDocumentId ===
                                                        document.id
                                                      }
                                                      onClick={() =>
                                                        openDocument(
                                                          document
                                                        )
                                                      }
                                                      className="cursor-pointer rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                      {openingDocumentId ===
                                                      document.id
                                                        ? "Mở..."
                                                        : "Xem"}
                                                    </button>

                                                  </td>

                                                </tr>
                                              );
                                            }
                                          )}

                                        </tbody>

                                      </table>

                                    </div>

                                  )}

                                </div>

                              </div>

                            </td>

                          </tr>

                        )}

                      </tbody>
                    );
                  }
                )}

              </table>

            </div>

          )}

          {/* =================================================
              PAGINATION
          ================================================= */}

          {!loading &&
            filteredMeetings.length >
              PAGE_SIZE && (

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

                <div className="text-xs text-slate-500">

                  Hiển thị{" "}
                  {(currentPage - 1) *
                    PAGE_SIZE +
                    1}
                  –
                  {Math.min(
                    currentPage *
                      PAGE_SIZE,
                    filteredMeetings.length
                  )}

                  {" / "}

                  {filteredMeetings.length}{" "}
                  hồ sơ

                </div>

                <div className="flex items-center justify-center gap-1">

                  {/* PREVIOUS */}

                  <button
                    type="button"
                    disabled={
                      currentPage === 1
                    }
                    onClick={() => {
                      setCurrentPage(
                        (page) =>
                          Math.max(
                            1,
                            page - 1
                          )
                      );

                      setExpandedMeetingId(
                        null
                      );
                    }}
                    className="cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Trước
                  </button>

                  {/* PAGE NUMBERS */}

                  {getPageNumbers().map(
                    (
                      page,
                      index
                    ) => {

                      if (
                        typeof page ===
                        "string"
                      ) {
                        return (
                          <span
                            key={`page-dots-${index}`}
                            className="px-1.5 text-xs text-slate-400"
                          >
                            …
                          </span>
                        );
                      }

                      return (
                        <button
                          key={`page-number-${page}`}
                          type="button"
                          onClick={() => {
                            setCurrentPage(
                              page
                            );

                            setExpandedMeetingId(
                              null
                            );
                          }}
                          className={`min-w-9 cursor-pointer rounded-md border px-2.5 py-1.5 text-xs transition ${
                            currentPage ===
                            page
                              ? "border-emerald-700 bg-emerald-700 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    }
                  )}

                  {/* NEXT */}

                  <button
                    type="button"
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    onClick={() => {
                      setCurrentPage(
                        (page) =>
                          Math.min(
                            totalPages,
                            page + 1
                          )
                      );

                      setExpandedMeetingId(
                        null
                      );
                    }}
                    className="cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau →
                  </button>

                </div>

              </div>

            )}

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">

          <span>
            {filteredMeetings.length ===
            0
              ? "Không có hồ sơ"
              : `Trang ${currentPage}/${totalPages}`}
          </span>

          <span>
            Kho lưu trữ: meeting-documents
          </span>

        </div>

      </div>

    </main>
  );
}

