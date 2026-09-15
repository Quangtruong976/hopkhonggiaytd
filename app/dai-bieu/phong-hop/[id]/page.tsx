"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type Meeting = {
  id: number;
  title: string;
  status: string | null;
  meeting_date: string | null;
  start_time: string | null;
};

type MeetingDocument = {
  id: number;
  meeting_id: number;
  title: string;
  file_name: string | null;
  file_path: string;
  created_at: string;
};

type Participant = {
  id: number;
  meeting_id: number;
  profile_id: string;
  attendance_status: string | null;
  absence_reason: string | null;
  speaking_registered: boolean | null;
};

type Opinion = {
  id: number;
  meeting_id: number;
  participant_id: number;
  content: string | null;
  file_path: string | null;
  created_at: string;
};

type Vote = {
  id: number;
  meeting_id: number;
  title: string;
  description: string | null;
  status: string;
};

type VoteItem = {
  id: number;
  vote_id: number;
  label: string;
  sort_order: number | null;
};

type VoteParticipant = {
  id: number;
  vote_id: number;
  participant_id: number;
  selected_item_id: number | null;
};

/* =========================================================
   PAGE
========================================================= */

export default function DaiBieuPhongHopDetailPage() {
  const params = useParams();

  /*
   * [id] trên URL KHÔNG phải meetings.id.
   *
   * Ví dụ:
   * /dai-bieu/phong-hop/1
   *
   * nghĩa là cuộc họp số 1 trong danh sách,
   * sau đó mới tìm meetings.id thật.
   */
  const meetingOrder = Number(params.id);

  const [meetingId, setMeetingId] = useState<number | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);

  const [documents, setDocuments] = useState<MeetingDocument[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [opinions, setOpinions] = useState<Opinion[]>([]);

  const [activeVote, setActiveVote] = useState<Vote | null>(null);
  const [voteItems, setVoteItems] = useState<VoteItem[]>([]);
  const [voteParticipant, setVoteParticipant] =
    useState<VoteParticipant | null>(null);

  const [attendanceChoice, setAttendanceChoice] =
    useState<string>("");

  const [absenceReason, setAbsenceReason] =
    useState("");

  const [speakingContent, setSpeakingContent] =
    useState("");

  const [speakingFile, setSpeakingFile] =
    useState<File | null>(null);

  const [selectedVoteItem, setSelectedVoteItem] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [savingAttendance, setSavingAttendance] =
    useState(false);

  const [savingSpeaking, setSavingSpeaking] =
    useState(false);

  const [savingVote, setSavingVote] =
    useState(false);

  const [message, setMessage] =
    useState("");

  /* =========================================================
     LOAD
  ========================================================= */

  useEffect(() => {
    if (
      !Number.isInteger(meetingOrder) ||
      meetingOrder < 1
    ) {
      setError("Số thứ tự cuộc họp không hợp lệ.");
      setLoading(false);
      return;
    }

    loadMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingOrder]);

  /* =========================================================
     LOAD MEETING
  ========================================================= */

  async function loadMeeting() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      /* -------------------------------------------------------
         AUTH
      ------------------------------------------------------- */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error(authError);
      }

      if (!user) {
        setError("Không xác định được tài khoản đại biểu.");
        setLoading(false);
        return;
      }

      /* -------------------------------------------------------
         1. LẤY TOÀN BỘ CUỘC HỌP
         
         Phải lấy toàn bộ danh sách để số thứ tự trên URL
         thống nhất với danh sách quản trị/điều hành.
      ------------------------------------------------------- */

      const {
        data: allMeetings,
        error: allMeetingsError,
      } = await supabase
        .from("meetings")
        .select(`
          id,
          title,
          status,
          meeting_date,
          start_time
        `);

      if (allMeetingsError) {
        console.error(allMeetingsError);

        setError(
          `Không thể tải danh sách cuộc họp: ${allMeetingsError.message}`
        );

        setLoading(false);
        return;
      }

      if (!allMeetings || allMeetings.length === 0) {
        setError("Không có dữ liệu cuộc họp.");
        setLoading(false);
        return;
      }

      /* -------------------------------------------------------
         2. SẮP XẾP GIỐNG TRANG QUẢN TRỊ
         
         Thứ tự:
         - Chưa kết thúc lên trước
         - Ngày mới hơn lên trước
         - Giờ mới hơn lên trước
         - ID lớn hơn lên trước để cố định thứ tự
      ------------------------------------------------------- */

      const sortedMeetings = [...allMeetings].sort(
        (a, b) => {
          const aFinished =
            a.status === "Đã kết thúc";

          const bFinished =
            b.status === "Đã kết thúc";

          if (aFinished !== bFinished) {
            return aFinished ? 1 : -1;
          }

          const aDate =
            a.meeting_date || "";

          const bDate =
            b.meeting_date || "";

          if (aDate !== bDate) {
            return bDate.localeCompare(aDate);
          }

          const aTime =
            a.start_time || "";

          const bTime =
            b.start_time || "";

          if (aTime !== bTime) {
            return bTime.localeCompare(aTime);
          }

          return b.id - a.id;
        }
      );

      /* -------------------------------------------------------
         3. GIẢI MÃ SỐ THỨ TỰ → MEETINGS.ID
      ------------------------------------------------------- */

      const selectedMeeting =
        sortedMeetings[meetingOrder - 1];

      if (!selectedMeeting) {
        setError(
          `Không tìm thấy cuộc họp số ${meetingOrder}.`
        );

        setLoading(false);
        return;
      }

      const resolvedMeetingId =
        selectedMeeting.id;

      setMeetingId(resolvedMeetingId);
      setMeeting(
        selectedMeeting as Meeting
      );

      /* -------------------------------------------------------
         4. TÀI LIỆU CUỘC HỌP
      ------------------------------------------------------- */

      const {
        data: documentData,
        error: documentError,
      } = await supabase
        .from("meeting_documents")
        .select(`
          id,
          meeting_id,
          title,
          file_name,
          file_path,
          created_at
        `)
        .eq(
          "meeting_id",
          resolvedMeetingId
        )
        .order("created_at", {
          ascending: true,
        });

      if (documentError) {
        console.error(documentError);
      }

      setDocuments(
        (documentData || []) as MeetingDocument[]
      );

      /* -------------------------------------------------------
         5. PARTICIPANT CỦA ĐẠI BIỂU HIỆN TẠI
      ------------------------------------------------------- */

      const {
        data: participantData,
        error: participantError,
      } = await supabase
        .from("meeting_participants")
        .select(`
          id,
          meeting_id,
          profile_id,
          attendance_status,
          absence_reason,
          speaking_registered
        `)
        .eq(
          "meeting_id",
          resolvedMeetingId
        )
        .eq(
          "profile_id",
          user.id
        )
        .maybeSingle();

      if (participantError) {
        console.error(participantError);
      }

      const currentParticipant =
        participantData as Participant | null;

      setParticipant(
        currentParticipant
      );

      if (currentParticipant) {
        setAttendanceChoice(
          currentParticipant.attendance_status ||
          ""
        );

        setAbsenceReason(
          currentParticipant.absence_reason ||
          ""
        );
      }

      /* -------------------------------------------------------
         6. Ý KIẾN / ĐĂNG KÝ PHÁT BIỂU
      ------------------------------------------------------- */

      if (currentParticipant) {
        const {
          data: opinionData,
          error: opinionError,
        } = await supabase
          .from("meeting_opinions")
          .select(`
            id,
            meeting_id,
            participant_id,
            content,
            file_path,
            created_at
          `)
          .eq(
            "meeting_id",
            resolvedMeetingId
          )
          .eq(
            "participant_id",
            currentParticipant.id
          )
          .order("created_at", {
            ascending: false,
          });

        if (opinionError) {
          console.error(opinionError);
        }

        setOpinions(
          (opinionData || []) as Opinion[]
        );

        /* -----------------------------------------------------
           Nếu đã có ý kiến cũ thì hiển thị nội dung mới nhất
        ----------------------------------------------------- */

        if (
          opinionData &&
          opinionData.length > 0
        ) {
          setSpeakingContent(
            opinionData[0].content || ""
          );
        }

        /* -----------------------------------------------------
           7. PHIẾU BIỂU QUYẾT ĐANG MỞ
        ----------------------------------------------------- */

        await loadActiveVote(
          resolvedMeetingId,
          currentParticipant.id,
          currentParticipant.attendance_status
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        "Đã xảy ra lỗi khi tải hồ sơ cuộc họp."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     LOAD ACTIVE VOTE
  ========================================================= */

  async function loadActiveVote(
    targetMeetingId: number,
    participantId: number,
    attendanceStatus: string | null
  ) {
    try {
      /*
       * Chỉ hiển thị biểu quyết khi đại biểu được xác nhận
       * tham dự.
       */
      if (
        attendanceStatus !== "Tham dự"
      ) {
        setActiveVote(null);
        setVoteItems([]);
        setVoteParticipant(null);
        return;
      }

      /* -------------------------------------------------------
         Lấy phiếu đang mở
      ------------------------------------------------------- */

      const {
        data: voteData,
        error: voteError,
      } = await supabase
        .from("meeting_votes")
        .select(`
          id,
          meeting_id,
          title,
          description,
          status
        `)
        .eq(
          "meeting_id",
          targetMeetingId
        )
        .eq(
          "status",
          "Đang mở"
        )
        .order("id", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (voteError) {
        console.error(voteError);

        setActiveVote(null);
        setVoteItems([]);
        setVoteParticipant(null);
        return;
      }

      if (!voteData) {
        setActiveVote(null);
        setVoteItems([]);
        setVoteParticipant(null);
        return;
      }

      const currentVote =
        voteData as Vote;

      setActiveVote(
        currentVote
      );

      /* -------------------------------------------------------
         Lấy phương án biểu quyết
      ------------------------------------------------------- */

      const {
        data: itemsData,
        error: itemsError,
      } = await supabase
        .from("meeting_vote_items")
        .select(`
          id,
          vote_id,
          label,
          sort_order
        `)
        .eq(
          "vote_id",
          currentVote.id
        )
        .order("sort_order", {
          ascending: true,
        })
        .order("id", {
          ascending: true,
        });

      if (itemsError) {
        console.error(itemsError);
      }

      const currentItems =
        (itemsData || []) as VoteItem[];

      setVoteItems(
        currentItems
      );

      /* -------------------------------------------------------
         Lấy trạng thái tham gia biểu quyết
      ------------------------------------------------------- */

      const {
        data: voteParticipantData,
        error: voteParticipantError,
      } = await supabase
        .from("meeting_vote_participants")
        .select(`
          id,
          vote_id,
          participant_id,
          selected_item_id
        `)
        .eq(
          "vote_id",
          currentVote.id
        )
        .eq(
          "participant_id",
          participantId
        )
        .maybeSingle();

      if (voteParticipantError) {
        console.error(
          voteParticipantError
        );
      }

      const currentVoteParticipant =
        voteParticipantData as VoteParticipant | null;

      setVoteParticipant(
        currentVoteParticipant
      );

      setSelectedVoteItem(
        currentVoteParticipant?.selected_item_id ||
        null
      );
    } catch (err) {
      console.error(err);

      setActiveVote(null);
      setVoteItems([]);
      setVoteParticipant(null);
    }
  }

  /* =========================================================
     CONFIRM ATTENDANCE
  ========================================================= */

  async function confirmAttendance() {
    if (!participant || !meetingId) {
      return;
    }

    if (!attendanceChoice) {
      setMessage(
        "Vui lòng chọn tình trạng tham dự."
      );
      return;
    }

    if (
      attendanceChoice === "Không tham dự" &&
      !absenceReason.trim()
    ) {
      setMessage(
        "Vui lòng nhập lý do không tham dự."
      );
      return;
    }

    setSavingAttendance(true);
    setMessage("");
    setError("");

    try {
      const {
        error: updateError,
      } = await supabase
        .from("meeting_participants")
        .update({
          attendance_status:
            attendanceChoice,
          absence_reason:
            attendanceChoice === "Không tham dự"
              ? absenceReason.trim()
              : null,
        })
        .eq(
          "id",
          participant.id
        );

      if (updateError) {
        console.error(updateError);

        setMessage(
          `Không thể cập nhật xác nhận tham dự: ${updateError.message}`
        );

        return;
      }

      const updatedParticipant: Participant = {
        ...participant,
        attendance_status:
          attendanceChoice,
        absence_reason:
          attendanceChoice === "Không tham dự"
            ? absenceReason.trim()
            : null,
      };

      setParticipant(
        updatedParticipant
      );

      await loadActiveVote(
        meetingId,
        participant.id,
        attendanceChoice
      );

      setMessage(
        "Đã cập nhật xác nhận tham dự."
      );
    } finally {
      setSavingAttendance(false);
    }
  }

  /* =========================================================
     REFRESH VOTE
  ========================================================= */

  async function refreshVote() {
    if (
      !participant ||
      !meetingId
    ) {
      return;
    }

    await loadActiveVote(
      meetingId,
      participant.id,
      participant.attendance_status
    );
  }

  /* =========================================================
     CAST VOTE
  ========================================================= */

  async function castVote() {
    if (
      !activeVote ||
      !participant ||
      !selectedVoteItem
    ) {
      setMessage(
        "Vui lòng chọn một phương án biểu quyết."
      );
      return;
    }

    setSavingVote(true);
    setMessage("");
    setError("");

    try {
      if (voteParticipant) {
        const {
          error: updateError,
        } = await supabase
          .from("meeting_vote_participants")
          .update({
            selected_item_id:
              selectedVoteItem,
          })
          .eq(
            "id",
            voteParticipant.id
          );

        if (updateError) {
          console.error(updateError);

          setMessage(
            `Không thể cập nhật biểu quyết: ${updateError.message}`
          );

          return;
        }

        setVoteParticipant({
          ...voteParticipant,
          selected_item_id:
            selectedVoteItem,
        });
      } else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from("meeting_vote_participants")
          .insert({
            vote_id:
              activeVote.id,
            participant_id:
              participant.id,
            selected_item_id:
              selectedVoteItem,
          })
          .select(`
            id,
            vote_id,
            participant_id,
            selected_item_id
          `)
          .single();

        if (insertError) {
          console.error(insertError);

          setMessage(
            `Không thể gửi biểu quyết: ${insertError.message}`
          );

          return;
        }

        setVoteParticipant(
          data as VoteParticipant
        );
      }

      setMessage(
        "Đã ghi nhận ý kiến biểu quyết."
      );
    } finally {
      setSavingVote(false);
    }
  }

  /* =========================================================
     REGISTER SPEAKING
  ========================================================= */

  async function registerSpeaking() {
    if (
      !participant ||
      !meeting
    ) {
      return;
    }

    if (
      !speakingContent.trim() &&
      !speakingFile
    ) {
      setMessage(
        "Vui lòng nhập nội dung ý kiến hoặc chọn tệp."
      );
      return;
    }

    setSavingSpeaking(true);
    setMessage("");
    setError("");

    try {
      let filePath: string | null =
        null;

      /* -------------------------------------------------------
         Upload file nếu có
      ------------------------------------------------------- */

      if (speakingFile) {
        const safeFileName =
          speakingFile.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );

        const filePathToUpload =
          `opinions/${meeting.id}/${participant.id}/${Date.now()}-${safeFileName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("meeting-documents")
          .upload(
            filePathToUpload,
            speakingFile,
            {
              upsert: true,
            }
          );

        if (uploadError) {
          console.error(uploadError);

          setMessage(
            `Không thể tải tệp lên: ${uploadError.message}`
          );

          return;
        }

        filePath =
          filePathToUpload;
      }

      /* -------------------------------------------------------
         Lưu ý kiến
      ------------------------------------------------------- */

      const {
        data: opinionData,
        error: opinionError,
      } = await supabase
        .from("meeting_opinions")
        .insert({
          meeting_id:
            meeting.id,
          participant_id:
            participant.id,
          content:
            speakingContent.trim() ||
            null,
          file_path:
            filePath,
        })
        .select(`
          id,
          meeting_id,
          participant_id,
          content,
          file_path,
          created_at
        `)
        .single();

      if (opinionError) {
        console.error(opinionError);

        setMessage(
          `Không thể gửi ý kiến: ${opinionError.message}`
        );

        return;
      }

      setOpinions((current) => [
        opinionData as Opinion,
        ...current,
      ]);

      /* -------------------------------------------------------
         Đánh dấu đã đăng ký phát biểu
      ------------------------------------------------------- */

      const {
        error: participantUpdateError,
      } = await supabase
        .from("meeting_participants")
        .update({
          speaking_registered: true,
        })
        .eq(
          "id",
          participant.id
        );

      if (participantUpdateError) {
        console.error(
          participantUpdateError
        );
      }

      setParticipant({
        ...participant,
        speaking_registered: true,
      });

      setSpeakingContent("");
      setSpeakingFile(null);

      setMessage(
        "Đã gửi đăng ký phát biểu/ý kiến."
      );
    } finally {
      setSavingSpeaking(false);
    }
  }

  /* =========================================================
     VIEW DOCUMENT
  ========================================================= */

  async function openDocument(
    filePath: string
  ) {
    const {
      data,
      error: signedUrlError,
    } = await supabase.storage
      .from("meeting-documents")
      .createSignedUrl(
        filePath,
        60 * 60
      );

    if (signedUrlError) {
      console.error(
        signedUrlError
      );

      setMessage(
        `Không thể mở tài liệu: ${signedUrlError.message}`
      );

      return;
    }

    if (data?.signedUrl) {
      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    }
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
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
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

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100">
        <header className="border-b border-emerald-800 bg-emerald-700 text-white">
          <div className="mx-auto flex max-w-7xl items-center px-5 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
              <img
                src="/logo-doan.png"
                alt="Logo Đoàn"
                className="h-8 w-8 object-contain"
              />
            </div>

            <div className="ml-3">
              <h1 className="text-lg font-bold">
                PHÒNG HỌP KHÔNG GIẤY
              </h1>

              <p className="text-xs text-emerald-100">
                Hồ sơ cuộc họp
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-5 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            Đang tải hồ sơ cuộc họp...
          </div>
        </div>
      </main>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (
    error &&
    !meeting
  ) {
    return (
      <main className="min-h-screen bg-slate-100">
        <header className="border-b border-emerald-800 bg-emerald-700 text-white">
          <div className="mx-auto flex max-w-7xl items-center px-5 py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
              <img
                src="/logo-doan.png"
                alt="Logo Đoàn"
                className="h-8 w-8 object-contain"
              />
            </div>

            <div className="ml-3">
              <h1 className="text-lg font-bold">
                PHÒNG HỌP KHÔNG GIẤY
              </h1>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-5 py-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>

          <Link
            href="/dai-bieu/phong-hop"
            className="mt-4 inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Quay lại danh sách
          </Link>
        </div>
      </main>
    );
  }

  if (!meeting) {
    return null;
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen bg-slate-100">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-emerald-800 bg-emerald-700 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
              <img
                src="/logo-doan.png"
                alt="Logo Đoàn"
                className="h-8 w-8 object-contain"
              />
            </div>

            <div>
              <h1 className="text-lg font-bold">
                PHÒNG HỌP KHÔNG GIẤY
              </h1>

              <p className="text-xs text-emerald-100">
                Hệ thống điều hành và quản lý cuộc họp
              </p>
            </div>

          </div>

          <div className="hidden text-right sm:block">
            <p className="text-xs text-emerald-100">
              Đại biểu
            </p>

            <p className="text-sm font-semibold">
              Hồ sơ cuộc họp
            </p>
          </div>

        </div>
      </header>


      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-5xl px-5 py-6">

        {/* BACK */}

        <Link
          href="/dai-bieu/phong-hop"
          className="mb-5 inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          ← Danh sách cuộc họp
        </Link>


        {/* ===================================================
            MEETING HEADER
        =================================================== */}

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div className="min-w-0">

              <div className="mb-2 flex flex-wrap items-center gap-2">

                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  Cuộc họp #{meetingOrder}
                </span>

                {meeting.status && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {meeting.status}
                  </span>
                )}

              </div>

              <h2 className="text-xl font-semibold text-slate-900">
                {meeting.title}
              </h2>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">

                <span>
                  📅{" "}
                  {formatDate(
                    meeting.meeting_date
                  )}
                </span>

                <span>
                  🕐{" "}
                  {formatTime(
                    meeting.start_time
                  )}
                </span>

              </div>

            </div>

          </div>

        </section>


        {/* ===================================================
            ERROR / MESSAGE
        =================================================== */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}


        {/* ===================================================
            TÀI LIỆU
        =================================================== */}

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-800">
              Tài liệu cuộc họp
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Tài liệu do ban tổ chức phát hành.
            </p>
          </div>

          {documents.length === 0 ? (

            <div className="px-5 py-8 text-center text-sm text-slate-400">
              Chưa có tài liệu được phát hành.
            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {documents.map(
                (document) => (
                  <div
                    key={document.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div className="min-w-0">

                      <p className="text-sm font-medium text-slate-800">
                        {document.title}
                      </p>

                      {document.file_name && (
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {document.file_name}
                        </p>
                      )}

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openDocument(
                          document.file_path
                        )
                      }
                      className="w-full cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 sm:w-auto"
                    >
                      Xem tài liệu
                    </button>

                  </div>
                )
              )}

            </div>

          )}

        </section>


        {/* ===================================================
            XÁC NHẬN THAM DỰ
        =================================================== */}

        {participant && (
          <section className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-5 py-4">

              <h3 className="text-base font-semibold text-slate-800">
                Xác nhận tham dự
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Vui lòng xác nhận tình trạng tham dự cuộc họp.
              </p>

            </div>

            <div className="space-y-4 px-5 py-5">

              <div className="grid gap-3 sm:grid-cols-2">

                <button
                  type="button"
                  onClick={() =>
                    setAttendanceChoice(
                      "Tham dự"
                    )
                  }
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    attendanceChoice ===
                    "Tham dự"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ✓ Tham dự
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAttendanceChoice(
                      "Không tham dự"
                    )
                  }
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    attendanceChoice ===
                    "Không tham dự"
                      ? "border-red-300 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Không tham dự
                </button>

              </div>

              {attendanceChoice ===
                "Không tham dự" && (
                <div>

                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Lý do không tham dự
                  </label>

                  <textarea
                    value={absenceReason}
                    onChange={(event) =>
                      setAbsenceReason(
                        event.target.value
                      )
                    }
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Nhập lý do..."
                  />

                </div>
              )}

              <div className="flex justify-end">

                <button
                  type="button"
                  onClick={
                    confirmAttendance
                  }
                  disabled={
                    savingAttendance
                  }
                  className="w-full cursor-pointer rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {savingAttendance
                    ? "Đang lưu..."
                    : "Xác nhận"}
                </button>

              </div>

            </div>

          </section>
        )}


        {/* ===================================================
            BIỂU QUYẾT
        =================================================== */}

        {participant &&
          participant.attendance_status ===
            "Tham dự" &&
          activeVote && (

          <section className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-5 py-4">

              <div className="flex items-center justify-between gap-3">

                <div>

                  <h3 className="text-base font-semibold text-slate-800">
                    {activeVote.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Phiếu biểu quyết đang mở.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    refreshVote
                  }
                  className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ↻ Cập nhật
                </button>

              </div>

              {activeVote.description && (
                <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {activeVote.description}
                </p>
              )}

            </div>

            <div className="space-y-3 px-5 py-5">

              {voteItems.map(
                (item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setSelectedVoteItem(
                        item.id
                      )
                    }
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedVoteItem ===
                      item.id
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >

                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selectedVoteItem ===
                        item.id
                          ? "border-emerald-600"
                          : "border-slate-300"
                      }`}
                    >
                      {selectedVoteItem ===
                        item.id && (
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                      )}
                    </span>

                    <span>
                      {item.label}
                    </span>

                  </button>
                )
              )}

              {voteItems.length === 0 && (
                <p className="text-sm text-slate-400">
                  Chưa có phương án biểu quyết.
                </p>
              )}

              {voteItems.length > 0 && (
                <div className="flex justify-end pt-2">

                  <button
                    type="button"
                    onClick={
                      castVote
                    }
                    disabled={
                      savingVote ||
                      !selectedVoteItem
                    }
                    className="w-full cursor-pointer rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {savingVote
                      ? "Đang gửi..."
                      : voteParticipant
                        ? "Cập nhật biểu quyết"
                        : "Gửi biểu quyết"}
                  </button>

                </div>
              )}

            </div>

          </section>
        )}


        {/* ===================================================
            PHÁT BIỂU / Ý KIẾN
        =================================================== */}

        {participant && (
          <section className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-5 py-4">

              <h3 className="text-base font-semibold text-slate-800">
                Đăng ký phát biểu / gửi ý kiến
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Đại biểu có thể gửi nội dung phát biểu hoặc tài liệu kèm theo.
              </p>

            </div>

            <div className="space-y-4 px-5 py-5">

              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nội dung
                </label>

                <textarea
                  value={speakingContent}
                  onChange={(event) =>
                    setSpeakingContent(
                      event.target.value
                    )
                  }
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Nhập nội dung phát biểu hoặc ý kiến..."
                />

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tệp đính kèm
                </label>

                <input
                  type="file"
                  onChange={(event) =>
                    setSpeakingFile(
                      event.target.files?.[0] ||
                      null
                    )
                  }
                  className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
                />

                {speakingFile && (
                  <p className="mt-2 text-xs text-slate-400">
                    Đã chọn:{" "}
                    {speakingFile.name}
                  </p>
                )}

              </div>

              <div className="flex justify-end">

                <button
                  type="button"
                  onClick={
                    registerSpeaking
                  }
                  disabled={
                    savingSpeaking
                  }
                  className="w-full cursor-pointer rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {savingSpeaking
                    ? "Đang gửi..."
                    : "Gửi ý kiến"}
                </button>

              </div>

            </div>


            {/* LỊCH SỬ Ý KIẾN */}

            {opinions.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-5">

                <h4 className="mb-3 text-sm font-semibold text-slate-700">
                  Lịch sử ý kiến
                </h4>

                <div className="space-y-3">

                  {opinions.map(
                    (opinion) => (
                      <div
                        key={opinion.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >

                        <p className="text-xs text-slate-400">
                          {new Date(
                            opinion.created_at
                          ).toLocaleString(
                            "vi-VN"
                          )}
                        </p>

                        {opinion.content && (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                            {opinion.content}
                          </p>
                        )}

                        {opinion.file_path && (
                          <button
                            type="button"
                            onClick={() =>
                              openDocument(
                                opinion.file_path!
                              )
                            }
                            className="mt-3 cursor-pointer text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            Xem tệp đính kèm →
                          </button>
                        )}

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

          </section>
        )}


        {/* ===================================================
            FOOTER BACK
        =================================================== */}

        <div className="pb-8 pt-2">

          <Link
            href="/dai-bieu/phong-hop"
            className="inline-flex cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            ← Quay lại danh sách cuộc họp
          </Link>

        </div>

      </div>

    </main>
  );
}

