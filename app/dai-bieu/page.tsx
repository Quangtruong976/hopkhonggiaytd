"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Meeting = {
  id: number;
  title: string;
  meeting_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  attendance_status: string | null;
};

type MeetingParticipant = {
  id: number;
  meeting_id: number;
  attendance_status: string | null;
};

export default function DaiBieuPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Tên thật của đại biểu đang đăng nhập
  const [currentUserName, setCurrentUserName] = useState("");

  // Số phiếu xin ý kiến đang chờ đại biểu thực hiện
  const [pendingOpinionCount, setPendingOpinionCount] =
    useState(0);

  useEffect(() => {
    loadMeetings();
  }, []);

  /* =========================================================
     LOAD DỮ LIỆU
  ========================================================= */

  async function loadMeetings() {
    setLoading(true);

    try {
      /*
       * =======================================================
       * 1. XÁC ĐỊNH TÀI KHOẢN ĐANG ĐĂNG NHẬP
       * =======================================================
       */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "Không xác định được người dùng:",
          userError
        );

        setMeetings([]);
        setCurrentUserName("");
        setPendingOpinionCount(0);

        return;
      }

      console.log("USER ĐANG ĐĂNG NHẬP:", user.id);

      /*
       * =======================================================
       * 2. LẤY TÊN ĐẠI BIỂU TỪ PROFILES
       * =======================================================
       *
       * Không dùng tên cố định.
       * Mỗi tài khoản sẽ lấy đúng full_name của tài khoản đó.
       */

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      let userName = "";

      if (profileError) {
        console.error(
          "Lỗi lấy profile:",
          profileError
        );

        /*
         * Nếu profile không lấy được thì dùng email
         * của tài khoản Auth.
         */
        userName =
          user.email ||
          "Đại biểu";

        setCurrentUserName(userName);
      } else {
        userName =
          profile?.full_name ||
          user.email ||
          "Đại biểu";

        setCurrentUserName(userName);
      }

      /*
       * =======================================================
       * 2.1. ĐẾM PHIẾU XIN Ý KIẾN ĐANG CHỜ
       * =======================================================
       *
       * opinion_participants hiện lưu:
       * - opinion_request_id
       * - full_name
       *
       * Vì vậy xác định phiếu được gửi cho đại biểu
       * bằng full_name của tài khoản đang đăng nhập.
       *
       * Chỉ đếm các phiếu có trạng thái:
       * "Đang lấy ý kiến"
       */

      if (userName) {
        const {
          data: opinionParticipants,
          error: opinionParticipantError,
        } = await supabase
          .from("opinion_participants")
          .select(
            "opinion_request_id, full_name"
          )
          .eq("full_name", userName);

        if (opinionParticipantError) {
          console.error(
            "Lỗi lấy phiếu xin ý kiến:",
            opinionParticipantError
          );

          setPendingOpinionCount(0);
        } else if (
          opinionParticipants &&
          opinionParticipants.length > 0
        ) {
          /*
           * Lấy danh sách ID phiếu xin ý kiến
           */
          const opinionRequestIds =
            Array.from(
              new Set(
                opinionParticipants.map(
                  (item) =>
                    item.opinion_request_id
                )
              )
            );

          /*
           * Chỉ lấy các phiếu đang trong thời gian
           * "Đang lấy ý kiến"
           */
          const {
            data: opinionRequests,
            error: opinionRequestError,
          } = await supabase
            .from("opinion_requests")
            .select("id")
            .in(
              "id",
              opinionRequestIds
            )
            .eq(
              "status",
              "Đang lấy ý kiến"
            );

          if (opinionRequestError) {
            console.error(
              "Lỗi lấy danh sách phiếu xin ý kiến:",
              opinionRequestError
            );

            setPendingOpinionCount(0);
          } else {
            setPendingOpinionCount(
              opinionRequests?.length || 0
            );
          }
        } else {
          setPendingOpinionCount(0);
        }
      } else {
        setPendingOpinionCount(0);
      }

      /*
       * =======================================================
       * 3. LẤY CÁC CUỘC HỌP ĐƯỢC MỜI
       * =======================================================
       */

      const {
        data: participantData,
        error: participantError,
      } = await supabase
        .from("meeting_participants")
        .select(
          "id, meeting_id, attendance_status"
        )
        .eq("profile_id", user.id);

      if (participantError) {
        console.error(
          "Lỗi lấy meeting_participants:",
          participantError
        );

        setMeetings([]);
        return;
      }

      if (
        !participantData ||
        participantData.length === 0
      ) {
        console.log(
          "KHÔNG TÌM THẤY CUỘC HỌP ĐƯỢC MỜI"
        );

        setMeetings([]);
        return;
      }

      console.log(
        "MEETING PARTICIPANTS:",
        participantData
      );

      /*
       * =======================================================
       * 4. LẤY ID CÁC CUỘC HỌP
       * =======================================================
       */

      const meetingIds =
        participantData.map(
          (item) => item.meeting_id
        );

      /*
       * =======================================================
       * 5. LẤY THÔNG TIN CUỘC HỌP
       * =======================================================
       */

      const {
        data: meetingData,
        error: meetingError,
      } = await supabase
        .from("meetings")
        .select(
          "id, title, meeting_date, start_time, end_time, location"
        )
        .in("id", meetingIds)
        .order("meeting_date", {
          ascending: true,
        })
        .order("start_time", {
          ascending: true,
        });

      if (meetingError) {
        console.error(
          "Lỗi lấy meetings:",
          meetingError
        );

        setMeetings([]);
        return;
      }

      /*
       * =======================================================
       * 6. GHÉP TRẠNG THÁI THAM DỰ
       * =======================================================
       */

      const participantMap =
        new Map<number, MeetingParticipant>();

      participantData.forEach(
        (participant) => {
          participantMap.set(
            participant.meeting_id,
            participant
          );
        }
      );

      const result: Meeting[] = (
        meetingData || []
      ).map((meeting) => {
        const participant =
          participantMap.get(meeting.id);

        return {
          ...meeting,
          attendance_status:
            participant?.attendance_status ||
            null,
        };
      });

      console.log(
        "DANH SÁCH CUỘC HỌP SAU KHI GHÉP:",
        JSON.stringify(
          result,
          null,
          2
        )
      );

      /*
       * =======================================================
       * 7. CHỈ HIỂN THỊ CUỘC HỌP CHƯA KẾT THÚC
       * =======================================================
       */

      const now = new Date();

      const upcomingMeetings =
        result.filter((meeting) => {
          if (!meeting.meeting_date) {
            return true;
          }

          /*
           * Có giờ kết thúc:
           * Chỉ ẩn sau khi cuộc họp kết thúc.
           */

          if (meeting.end_time) {
            const endDateTime =
              new Date(
                `${meeting.meeting_date}T${meeting.end_time}`
              );

            return endDateTime >= now;
          }

          /*
           * Không có giờ kết thúc:
           * Dùng giờ bắt đầu.
           */

          if (meeting.start_time) {
            const startDateTime =
              new Date(
                `${meeting.meeting_date}T${meeting.start_time}`
              );

            return startDateTime >= now;
          }

          /*
           * Có ngày nhưng không có giờ:
           * Hiển thị hết ngày đó.
           */

          const meetingDate =
            new Date(
              `${meeting.meeting_date}T23:59:59`
            );

          return meetingDate >= now;
        });

      setMeetings(upcomingMeetings);
    } catch (error) {
      console.error(error);

      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     THỐNG KÊ
  ========================================================= */

  const totalMeetings = meetings.length;

  const unconfirmedMeetings =
    meetings.filter(
      (meeting) =>
        !meeting.attendance_status ||
        meeting.attendance_status ===
          "Chưa xác nhận"
    ).length;

  const attendedMeetings =
    meetings.filter(
      (meeting) =>
        meeting.attendance_status ===
        "Đã xác nhận tham dự"
    ).length;

  const declinedMeetings =
    meetings.filter(
      (meeting) =>
        meeting.attendance_status ===
        "Không tham dự"
    ).length;

  /* =========================================================
     FORMAT NGÀY
  ========================================================= */

  const today = new Date();

  function formatToday() {
    return today
      .toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .toUpperCase();
  }

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "Chưa xác định";
    }

    const value = new Date(
      `${date}T00:00:00`
    );

    return value.toLocaleDateString(
      "vi-VN",
      {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  function formatTime(
    time: string | null
  ) {
    if (!time) {
      return "";
    }

    return time.slice(0, 5);
  }

  /* =========================================================
     TRẠNG THÁI ĐIỂM DANH
  ========================================================= */

  function getAttendanceLabel(
    attendanceStatus: string | null
  ) {
    if (
      attendanceStatus ===
      "Đã xác nhận tham dự"
    ) {
      return "Đã xác nhận tham dự";
    }

    if (
      attendanceStatus ===
      "Không tham dự"
    ) {
      return "Đã xác nhận không tham dự";
    }

    return "Chưa xác nhận";
  }

  function getAttendanceClass(
    attendanceStatus: string | null
  ) {
    if (
      attendanceStatus ===
      "Đã xác nhận tham dự"
    ) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (
      attendanceStatus ===
      "Không tham dự"
    ) {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return (
    <main className="min-h-screen bg-slate-100">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-emerald-600 bg-emerald-800 text-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          {/* TÊN HỆ THỐNG */}

          <div className="flex items-center gap-4">

            <div>

              <h1 className="text-xl font-bold tracking-wide">
                PHÒNG HỌP KHÔNG GIẤY
              </h1>

              <p className="mt-0.5 text-sm text-emerald-100">
                Trang thông tin dành cho đại biểu
              </p>

            </div>

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
          MAIN
      ====================================================== */}

      <div className="mx-auto max-w-7xl px-6 py-2">

        {/* =====================================================
            NGÀY HÔM NAY
        ====================================================== */}

        <section className="mb-3 pt-1">

          <p className="text-sm font-medium text-emerald-700">
            {formatToday()}
          </p>

        </section>


        {/* =====================================================
            THÔNG BÁO
        ====================================================== */}

        <section className="mb-4">

          <div className="mb-3 flex items-center gap-2">

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">

              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 0 0-12 0v.75c0 2.56-.997 4.884-2.625 6.625a23.848 23.848 0 0 0 5.454 1.31m6.028 0a24.255 24.255 0 0 1-6.028 0m6.028 0a3 3 0 1 1-6.028 0"
                />
              </svg>

            </div>

            <h3 className="text-lg font-bold text-emerald-800">

              Thông báo

              <br />

              <span className="text-sm font-normal leading-5 text-slate-400 italic">
                (Đại biểu theo dõi các cuộc họp được mời tham dự, xem tài liệu, xác nhận tham dự và thực hiện các nội dung cần xin ý kiến).
              </span>

            </h3>

          </div>


          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* =================================================
                THÔNG BÁO CUỘC HỌP
            ================================================== */}

            <Link
              href="/dai-bieu/phong-hop"
              className="group flex items-center gap-4 border-b border-slate-100 px-5 py-4 transition hover:bg-emerald-50/40"
            >

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">

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
                    d="M6.75 3v3M17.25 3v3M4.5 8.25h15M5.25 5.25h13.5A1.75 1.75 0 0 1 20.5 7v11.75a1.75 1.75 0 0 1-1.75 1.75H5.25a1.75 1.75 0 0 1-1.75-1.75V7a1.75 1.75 0 0 1 1.75-1.75Z"
                  />
                </svg>

              </div>


              <div className="min-w-0 flex-1">

                <p className="text-base font-semibold text-slate-800 group-hover:text-emerald-700">
                  Bạn có cuộc họp được mời tham dự
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Vào Phòng họp để xem thông tin và xác nhận tham dự.
                </p>

              </div>


              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {totalMeetings}
              </span>


              <span className="text-slate-300 transition group-hover:text-emerald-600">
                →
              </span>

            </Link>


            {/* =================================================
                THÔNG BÁO XIN Ý KIẾN
            ================================================== */}

            <Link
              href="/dai-bieu/xin-y-kien"
              className="group flex items-center gap-4 px-5 py-4 transition hover:bg-orange-50/40"
            >

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">

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
                    d="M7.5 18.75 4.5 21v-3.75A7.5 7.5 0 0 1 12 9.75h.75a7.5 7.5 0 0 1 7.5 7.5v.75A1.75 1.75 0 0 1 18.5 19.75H7.5Z"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 14.25h7.5M8.25 17h4.5"
                  />

                </svg>

              </div>


              <div className="min-w-0 flex-1">

                <p className="text-base font-semibold text-slate-800 group-hover:text-orange-600">
                  Bạn có nội dung cần xin ý kiến
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Có phiếu xin ý kiến mới đang chờ bạn thực hiện.
                </p>

              </div>


              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {pendingOpinionCount}
              </span>


              <span className="text-slate-300 transition group-hover:text-orange-600">
                →
              </span>

            </Link>

          </div>

        </section>


        {/* =====================================================
            CUỘC HỌP CỦA TÔI
        ====================================================== */}

        <section className="mb-4">

          <div className="mb-4 flex items-end justify-between">

            <div>

              <h3 className="flex items-center gap-2 text-xl font-bold text-emerald-800">

                <span className="text-emerald-600">
                  •
                </span>

                Cuộc họp của tôi

              </h3>

              <p className="mt-0.5 text-sm text-slate-400 italic">
                (Các cuộc họp bạn được mời tham dự)
              </p>

            </div>


            <div className="flex items-center gap-1">

              {totalMeetings > 0 && (
                <span className="text-[10px] text-slate-400">
                  Hiển thị{" "}
                  {Math.min(
                    totalMeetings,
                    5
                  )}{" "}
                  / {totalMeetings} cuộc họp
                </span>
              )}

              <Link
                href="/dai-bieu/phong-hop"
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Xem tất cả →
              </Link>

            </div>

          </div>


          {/* =================================================
              LOADING
          ================================================== */}

          {loading && (

            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">

              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />

              <p className="mt-3 text-sm text-slate-500">
                Đang tải cuộc họp...
              </p>

            </div>

          )}


          {/* =================================================
              KHÔNG CÓ CUỘC HỌP
          ================================================== */}

          {!loading &&
            meetings.length === 0 && (

              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-7 w-7"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 3v3M17.25 3v3M4.5 8.25h15M5.25 5.25h13.5A1.75 1.75 0 0 1 20.5 7v11.75a1.75 1.75 0 0 1-1.75 1.75H5.25a1.75 1.75 0 0 1-1.75-1.75V7a1.75 1.75 0 0 1 1.75-1.75Z"
                    />
                  </svg>

                </div>


                <h4 className="mt-4 text-base font-semibold text-slate-800">
                  Hiện chưa có cuộc họp được mời
                </h4>


                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  Khi điều hành viên tạo cuộc họp và mời bạn tham dự,
                  thông tin cuộc họp sẽ được hiển thị tại đây.
                </p>

              </div>

            )}


          {/* =================================================
              DANH SÁCH CUỘC HỌP
          ================================================== */}

          {!loading &&
            meetings.length > 0 && (

              <div className="space-y-3">

                {meetings
                  .slice(0, 5)
                  .map((meeting) => (

                    <Link
                      key={meeting.id}
                      href={`/dai-bieu/phong-hop/${meeting.id}`}
                      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                    >

                      <div className="flex flex-col gap-4 md:flex-row md:items-center">

                        {/* NGÀY */}

                        <div className="flex h-16 w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

                          <span className="text-xs font-medium">

                            {meeting.meeting_date
                              ? new Date(
                                  `${meeting.meeting_date}T00:00:00`
                                ).toLocaleDateString(
                                  "vi-VN",
                                  {
                                    weekday:
                                      "short",
                                  }
                                )
                              : ""}

                          </span>


                          <span className="text-xl font-bold">

                            {meeting.meeting_date
                              ? new Date(
                                  `${meeting.meeting_date}T00:00:00`
                                ).getDate()
                              : "--"}

                          </span>

                        </div>


                        {/* NỘI DUNG */}

                        <div className="min-w-0 flex-1">

                          <p className="text-xs font-medium text-emerald-700">
                            {formatDate(
                              meeting.meeting_date
                            )}
                          </p>


                          <h4 className="mt-1 text-base font-semibold text-slate-900 group-hover:text-emerald-700">
                            {meeting.title}
                          </h4>


                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">

                            <span>
                              🕐{" "}
                              {formatTime(
                                meeting.start_time
                              )}

                              {meeting.end_time &&
                                ` – ${formatTime(
                                  meeting.end_time
                                )}`}
                            </span>


                            <span>
                              📍{" "}
                              {meeting.location ||
                                "Chưa cập nhật địa điểm"}
                            </span>

                          </div>

                        </div>


                        {/* TRẠNG THÁI ĐIỂM DANH */}

                        <div className="shrink-0">

                          <span
                            className={`inline-flex rounded-lg border px-3 py-2 text-xs font-medium ${getAttendanceClass(
                              meeting.attendance_status
                            )}`}
                          >
                            {getAttendanceLabel(
                              meeting.attendance_status
                            )}
                          </span>

                        </div>


                        {/* MŨI TÊN */}

                        <div className="hidden text-lg text-slate-300 transition group-hover:text-emerald-600 md:block">
                          →
                        </div>

                      </div>

                    </Link>

                  ))}

              </div>

            )}

        </section>


        {/* =====================================================
            TIỆN ÍCH
        ====================================================== */}

        <section>

          <div className="mb-4">

            <h3 className="flex items-center gap-2 text-xl font-bold text-emerald-800">

              <span className="text-emerald-600">
                •
              </span>

              Tiện ích dành cho đại biểu

            </h3>

            <p className="mt-0.5 text-sm text-slate-400 italic">
              (Các chức năng hỗ trợ ngoài nội dung cuộc họp)
            </p>

          </div>


          <div className="grid gap-4 md:grid-cols-2">

            {/* LỊCH CÔNG TÁC */}

            <Link
              href="/dai-bieu/lich-cong-tac"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >

              <div className="flex items-start gap-4">

                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 3v3M17.25 3v3M4.5 8.25h15M5.25 5.25h13.5A1.75 1.75 0 0 1 20.5 7v11.75a1.75 1.75 0 0 1-1.75 1.75H5.25a1.75 1.75 0 0 1-1.75-1.75V7a1.75 1.75 0 0 1 1.75-1.75Z"
                    />
                  </svg>

                </div>


                <div className="min-w-0 flex-1">

                  <div className="flex items-center justify-between gap-3">

                    <h4 className="font-semibold text-slate-700 group-hover:text-blue-600">
                      Lịch công tác
                    </h4>

                  </div>


                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Theo dõi lịch công tác của cơ quan Tỉnh đoàn.
                  </p>


                  <p className="mt-3 text-xs font-semibold text-blue-600">
                    Xem lịch công tác →
                  </p>

                </div>

              </div>

            </Link>


            {/* XIN Ý KIẾN */}

            <Link
              href="/dai-bieu/xin-y-kien"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
            >

              <div className="flex items-start gap-4">

                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 18.75 4.5 21v-3.75A7.5 7.5 0 0 1 12 9.75h.75a7.5 7.5 0 0 1 7.5 7.5v.75A1.75 1.75 0 0 1 18.5 19.75H7.5Z"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 14.25h7.5M8.25 17h4.5"
                    />

                  </svg>

                </div>


                <div className="min-w-0 flex-1">

                  <div className="flex items-center justify-between gap-3">

                    <h4 className="font-semibold text-slate-700 group-hover:text-orange-600">
                      Xin ý kiến
                    </h4>

                  </div>


                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Xem và phản hồi các nội dung đang được lấy ý kiến.
                  </p>


                  <p className="mt-3 text-xs font-semibold text-orange-600">
                    Xem nội dung →
                  </p>

                </div>

              </div>

            </Link>

          </div>

        </section>

      </div>

    </main>
  );
}

