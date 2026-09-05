"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type MeetingStatus =
  | "Đang chuẩn bị"
  | "Đã phát hành"
  | "Đã kết thúc";

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
  created_at: string;
};

const ITEMS_PER_PAGE = 5;

export default function PhongHopPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentUserName, setCurrentUserName] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tất cả");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [deletingMeetingId, setDeletingMeetingId] =
    useState<number | null>(null);

  // =====================================================
  // TẢI DANH SÁCH CUỘC HỌP
  // =====================================================

  async function loadMeetings() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("meetings")
      .select(`
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
      `)
      .order("meeting_date", {
        ascending: false,
        nullsFirst: false,
      })
      .order("start_time", {
        ascending: false,
        nullsFirst: false,
      });

    if (error) {
      console.error(
        "LỖI TẢI CUỘC HỌP:",
        error
      );

      setError(
        `Không thể tải danh sách cuộc họp: ${error.message}`
      );

      setMeetings([]);
    } else {
      setMeetings(
        (data || []) as Meeting[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMeetings();
  }, []);

  // =====================================================
  // TẢI THÔNG TIN NGƯỜI DÙNG
  // =====================================================

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
          "Điều hành viên"
      );
    }

    loadCurrentUser();
  }, []);

  // =====================================================
  // LỌC
  // =====================================================

  const filteredMeetings =
    meetings.filter((meeting) => {
      const keyword =
        search.trim().toLowerCase();

      const matchSearch =
        !keyword ||
        meeting.title
          .toLowerCase()
          .includes(keyword) ||
        (meeting.location || "")
          .toLowerCase()
          .includes(keyword) ||
        (meeting.chairperson || "")
          .toLowerCase()
          .includes(keyword) ||
        (meeting.secretary || "")
          .toLowerCase()
          .includes(keyword) ||
        (meeting.description || "")
          .toLowerCase()
          .includes(keyword);

      const matchStatus =
        status === "Tất cả" ||
        meeting.status === status;

      return (
        matchSearch &&
        matchStatus
      );
    });

  // =====================================================
  // SẮP XẾP
  //
  // Cuộc họp chưa kết thúc nằm trước.
  // Cuộc họp đã kết thúc nằm sau.
  // =====================================================

  const sortedMeetings =
    [...filteredMeetings].sort(
      (a, b) => {
        const aFinished =
          a.status === "Đã kết thúc";

        const bFinished =
          b.status === "Đã kết thúc";

        if (
          aFinished &&
          !bFinished
        ) {
          return 1;
        }

        if (
          !aFinished &&
          bFinished
        ) {
          return -1;
        }

        const dateA =
          a.meeting_date ||
          "9999-12-31";

        const dateB =
          b.meeting_date ||
          "9999-12-31";

        if (dateA !== dateB) {
          return dateB.localeCompare(
            dateA
          );
        }

        return (
          (b.start_time || "").localeCompare(
            a.start_time || ""
          )
        );
      }
    );

  // =====================================================
  // THỐNG KÊ
  // =====================================================

  const total = meetings.length;

  const preparing =
    meetings.filter(
      (meeting) =>
        meeting.status ===
        "Đang chuẩn bị"
    ).length;

  const upcoming =
    meetings.filter(
      (meeting) =>
        meeting.status ===
        "Đã phát hành"
    ).length;

  const finished =
    meetings.filter(
      (meeting) =>
        meeting.status ===
        "Đã kết thúc"
    ).length;

  // =====================================================
  // PHÂN TRANG
  // =====================================================

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        sortedMeetings.length /
          ITEMS_PER_PAGE
      )
    );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );

  const startIndex =
    (safeCurrentPage - 1) *
    ITEMS_PER_PAGE;

  const paginatedMeetings =
    sortedMeetings.slice(
      startIndex,
      startIndex +
        ITEMS_PER_PAGE
    );

  // =====================================================
  // ĐỔI TRANG
  // =====================================================

  function changePage(
    page: number
  ) {
    if (
      page < 1 ||
      page > totalPages
    ) {
      return;
    }

    setCurrentPage(page);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =====================================================
  // TÌM KIẾM / LỌC
  // =====================================================

  function handleSearchChange(
    value: string
  ) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleStatusChange(
    value: string
  ) {
    setStatus(value);
    setCurrentPage(1);
  }

  // =====================================================
  // XÓA TOÀN BỘ CUỘC HỌP
  // =====================================================

  async function handleDeleteMeeting(
    meetingId: number,
    meetingTitle: string
  ) {
    const confirmed =
      window.confirm(
        `Bạn có chắc chắn muốn xóa cuộc họp:\n\n"${meetingTitle}"\n\nToàn bộ dữ liệu bên trong cuộc họp này sẽ bị xóa, bao gồm đại biểu, tài liệu, ý kiến, biểu quyết, biên bản, kết luận, nhiệm vụ và các dữ liệu liên quan.\n\nHành động này không thể hoàn tác.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingMeetingId(meetingId);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/phong-hop/xoa",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              meetingId,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Không thể xóa cuộc họp."
        );
      }

      await loadMeetings();

      setCurrentPage(1);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "LỖI XÓA CUỘC HỌP:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Không thể xóa cuộc họp."
      );
    } finally {
      setDeletingMeetingId(null);
    }
  }

  // =====================================================
  // GIAO DIỆN
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-100">

      {/* =================================================
          HEADER
      ================================================= */}

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


      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="mx-auto max-w-7xl px-5 py-6">

        {/* TIÊU ĐỀ */}

        <div className="mb-5 flex items-center justify-between">

          <div>

            <h2 className="text-lg font-bold text-emerald-900">

              <span className="text-amber-500">
                🗂️{" "}
              </span>

              Phòng họp không giấy

            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Quản lý hồ sơ, tài liệu và nội dung các cuộc họp.
            </p>

          </div>

          <Link
            href="/quan-tri/dieu-hanh/phong-hop/tao-moi"
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            + Tạo cuộc họp
          </Link>

        </div>


        {/* =================================================
            THỐNG KÊ
        ================================================= */}

        <div className="mb-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            title="Tổng số cuộc họp"
            value={total}
            className="bg-blue-50"
            valueClassName="text-blue-700"
          />

          <SummaryCard
            title="Đang chuẩn bị"
            value={preparing}
            className="bg-amber-50"
            valueClassName="text-amber-700"
          />

          <SummaryCard
            title="Sắp diễn ra"
            value={upcoming}
            className="bg-emerald-50"
            valueClassName="text-emerald-700"
          />

          <SummaryCard
            title="Đã kết thúc"
            value={finished}
            className="bg-slate-200"
            valueClassName="text-slate-600"
          />

        </div>


        {/* =================================================
            LỖI
        ================================================= */}

        {error && (

          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

            {error}

          </div>

        )}


        {/* =================================================
            TÌM KIẾM
        ================================================= */}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 lg:flex-row">

            <input
              value={search}
              onChange={(event) =>
                handleSearchChange(
                  event.target.value
                )
              }
              placeholder="Tìm theo tên cuộc họp, chủ trì, thư ký, địa điểm..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />

            <select
              value={status}
              onChange={(event) =>
                handleStatusChange(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >

              <option value="Tất cả">
                Tất cả
              </option>

              <option value="Đang chuẩn bị">
                Đang chuẩn bị
              </option>

              <option value="Đã phát hành">
                Sắp diễn ra
              </option>

              <option value="Đã kết thúc">
                Đã kết thúc
              </option>

            </select>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatus("Tất cả");
                setCurrentPage(1);
                loadMeetings();
              }}
              className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Làm mới
            </button>

          </div>

        </div>


        {/* =================================================
            DANH SÁCH
        ================================================= */}

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">

            Đang tải danh sách cuộc họp...

          </div>

        ) : paginatedMeetings.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">

            <p className="text-sm font-semibold text-slate-700">
              Không có cuộc họp
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Chưa có dữ liệu phù hợp.
            </p>

            <Link
              href="/quan-tri/dieu-hanh/phong-hop/tao-moi"
              className="mt-4 inline-block rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              + Tạo cuộc họp
            </Link>

          </div>

        ) : (

          <>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {paginatedMeetings.map(
                (meeting, index) => {

                  const globalIndex =
                    startIndex +
                    index +
                    1;

                  return (
                    <MeetingRow
                      key={meeting.id}
                      meeting={meeting}
                      index={globalIndex}
                      onDelete={
                        handleDeleteMeeting
                      }
                      deletingMeetingId={
                        deletingMeetingId
                      }
                    />
                  );
                }
              )}

            </div>


            {/* =================================================
                PHÂN TRANG
            ================================================= */}

            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">

              <p className="text-xs text-slate-500">

                Hiển thị{" "}

                <span className="font-semibold text-slate-700">
                  {sortedMeetings.length === 0
                    ? 0
                    : startIndex + 1}
                </span>

                {" - "}

                <span className="font-semibold text-slate-700">
                  {Math.min(
                    startIndex +
                      ITEMS_PER_PAGE,
                    sortedMeetings.length
                  )}
                </span>

                {" / "}

                <span className="font-semibold text-slate-700">
                  {sortedMeetings.length}
                </span>{" "}

                cuộc họp

              </p>


              <div className="flex items-center gap-1">

                <button
                  type="button"
                  disabled={
                    safeCurrentPage ===
                    1
                  }
                  onClick={() =>
                    changePage(
                      safeCurrentPage -
                        1
                    )
                  }
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Trước
                </button>


                {Array.from(
                  {
                    length:
                      totalPages,
                  },
                  (_, index) =>
                    index + 1
                ).map((page) => (

                  <button
                    key={page}
                    type="button"
                    onClick={() =>
                      changePage(
                        page
                      )
                    }
                    className={`min-w-9 cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      page ===
                      safeCurrentPage
                        ? "bg-emerald-700 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>

                ))}


                <button
                  type="button"
                  disabled={
                    safeCurrentPage ===
                    totalPages
                  }
                  onClick={() =>
                    changePage(
                      safeCurrentPage +
                        1
                    )
                  }
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau →
                </button>

              </div>

            </div>

          </>

        )}

      </div>

    </main>
  );
}


/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  className,
  valueClassName,
}: {
  title: string;
  value: number;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 p-4 shadow-sm ${
        className || "bg-white"
      }`}
    >

      <p className="text-xs font-medium text-slate-500">
        {title}
      </p>

      <p
        className={`mt-1 text-2xl font-bold ${
          valueClassName ||
          "text-slate-800"
        }`}
      >
        {value}
      </p>

    </div>
  );
}


/* =========================================================
   MEETING ROW
========================================================= */

function MeetingRow({
  meeting,
  index,
  onDelete,
  deletingMeetingId,
}: {
  meeting: Meeting;
  index: number;
  onDelete: (
    meetingId: number,
    meetingTitle: string
  ) => void;
  deletingMeetingId: number | null;
}) {
  const isFinished =
    meeting.status ===
    "Đã kết thúc";

  const isPublished =
    meeting.status ===
    "Đã phát hành";

  const isDeleting =
    deletingMeetingId ===
    meeting.id;

  return (
    <div
      className={`border-b border-slate-100 px-4 py-4 last:border-b-0 transition ${
        isFinished
          ? "bg-slate-50"
          : "hover:bg-slate-50"
      }`}
    >

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

        {/* STT */}

        <div className="w-8 shrink-0 text-center text-xs font-semibold text-slate-400">
          {index}
        </div>


        {/* NGÀY + GIỜ */}

        <div className="w-full shrink-0 lg:w-36">

          <div
            className={`text-sm font-bold ${
              isFinished
                ? "text-slate-400"
                : "text-slate-800"
            }`}
          >
            {formatDate(
              meeting.meeting_date
            )}
          </div>

          <div
            className={`mt-0.5 text-xs ${
              isFinished
                ? "text-slate-400"
                : "text-slate-500"
            }`}
          >
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


        {/* NỘI DUNG */}

        <div className="min-w-0 flex-1">

          <div
            className={`text-sm ${
              isFinished
                ? "text-slate-400"
                : "text-slate-700"
            }`}
          >
            {meeting.title}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">

            <span
              className={
                isFinished
                  ? "text-slate-400"
                  : "text-slate-500"
              }
            >
              📍{" "}
              {meeting.location ||
                "Chưa xác định địa điểm"}
            </span>

            {meeting.chairperson && (

              <span
                className={
                  isFinished
                    ? "text-slate-400"
                    : "text-slate-500"
                }
              >
                Chủ trì:{" "}
                {meeting.chairperson}
              </span>

            )}

          </div>

        </div>


        {/* TRẠNG THÁI */}

        <div className="shrink-0">

          {isFinished ? (

            <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500">
              Đã hoàn thành
            </span>

          ) : isPublished ? (

            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              Sắp diễn ra
            </span>

          ) : (

            <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
              Đang chuẩn bị
            </span>

          )}

        </div>


        {/* =================================================
            CÁC NÚT CHỨC NĂNG
        ================================================= */}

        <div className="flex shrink-0 items-center gap-2 lg:w-auto">

          {/* SỬA
              Chỉ hiển thị khi chưa kết thúc
          */}

          {!isFinished && (

            <Link
              href={`/quan-tri/dieu-hanh/phong-hop/${meeting.id}/sua`}
              className="flex h-8 cursor-pointer items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-normal text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
            >
              ✎ Sửa
            </Link>

          )}


          {/* XÓA
              Tất cả trạng thái đều được phép xóa
          */}

          <button
            type="button"
            disabled={isDeleting}
            onClick={() =>
              onDelete(
                meeting.id,
                meeting.title
              )
            }
            className="flex h-8 cursor-pointer items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-normal text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting
              ? "Đang xóa..."
              : "🗑 Xóa"}
          </button>


          {/* MỞ HỒ SƠ */}

          <Link
            href={`/quan-tri/dieu-hanh/phong-hop/${meeting.id}`}
            className="flex h-8 cursor-pointer items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-normal text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
          >
            Mở hồ sơ →
          </Link>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
  date: string | null
) {
  if (!date) {
    return "Chưa xác định";
  }

  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    "vi-VN"
  );
}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
  time: string | null
) {
  if (!time) {
    return "";
  }

  return time.slice(0, 5);
}