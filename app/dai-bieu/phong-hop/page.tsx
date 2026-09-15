"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type Meeting = {
  id: number;
  title: string;
  meeting_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  status: string | null;
  created_at: string;
};

type MeetingSequence = {
  id: number;
  meeting_date: string | null;
  start_time: string | null;
  status: string | null;
};

type Participant = {
  id: number;
  meeting_id: number;
  profile_id: string | null;
  user_id: string | null;
  attendance_status: string | null;
};

type MeetingRow = Meeting & {
  attendance_status: string;
};


/*
 * =========================================================
 * PAGE
 * =========================================================
 */

export default function DaiBieuPhongHopPage() {
  const [meetings, setMeetings] =
    useState<Meeting[]>([]);

  /*
   * Toàn bộ cuộc họp của Tỉnh đoàn.
   *
   * Dùng riêng để tính số thứ tự toàn tỉnh.
   * Không dùng meetings vì meetings chỉ chứa
   * các cuộc họp mà đại biểu được mời.
   */
  const [allMeetings, setAllMeetings] =
    useState<MeetingSequence[]>([]);

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [currentUserName, setCurrentUserName] =
    useState("");

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [currentPage, setCurrentPage] =
    useState(1);

  const meetingsPerPage = 3;


  /*
   * =========================================================
   * TẢI DỮ LIỆU
   * =========================================================
   */

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      /*
       * =======================================================
       * 1. LẤY TÀI KHOẢN ĐANG ĐĂNG NHẬP
       * =======================================================
       */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "AUTH ERROR:",
          userError
        );

        setError(
          "Không xác định được tài khoản đại biểu."
        );

        setLoading(false);
        return;
      }

      console.log(
        "ĐẠI BIỂU ĐANG ĐĂNG NHẬP:",
        user.id
      );

      setCurrentUserId(user.id);


      /*
       * =======================================================
       * 2. LẤY PROFILE
       * =======================================================
       */

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name"
        )
        .eq(
          "id",
          user.id
        )
        .single();

      if (
        profileError ||
        !profile
      ) {
        console.error(
          "PROFILE ERROR:",
          profileError
        );

        setError(
          "Không lấy được thông tin đại biểu."
        );

        setLoading(false);
        return;
      }

      setCurrentUserName(
        profile.full_name || ""
      );


      /*
       * =======================================================
       * 3. LẤY TOÀN BỘ CUỘC HỌP
       * =======================================================
       *
       * Phần này dùng để tính số thứ tự cuộc họp
       * trên toàn hệ thống.
       *
       * Không dùng meetings bên dưới vì meetings chỉ
       * chứa các cuộc họp mà đại biểu được mời.
       *
       */

      const {
        data: allMeetingData,
        error: allMeetingError,
      } = await supabase
        .from("meetings")
        .select(
          "id, meeting_date, start_time, status"
        );

      if (allMeetingError) {
        console.error(
          "ALL MEETINGS ERROR:",
          allMeetingError
        );

        setError(
          `Không thể xác định số thứ tự cuộc họp: ${allMeetingError.message}`
        );

        setLoading(false);
        return;
      }

      setAllMeetings(
        (allMeetingData || []) as MeetingSequence[]
      );


      /*
       * =======================================================
       * 4. LẤY THÀNH PHẦN ĐƯỢC MỜI
       * =======================================================
       */

      const {
        data: participantData,
        error: participantError,
      } = await supabase
        .from("meeting_participants")
        .select(
          "id, meeting_id, profile_id, user_id, attendance_status"
        )
        .or(
          `user_id.eq.${user.id},profile_id.eq.${profile.id}`
        )
        .order(
          "id",
          {
            ascending: true,
          }
        );

      if (participantError) {
        console.error(
          "PARTICIPANT ERROR:",
          {
            message:
              participantError.message,
            details:
              participantError.details,
            hint:
              participantError.hint,
            code:
              participantError.code,
          }
        );

        setError(
          `Không thể tải danh sách cuộc họp: ${participantError.message}`
        );

        setLoading(false);
        return;
      }

      const participantRows =
        participantData || [];

      console.log(
        "CÁC DÒNG MEETING PARTICIPANTS:",
        participantRows
      );

      setParticipants(
        participantRows
      );


      /*
       * =======================================================
       * 5. NẾU CHƯA ĐƯỢC MỜI CUỘC HỌP NÀO
       * =======================================================
       *
       * Không return trước khi tính allMeetings.
       * allMeetings đã được lấy ở bước trên.
       *
       */

      if (
        participantRows.length === 0
      ) {
        setMeetings([]);
        setLoading(false);
        return;
      }


      /*
       * =======================================================
       * 6. LẤY ID CÁC CUỘC HỌP ĐƯỢC MỜI
       * =======================================================
       */

      const meetingIds = [
        ...new Set(
          participantRows.map(
            (item) =>
              item.meeting_id
          )
        ),
      ];

      console.log(
        "MEETING IDS:",
        meetingIds
      );


      /*
       * =======================================================
       * 7. LẤY THÔNG TIN CÁC CUỘC HỌP ĐƯỢC MỜI
       * =======================================================
       */

      const {
        data: meetingData,
        error: meetingError,
      } = await supabase
        .from("meetings")
        .select(
          "id, title, meeting_date, start_time, end_time, location, status, created_at"
        )
        .in(
          "id",
          meetingIds
        )
        .order(
          "meeting_date",
          {
            ascending: true,
          }
        );

      if (meetingError) {
        console.error(
          "MEETING ERROR:",
          meetingError
        );

        setError(
          `Không thể tải thông tin cuộc họp: ${meetingError.message}`
        );

        setLoading(false);
        return;
      }

      setMeetings(
        meetingData || []
      );

    } catch (err) {
      console.error(
        "LOAD DATA ERROR:",
        err
      );

      setError(
        "Có lỗi xảy ra khi tải phòng họp."
      );
    }

    setLoading(false);
  }


  /*
   * =========================================================
   * TẢI KHI MỞ TRANG
   * =========================================================
   */

  useEffect(() => {
    loadData();
  }, []);


  /*
   * =========================================================
   * CHUẨN HÓA TRẠNG THÁI
   * =========================================================
   */

  function normalizeAttendanceStatus(
    status: string | null
  ) {
    if (
      status === "Tham dự" ||
      status === "Đã xác nhận" ||
      status ===
        "Đã xác nhận tham dự"
    ) {
      return "Tham dự";
    }

    if (
      status === "Không tham dự" ||
      status === "Từ chối"
    ) {
      return "Không tham dự";
    }

    return "Chưa xác nhận";
  }


  /*
   * =========================================================
   * GHÉP CUỘC HỌP + TRẠNG THÁI ĐẠI BIỂU
   * =========================================================
   */

  const meetingRows: MeetingRow[] =
    useMemo(() => {

      return meetings.map(
        (meeting) => {

          const sameMeeting =
            participants.filter(
              (item) =>
                item.meeting_id ===
                meeting.id
            );


          /*
           * Không có participant
           */

          if (
            sameMeeting.length === 0
          ) {
            return {
              ...meeting,
              attendance_status:
                "Chưa xác nhận",
            };
          }


          /*
           * Tìm dòng gắn trực tiếp với USER
           */

          const userParticipant =
            sameMeeting.find(
              (item) =>
                item.user_id ===
                currentUserId
            );


          /*
           * Tìm theo PROFILE
           */

          const profileParticipant =
            sameMeeting.find(
              (item) =>
                item.profile_id ===
                currentUserId
            );


          /*
           * Ưu tiên dòng user.
           */

          let selectedParticipant =
            userParticipant ||
            profileParticipant;


          /*
           * Nếu vẫn chưa chắc chắn,
           * ưu tiên dòng đã có trạng thái thực tế.
           */

          if (
            !selectedParticipant ||
            normalizeAttendanceStatus(
              selectedParticipant
                .attendance_status
            ) ===
              "Chưa xác nhận"
          ) {

            const attendedParticipant =
              sameMeeting.find(
                (item) =>
                  normalizeAttendanceStatus(
                    item.attendance_status
                  ) ===
                  "Tham dự"
              );

            if (
              attendedParticipant
            ) {
              selectedParticipant =
                attendedParticipant;
            } else {

              const absentParticipant =
                sameMeeting.find(
                  (item) =>
                    normalizeAttendanceStatus(
                      item.attendance_status
                    ) ===
                    "Không tham dự"
                );

              if (
                absentParticipant
              ) {
                selectedParticipant =
                  absentParticipant;
              }
            }
          }


          return {
            ...meeting,
            attendance_status:
              normalizeAttendanceStatus(
                selectedParticipant
                  ?.attendance_status ||
                  null
              ),
          };
        }
      );

    }, [
      meetings,
      participants,
      currentUserId,
    ]);


  /*
   * =========================================================
   * CHỈ HIỂN THỊ CUỘC HỌP TRONG 5 NGÀY
   * =========================================================
   *
   * - Cuộc họp chưa diễn ra: hiển thị
   * - Cuộc họp đã kết thúc: vẫn hiển thị 5 ngày
   * - Quá 5 ngày kể từ ngày họp: ẩn
   *
   */

  const upcomingMeetings =
    meetingRows
      .filter(
        (meeting) => {

          if (
            !meeting.meeting_date
          ) {
            return true;
          }

          const today =
            new Date();

          today.setHours(
            0,
            0,
            0,
            0
          );

          const meetingDate =
            new Date(
              `${meeting.meeting_date}T00:00:00`
            );

          const daysPassed =
            Math.floor(
              (
                today.getTime() -
                meetingDate.getTime()
              ) /
                (
                  1000 *
                  60 *
                  60 *
                  24
                )
            );

          /*
           * Quá 5 ngày thì ẩn.
           */

          if (
            daysPassed > 5
          ) {
            return false;
          }

          return true;
        }
      )
      .sort(
        (a, b) => {

          const dateA =
            new Date(
              `${a.meeting_date}T${
                a.start_time ||
                "00:00"
              }`
            ).getTime();

          const dateB =
            new Date(
              `${b.meeting_date}T${
                b.start_time ||
                "00:00"
              }`
            ).getTime();

          return dateA - dateB;
        }
      );


  /*
   * =========================================================
   * TÍNH SỐ THỨ TỰ CUỘC HỌP TOÀN TỈNH
   * =========================================================
   *
   * Số này phải khớp với số thứ tự ở trang Quản trị.
   *
   * Ví dụ:
   *
   * DB id = 18
   * Số thứ tự toàn tỉnh = 1
   *
   * URL:
   *
   * /dai-bieu/phong-hop/1
   *
   * Không bao giờ đưa DB id lên URL.
   *
   */

  const meetingSequenceMap =
    useMemo(() => {

      const sortedMeetings =
        [...allMeetings].sort(
          (a, b) => {

            const aFinished =
              a.status ===
              "Đã kết thúc";

            const bFinished =
              b.status ===
              "Đã kết thúc";


            /*
             * Cuộc họp chưa kết thúc
             * đứng trước.
             */

            if (
              aFinished !==
              bFinished
            ) {
              return aFinished
                ? 1
                : -1;
            }


            /*
             * Ngày mới hơn đứng trước.
             */

            const dateA =
              a.meeting_date ||
              "";

            const dateB =
              b.meeting_date ||
              "";

            if (
              dateA !== dateB
            ) {
              return dateB.localeCompare(
                dateA
              );
            }


            /*
             * Giờ mới hơn đứng trước.
             */

            const timeA =
              a.start_time ||
              "";

            const timeB =
              b.start_time ||
              "";

            if (
              timeA !== timeB
            ) {
              return timeB.localeCompare(
                timeA
              );
            }


            /*
             * Nếu trùng ngày + giờ,
             * ID lớn hơn đứng trước.
             */

            return b.id - a.id;
          }
        );


      const map =
        new Map<number, number>();


      sortedMeetings.forEach(
        (
          meeting,
          index
        ) => {

          map.set(
            meeting.id,
            index + 1
          );

        }
      );


      return map;

    }, [
      allMeetings,
    ]);


  /*
   * =========================================================
   * ĐẾM CHƯA XÁC NHẬN
   * =========================================================
   */

  const pendingCount =
    meetingRows.filter(
      (meeting) =>
        meeting.attendance_status ===
        "Chưa xác nhận"
    ).length;


  /*
   * =========================================================
   * PHÂN TRANG
   * =========================================================
   */

  const totalPages =
    Math.ceil(
      upcomingMeetings.length /
        meetingsPerPage
    );


  const paginatedMeetings =
    upcomingMeetings.slice(
      (currentPage - 1) *
        meetingsPerPage,
      currentPage *
        meetingsPerPage
    );


  useEffect(() => {

    if (
      currentPage >
        totalPages &&
      totalPages > 0
    ) {
      setCurrentPage(
        totalPages
      );
    }

  }, [
    currentPage,
    totalPages,
  ]);


  /*
   * =========================================================
   * ĐỊNH DẠNG NGÀY
   * =========================================================
   */

  function formatDate(
    date: string | null
  ) {

    if (!date) {
      return "Chưa xác định";
    }

    const value =
      new Date(
        `${date}T00:00:00`
      );

    return value.toLocaleDateString(
      "vi-VN",
      {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }


  /*
   * =========================================================
   * KIỂM TRA CUỘC HỌP ĐÃ KẾT THÚC
   * =========================================================
   */

  function isMeetingFinished(
    meeting: Meeting
  ) {

    if (
      !meeting.meeting_date
    ) {
      return false;
    }

    const endTime =
      meeting.end_time ||
      "23:59";

    const meetingEnd =
      new Date(
        `${meeting.meeting_date}T${endTime.slice(
          0,
          5
        )}:00`
      );

    return (
      new Date() >
      meetingEnd
    );
  }


  /*
   * =========================================================
   * ĐỊNH DẠNG GIỜ
   * =========================================================
   */

  function formatTime(
    time: string | null
  ) {

    if (!time) {
      return "";
    }

    return time.slice(
      0,
      5
    );
  }


  /*
   * =========================================================
   * MÀU TRẠNG THÁI
   * =========================================================
   */

  function getAttendanceStyle(
    status: string
  ) {

    if (
      status ===
      "Tham dự"
    ) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }


    if (
      status ===
      "Không tham dự"
    ) {
      return "border-slate-200 bg-slate-100 text-slate-600";
    }


    return "border-amber-300 bg-amber-100 text-amber-800";
  }


  /*
   * =========================================================
   * NHÃN TRẠNG THÁI
   * =========================================================
   */

  function getAttendanceLabel(
    status: string
  ) {

    if (
      status ===
      "Tham dự"
    ) {
      return "Tham dự";
    }


    if (
      status ===
      "Không tham dự"
    ) {
      return "Không tham dự";
    }


    return "Chưa xác nhận";
  }


  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-slate-50">

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
                {currentUserName ||
                  "Đang tải..."}
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

      <div className="mx-auto max-w-6xl px-4 py-5">

        {/* ===================================================
            THÔNG BÁO
        =================================================== */}

        {pendingCount > 0 && (

          <div className="mb-5 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
              !
            </div>

            <div className="min-w-0">

              <p className="text-sm font-medium text-amber-900">
                Anh/chị có{" "}
                {pendingCount}{" "}
                cuộc họp chưa xác nhận.
              </p>

              <p className="mt-0.5 text-xs text-amber-700">
                Nhấp vào cuộc họp để xem thông tin và xác nhận tham dự.
              </p>

            </div>

          </div>

        )}


        {/* ===================================================
            TIÊU ĐỀ DANH SÁCH
        =================================================== */}

        <div className="mb-5 flex items-end justify-between">

          <div>

            <h2 className="flex items-center gap-2 text-xl font-bold text-emerald-900">

              <span className="text-amber-500">
                📋
              </span>

              Thông tin lịch họp của Tỉnh đoàn

            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Các cuộc họp anh/chị được mời tham dự
            </p>

          </div>


          {!loading &&
            upcomingMeetings.length >
              0 && (

              <span className="text-xs text-slate-400">

                Trang{" "}
                {currentPage}/
                {totalPages}
                {" · "}
                {upcomingMeetings.length}{" "}
                cuộc họp sắp diễn ra

              </span>

            )}

        </div>


        {/* ===================================================
            LOADING
        =================================================== */}

        {loading && (

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center">

            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />

            <p className="mt-3 text-sm text-slate-500">
              Đang tải danh sách cuộc họp...
            </p>

          </div>

        )}


        {/* ===================================================
            ERROR
        =================================================== */}

        {!loading &&
          error && (

            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>

          )}


        {/* ===================================================
            EMPTY
        =================================================== */}

        {!loading &&
          !error &&
          upcomingMeetings.length ===
            0 && (

            <div className="rounded-xl border border-slate-200 bg-white px-5 py-14 text-center">

              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-400">
                ▤
              </div>

              <h3 className="mt-3 text-sm font-semibold text-slate-800">
                Chưa có cuộc họp sắp tới
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Khi có lịch họp mới, thông tin sẽ được hiển thị tại đây.
              </p>

            </div>

          )}


        {/* ===================================================
            DANH SÁCH CUỘC HỌP
        =================================================== */}

        {!loading &&
          !error &&
          upcomingMeetings.length >
            0 && (

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

              {/* TABLE HEADER */}

              <div className="hidden grid-cols-[170px_minmax(0,1fr)_170px_70px] border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">

                <div>
                  Thời gian
                </div>

                <div>
                  Nội dung cuộc họp
                </div>

                <div>
                  Tham dự
                </div>

                <div />

              </div>


              {/* ROWS */}

              <div className="divide-y divide-slate-100">

                {paginatedMeetings.map(
                  (meeting) => {

                    const meetingOrder =
                      meetingSequenceMap.get(
                        meeting.id
                      );

                    return (

                      <Link
                        key={meeting.id}
                        href={
                          meetingOrder
                            ? `/dai-bieu/phong-hop/${meetingOrder}`
                            : "#"
                        }
                        className="group block transition hover:bg-amber-50"
                      >

                        {/* =================================================
                            DESKTOP
                        ================================================= */}

                        <div className="hidden grid-cols-[170px_minmax(0,1fr)_170px_70px] items-center px-4 py-3.5 md:grid">

                          {/* TIME */}

                          {(() => {

                            const now =
                              new Date();

                            const meetingDate =
                              new Date(
                                `${meeting.meeting_date}T00:00:00`
                              );

                            const meetingEnd =
                              new Date(
                                meetingDate
                              );

                            if (
                              meeting.end_time
                            ) {

                              const [
                                hours,
                                minutes,
                              ] =
                                meeting.end_time
                                  .slice(
                                    0,
                                    5
                                  )
                                  .split(
                                    ":"
                                  )
                                  .map(
                                    Number
                                  );

                              meetingEnd.setHours(
                                hours,
                                minutes,
                                0,
                                0
                              );

                            } else if (
                              meeting.start_time
                            ) {

                              const [
                                hours,
                                minutes,
                              ] =
                                meeting.start_time
                                  .slice(
                                    0,
                                    5
                                  )
                                  .split(
                                    ":"
                                  )
                                  .map(
                                    Number
                                  );

                              meetingEnd.setHours(
                                hours + 1,
                                minutes,
                                0,
                                0
                              );

                            }

                            const isFinished =
                              now >
                              meetingEnd;

                            return (

                              <div
                                className={`inline-flex w-fit flex-col rounded-lg px-3 py-2 ${
                                  isFinished
                                    ? "bg-slate-100"
                                    : "bg-amber-50"
                                }`}
                              >

                                <div
                                  className={`text-sm font-semibold ${
                                    isFinished
                                      ? "text-slate-900"
                                      : "text-amber-800"
                                  }`}
                                >

                                  {formatDate(
                                    meeting.meeting_date
                                  )}

                                </div>

                                <div
                                  className={`mt-0.5 text-xs font-semibold ${
                                    isFinished
                                      ? "text-slate-900"
                                      : "text-amber-700"
                                  }`}
                                >

                                  {formatTime(
                                    meeting.start_time
                                  )}

                                  {meeting.end_time &&
                                    ` – ${formatTime(
                                      meeting.end_time
                                    )}`}

                                </div>

                                {isFinished && (

                                  <div className="mt-1 text-[10px] font-semibold text-slate-700">
                                    Cuộc họp đã kết thúc
                                  </div>

                                )}

                              </div>

                            );

                          })()}


                          {/* CONTENT */}

                          <div className="min-w-0 pr-5">

                            <p className="truncate text-sm font-medium text-slate-800 group-hover:text-emerald-700">
                              {meeting.title}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {meeting.location ||
                                "Chưa cập nhật địa điểm"}
                            </p>

                          </div>


                          {/* ATTENDANCE */}

                          <div>

                            <span
                              className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${getAttendanceStyle(
                                meeting.attendance_status
                              )}`}
                            >

                              {getAttendanceLabel(
                                meeting.attendance_status
                              )}

                            </span>

                          </div>


                          {/* ARROW */}

                          <div className="text-right text-sm text-slate-300 transition group-hover:text-emerald-600">
                            →
                          </div>

                        </div>


                        {/* =================================================
                            MOBILE
                        ================================================= */}

                        <div className="px-4 py-3.5 md:hidden">

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0 flex-1">

                              <div className="text-xs font-medium text-emerald-700">
                                {formatDate(
                                  meeting.meeting_date
                                )}
                              </div>

                              <div className="mt-0.5 text-xs text-slate-500">

                                {formatTime(
                                  meeting.start_time
                                )}

                                {meeting.end_time &&
                                  ` – ${formatTime(
                                    meeting.end_time
                                  )}`}

                              </div>

                            </div>


                            <span
                              className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium ${getAttendanceStyle(
                                meeting.attendance_status
                              )}`}
                            >

                              {getAttendanceLabel(
                                meeting.attendance_status
                              )}

                            </span>

                          </div>


                          <p className="mt-2 text-sm font-medium leading-5 text-slate-800">
                            {meeting.title}
                          </p>


                          <p className="mt-1 text-xs text-slate-500">
                            {meeting.location ||
                              "Chưa cập nhật địa điểm"}
                          </p>


                          <div className="mt-2 text-right text-xs font-medium text-emerald-600">
                            Xem cuộc họp →
                          </div>

                        </div>

                      </Link>

                    );

                  }
                )}

              </div>

            </div>

          )}


        {/* ===================================================
            PHÂN TRANG
        =================================================== */}

        {totalPages > 1 && (

          <div className="mt-4 flex items-center justify-between">

            <button
              type="button"
              disabled={
                currentPage === 1
              }
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    page - 1
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Trang trước
            </button>


            <div className="flex items-center gap-1">

              {Array.from(
                {
                  length:
                    totalPages,
                },
                (_, index) =>
                  index + 1
              ).map(
                (page) => (

                  <button
                    key={page}
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        page
                      )
                    }
                    className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${
                      currentPage ===
                      page
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>

                )
              )}

            </div>


            <button
              type="button"
              disabled={
                currentPage ===
                totalPages
              }
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    page + 1
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang sau →
            </button>

          </div>

        )}

      </div>

    </main>
  );
}