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
};

type Participant = {
  id: number;
  meeting_id: number;
  profile_id: string | null;
  full_name: string | null;
  position: string | null;
  organization: string | null;
  role: string | null;
  attendance_status: string | null;
  response_note: string | null;
  response_at: string | null;
};

type MeetingDocument = {
  id: number;
  meeting_id: number;
  name: string | null;
  file_name: string | null;
  file_path: string | null;
  file_type: string | null;
  status: string | null;
};

type SpeakingRegistration = {
  id: number;
  meeting_id: number;
  participant_id: number | null;
  speaker_name: string;
  speaker_position: string | null;
  content: string | null;
  status: string;
  registered_at: string;
  opinion_type: string | null;
  file_path: string | null;
  file_name: string | null;
};

type MeetingVote = {
  id: number;
  meeting_id: number;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  closed_at: string | null;
};

type MeetingVoteItem = {
  id: number;
  vote_id: number;
  participant_id: number;
  choice: string | null;
  voted_at: string | null;
};

type AttendanceChoice =
  | "Đã xác nhận tham dự"
  | "Không tham dự"
  | null;

type VoteChoice =
  | "Đồng ý"
  | "Không đồng ý"
  | null;

/* =========================================================
   PAGE
========================================================= */

export default function DaiBieuPhongHopChiTietPage() {
  const params = useParams();

  const meetingId = Number(params.id);

  /* =======================================================
     CUỘC HỌP
  ======================================================= */

  const [meeting, setMeeting] =
    useState<Meeting | null>(null);

  /* =======================================================
     ĐẠI BIỂU
  ======================================================= */

  const [participant, setParticipant] =
    useState<Participant | null>(null);

  const [currentUserName, setCurrentUserName] =
    useState("");

  /* =======================================================
     TÀI LIỆU
  ======================================================= */

  const [documents, setDocuments] =
    useState<MeetingDocument[]>([]);

  /* =======================================================
     GÓP Ý / PHÁT BIỂU
  ======================================================= */

  const [registrations, setRegistrations] =
    useState<SpeakingRegistration[]>([]);

  /* =======================================================
     BIỂU QUYẾT
  ======================================================= */

  const [activeVote, setActiveVote] =
    useState<MeetingVote | null>(null);

  const [myVote, setMyVote] =
    useState<MeetingVoteItem | null>(null);

  const [voteChoice, setVoteChoice] =
    useState<VoteChoice>(null);

  const [savingVote, setSavingVote] =
    useState(false);

  const [loadingVote, setLoadingVote] =
    useState(false);

  /* =======================================================
     TRẠNG THÁI CHUNG
  ======================================================= */

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =======================================================
     XÁC NHẬN THAM DỰ
  ======================================================= */

  const [attendanceChoice, setAttendanceChoice] =
    useState<AttendanceChoice>(null);

  const [absenceReason, setAbsenceReason] =
    useState("");

  const [savingAttendance, setSavingAttendance] =
    useState(false);

  /* =======================================================
     GÓP Ý / PHÁT BIỂU
  ======================================================= */

  const [showSpeakingForm, setShowSpeakingForm] =
    useState(false);

  const [speakingContent, setSpeakingContent] =
    useState("");

  const [speakingFile, setSpeakingFile] =
    useState<File | null>(null);

  const [savingSpeaking, setSavingSpeaking] =
    useState(false);

  /* =======================================================
     TÀI LIỆU
  ======================================================= */

  const [openingDocumentId, setOpeningDocumentId] =
    useState<number | null>(null);

  const [downloadingDocumentId, setDownloadingDocumentId] =
    useState<number | null>(null);

  /* =========================================================
     LOAD PAGE
  ========================================================= */

  useEffect(() => {
    if (!meetingId || Number.isNaN(meetingId)) {
      setError("Mã cuộc họp không hợp lệ.");
      setLoading(false);
      return;
    }

    loadMeeting();
  }, [meetingId]);

  /* =========================================================
     LOAD MEETING
  ========================================================= */

  async function loadMeeting() {
    setLoading(true);
    setError("");

    try {
      /* =====================================================
         1. USER ĐĂNG NHẬP
      ===================================================== */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      console.log("===== DEBUG AUTH BIỂU QUYẾT =====");
      console.log("AUTH USER ID:", user?.id);
      console.log("AUTH USER EMAIL:", user?.email);
      console.log("=================================");
      if (userError || !user) {
        setError("Phiên đăng nhập không hợp lệ.");
        setLoading(false);
        return;
      }

      /* =====================================================
         2. CUỘC HỌP
      ===================================================== */

      const {
        data: meetingData,
        error: meetingError,
      } = await supabase
        .from("meetings")
        .select(`
          id,
          title,
          status
        `)
        .eq("id", meetingId)
        .single();

      if (meetingError || !meetingData) {
        console.error(
          "LỖI TẢI CUỘC HỌP:",
          meetingError
        );

        setError(
          meetingError?.message ||
            "Không tìm thấy cuộc họp."
        );

        setLoading(false);
        return;
      }

      setMeeting(
        meetingData as Meeting
      );

      /* =====================================================
         3. ĐẠI BIỂU CỦA CUỘC HỌP
      ===================================================== */

      const {
        data: participantData,
        error: participantError,
      } = await supabase
        .from("meeting_participants")
        .select(`
          id,
          meeting_id,
          profile_id,
          full_name,
          position,
          organization,
          role,
          attendance_status,
          response_note,
          response_at
        `)
        .eq("meeting_id", meetingId)
        .eq("profile_id", user.id)
        .maybeSingle();

      if (participantError) {
        console.error(
          "LỖI TẢI ĐẠI BIỂU:",
          participantError
        );

        setError(
          `Không thể xác định thành phần đại biểu: ${participantError.message}`
        );

        setLoading(false);
        return;
      }

      if (!participantData) {
        setError(
          "Tài khoản này không thuộc thành phần được mời của cuộc họp."
        );

        setLoading(false);
        return;
      }

      const currentParticipant =
        participantData as Participant;

      setParticipant(
        currentParticipant
      );

      /* =====================================================
         TÊN ĐẠI BIỂU
      ===================================================== */

      setCurrentUserName(
        currentParticipant.full_name ||
          "Đại biểu"
      );

      /* =====================================================
         4. TRẠNG THÁI THAM DỰ
      ===================================================== */

      if (
        currentParticipant.attendance_status ===
        "Đã xác nhận tham dự"
      ) {
        setAttendanceChoice(
          "Đã xác nhận tham dự"
        );
      } else if (
        currentParticipant.attendance_status ===
        "Không tham dự"
      ) {
        setAttendanceChoice(
          "Không tham dự"
        );

        setAbsenceReason(
          currentParticipant.response_note ||
            ""
        );
      } else {
        setAttendanceChoice(null);
      }

      /* =====================================================
         5. TÀI LIỆU ĐÃ PHÁT HÀNH
      ===================================================== */

      const {
        data: documentData,
        error: documentError,
      } = await supabase
        .from("meeting_documents")
        .select(`
          id,
          meeting_id,
          name,
          file_name,
          file_path,
          file_type,
          status
        `)
        .eq("meeting_id", meetingId)
        .eq("status", "Đã phát hành")
        .order("id", {
          ascending: true,
        });

      if (documentError) {
        console.error(
          "LỖI TẢI TÀI LIỆU:",
          documentError
        );

        setDocuments([]);

        setError(
          `Không tải được tài liệu: ${documentError.message}`
        );
      } else {
        console.log(
          "TÀI LIỆU ĐÃ PHÁT HÀNH:",
          documentData
        );

        setDocuments(
          (documentData || []) as MeetingDocument[]
        );
      }

      /* =====================================================
         6. GÓP Ý / PHÁT BIỂU
      ===================================================== */

      const {
        data: speakingData,
        error: speakingError,
      } = await supabase
        .from("meeting_opinions")
        .select(`
          id,
          meeting_id,
          participant_id,
          speaker_name,
          speaker_position,
          content,
          status,
          registered_at,
          opinion_type,
          file_path,
          file_name
        `)
        .eq("meeting_id", meetingId)
        .eq(
          "participant_id",
          currentParticipant.id
        )
        .order("registered_at", {
          ascending: false,
        });

      if (!speakingError) {
        setRegistrations(
          (speakingData || []) as SpeakingRegistration[]
        );
      } else {
        console.warn(
          "Không tải được ý kiến:",
          speakingError.message
        );

        setRegistrations([]);
      }

      /* =====================================================
         7. BIỂU QUYẾT
      ===================================================== */

      await loadActiveVote(
        currentParticipant.id,
        currentParticipant.attendance_status
      );

    } catch (err) {
      console.error(
        "LỖI LOAD TRANG PHÒNG HỌP:",
        err
      );

      setError(
        "Có lỗi xảy ra khi tải thông tin cuộc họp."
      );
    }

    setLoading(false);
  }

  /* =========================================================
     LOAD BIỂU QUYẾT
  ========================================================= */

  async function loadActiveVote(
    participantId: number,
    attendanceStatus: string | null
  ) {
    setLoadingVote(true);

    try {
      /* =====================================================
         1. LẤY BIỂU QUYẾT ĐANG MỞ HOẶC ĐÃ KẾT THÚC
      ===================================================== */

      const {
        data: voteDataList,
        error: voteError,
      } = await supabase
        .from("meeting_votes")
        .select(`
          id,
          meeting_id,
          title,
          description,
          status,
          created_at,
          closed_at
        `)
        .eq("meeting_id", meetingId)
        .in("status", [
          "Đang biểu quyết",
          "Đã kết thúc",
        ])
        .order("created_at", {
          ascending: false,
        });

      if (voteError) {
        console.error(
          "LỖI TẢI BIỂU QUYẾT:",
          voteError
        );

        setActiveVote(null);
        setMyVote(null);
        setVoteChoice(null);

        return;
      }

      console.log(
        "BIỂU QUYẾT CỦA CUỘC HỌP:",
        voteDataList
      );

      if (
        !voteDataList ||
        voteDataList.length === 0
      ) {
        setActiveVote(null);
        setMyVote(null);
        setVoteChoice(null);

        return;
      }

      /* =====================================================
         2. LẤY DANH SÁCH BIỂU QUYẾT ĐẠI BIỂU ĐƯỢC NHẬN
      ===================================================== */

      const voteIds =
        voteDataList.map(
          (vote) => vote.id
        );

      const {
        data: voteParticipantData,
        error: voteParticipantError,
      } = await supabase
        .from("meeting_vote_participants")
        .select(`
          id,
          vote_id,
          participant_id
        `)
        .eq(
          "participant_id",
          participantId
        )
        .in(
          "vote_id",
          voteIds
        );

      if (voteParticipantError) {
        console.error(
          "LỖI TẢI DANH SÁCH NHẬN PHIẾU:",
          voteParticipantError
        );

        setActiveVote(null);
        setMyVote(null);
        setVoteChoice(null);

        return;
      }

      console.log(
        "ĐẠI BIỂU ĐƯỢC NHẬN PHIẾU:",
        voteParticipantData
      );

      /* =====================================================
         3. LỌC CÁC BIỂU QUYẾT ĐƯỢC NHẬN
      ===================================================== */

      const allowedVoteIds =
        (
          voteParticipantData || []
        ).map(
          (item) => item.vote_id
        );

      const availableVotes =
        voteDataList.filter(
          (vote) =>
            allowedVoteIds.includes(
              vote.id
            )
        );

      console.log(
        "BIỂU QUYẾT ĐẠI BIỂU ĐƯỢC THAM GIA:",
        availableVotes
      );

      if (
        availableVotes.length === 0
      ) {
        setActiveVote(null);
        setMyVote(null);
        setVoteChoice(null);

        return;
      }

      /* =====================================================
         4. CHỌN BIỂU QUYẾT MỚI NHẤT
      ===================================================== */

      const voteData =
        availableVotes[0] as MeetingVote;

      setActiveVote(
        voteData
      );

      console.log(
        "BIỂU QUYẾT ĐANG HIỂN THỊ:",
        voteData
      );

      /* =====================================================
         5. NẾU CHƯA XÁC NHẬN THAM DỰ
      ===================================================== */

      if (
        attendanceStatus !==
        "Đã xác nhận tham dự"
      ) {
        setMyVote(null);
        setVoteChoice(null);

        return;
      }

      /* =====================================================
         6. TÌM PHIẾU ĐÃ BỎ
      ===================================================== */

      const {
        data: voteItemData,
        error: voteItemError,
      } = await supabase
        .from("meeting_vote_items")
        .select(`
          id,
          vote_id,
          participant_id,
          choice,
          voted_at
        `)
        .eq(
          "vote_id",
          voteData.id
        )
        .eq(
          "participant_id",
          participantId
        )
        .maybeSingle();

      if (voteItemError) {
        console.error(
          "LỖI TẢI PHIẾU CỦA ĐẠI BIỂU:",
          voteItemError
        );

        setMyVote(null);
        setVoteChoice(null);

        return;
      }

      console.log(
        "PHIẾU CỦA ĐẠI BIỂU:",
        voteItemData
      );

      /* =====================================================
         7. ĐÃ CÓ PHIẾU
      ===================================================== */

      if (voteItemData) {
        const currentVoteItem =
          voteItemData as MeetingVoteItem;

        setMyVote(
          currentVoteItem
        );

        if (
          currentVoteItem.choice ===
            "Đồng ý" ||
          currentVoteItem.choice ===
            "Không đồng ý"
        ) {
          setVoteChoice(
            currentVoteItem.choice as VoteChoice
          );
        } else {
          setVoteChoice(null);
        }

        console.log(
          "ĐÃ TÌM THẤY PHIẾU ĐÃ BỎ:",
          currentVoteItem
        );
      } else {
        setMyVote(null);
        setVoteChoice(null);

        console.log(
          "ĐẠI BIỂU CHƯA BỎ PHIẾU"
        );
      }

    } catch (err) {
      console.error(
        "LỖI LOAD BIỂU QUYẾT:",
        err
      );

      setActiveVote(null);
      setMyVote(null);
      setVoteChoice(null);

    } finally {
      setLoadingVote(false);
    }
  }

  /* =========================================================
     XÁC NHẬN THAM DỰ
  ========================================================= */

  async function confirmAttendance() {
    if (
      !participant ||
      !attendanceChoice
    ) {
      return;
    }

    if (
      attendanceChoice ===
        "Không tham dự" &&
      !absenceReason.trim()
    ) {
      setError(
        "Vui lòng nhập lý do không tham dự."
      );

      return;
    }

    setSavingAttendance(true);
    setError("");

    const responseNote =
      attendanceChoice ===
      "Không tham dự"
        ? absenceReason.trim()
        : null;

    const responseAt =
      new Date().toISOString();

    const {
      error: updateError,
    } = await supabase
      .from("meeting_participants")
      .update({
        attendance_status:
          attendanceChoice,
        response_note:
          responseNote,
        response_at:
          responseAt,
      })
      .eq(
        "id",
        participant.id
      );

    if (updateError) {
      console.error(
        "LỖI CẬP NHẬT THAM DỰ:",
        updateError
      );

      setError(
        `Không thể cập nhật xác nhận tham dự: ${updateError.message}`
      );

      setSavingAttendance(false);
      return;
    }

    const updatedParticipant: Participant = {
      ...participant,
      attendance_status:
        attendanceChoice,
      response_note:
        responseNote,
      response_at:
        responseAt,
    };

    setParticipant(
      updatedParticipant
    );

    await loadActiveVote(
      participant.id,
      attendanceChoice
    );

    setSavingAttendance(false);
  }

  /* =========================================================
     MỞ TÀI LIỆU
  ========================================================= */

  async function openDocument(
    doc: MeetingDocument
  ) {
    if (!doc.file_path) {
      setError(
        "Tài liệu chưa có đường dẫn tệp."
      );

      return;
    }

    setOpeningDocumentId(
      doc.id
    );

    setError("");

    try {
      const {
        data,
        error: signedUrlError,
      } = await supabase.storage
        .from("meeting-documents")
        .createSignedUrl(
          doc.file_path,
          300
        );

      if (
        signedUrlError ||
        !data?.signedUrl
      ) {
        console.error(
          "LỖI MỞ TÀI LIỆU:",
          signedUrlError
        );

        setError(
          `Không thể mở tài liệu: ${
            signedUrlError?.message ||
            "Không xác định"
          }`
        );

        return;
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );

    } finally {
      setOpeningDocumentId(
        null
      );
    }
  }

  /* =========================================================
     TẢI TÀI LIỆU
  ========================================================= */

  async function downloadDocument(
    doc: MeetingDocument
  ) {
    if (!doc.file_path) {
      setError(
        "Tài liệu chưa có đường dẫn tệp."
      );

      return;
    }

    setDownloadingDocumentId(
      doc.id
    );

    setError("");

    try {
      const {
        data,
        error: downloadError,
      } = await supabase.storage
        .from("meeting-documents")
        .download(
          doc.file_path
        );

      if (
        downloadError ||
        !data
      ) {
        console.error(
          "LỖI TẢI TÀI LIỆU:",
          downloadError
        );

        setError(
          `Không thể tải tài liệu: ${
            downloadError?.message ||
            "Không xác định"
          }`
        );

        return;
      }

      const url =
        URL.createObjectURL(data);

      const link =
        window.document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        doc.file_name ||
        "tai-lieu-cuoc-hop";

      window.document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(url);

    } finally {
      setDownloadingDocumentId(
        null
      );
    }
  }

  /* =========================================================
     GỬI GÓP Ý / PHÁT BIỂU
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
      setError(
        "Vui lòng nhập nội dung góp ý hoặc chọn file góp ý."
      );

      return;
    }

    setSavingSpeaking(true);
    setError("");

    try {
      let filePath: string | null =
        null;

      let fileName: string | null =
        null;

      /* =====================================================
         UPLOAD FILE
      ===================================================== */

      if (speakingFile) {
        const safeName =
          speakingFile.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );

        const path =
          `opinions/${meeting.id}/${participant.id}/${Date.now()}-${safeName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("meeting-documents")
          .upload(
            path,
            speakingFile,
            {
              upsert: true,
            }
          );

        if (uploadError) {
          console.error(
            "LỖI UPLOAD GÓP Ý:",
            uploadError
          );

          setError(
            `Không thể tải file góp ý: ${uploadError.message}`
          );

          return;
        }

        filePath = path;
        fileName =
          speakingFile.name;
      }

      /* =====================================================
         KIỂM TRA GÓP Ý ĐÃ CÓ
      ===================================================== */

      const {
        data: existingData,
        error: existingError,
      } = await supabase
        .from("meeting_opinions")
        .select(`
          id,
          meeting_id,
          participant_id,
          speaker_name,
          speaker_position,
          content,
          status,
          registered_at,
          opinion_type,
          file_path,
          file_name
        `)
        .eq(
          "meeting_id",
          meeting.id
        )
        .eq(
          "participant_id",
          participant.id
        )
        .order("registered_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.error(
          "LỖI KIỂM TRA GÓP Ý:",
          existingError
        );

        setError(
          `Không thể kiểm tra góp ý đã gửi: ${existingError.message}`
        );

        return;
      }

      /* =====================================================
         ĐÃ CÓ → UPDATE
      ===================================================== */

      if (existingData) {
        const {
          data: updatedData,
          error: updateError,
        } = await supabase
          .from("meeting_opinions")
          .update({
            content:
              speakingContent.trim() ||
              existingData.content ||
              null,

            file_path:
              filePath ||
              existingData.file_path ||
              null,

            file_name:
              fileName ||
              existingData.file_name ||
              null,

            registered_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existingData.id
          )
          .select(`
            id,
            meeting_id,
            participant_id,
            speaker_name,
            speaker_position,
            content,
            status,
            registered_at,
            opinion_type,
            file_path,
            file_name
          `)
          .single();

        if (updateError) {
          console.error(
            "LỖI UPDATE GÓP Ý:",
            updateError
          );

          setError(
            `Không thể cập nhật góp ý: ${updateError.message}`
          );

          return;
        }

        if (updatedData) {
          setRegistrations([
            updatedData as SpeakingRegistration,
          ]);
        }

      } else {
        /* ===================================================
           CHƯA CÓ → INSERT
        =================================================== */

        const {
          data: insertedData,
          error: insertError,
        } = await supabase
          .from("meeting_opinions")
          .insert({
            meeting_id:
              meeting.id,

            participant_id:
              participant.id,

            speaker_name:
              participant.full_name ||
              "Đại biểu",

            speaker_position:
              participant.position ||
              null,

            content:
              speakingContent.trim() ||
              null,

            status:
              "Đăng ký phát biểu",

            registered_at:
              new Date().toISOString(),

            opinion_type:
              "Góp ý cuộc họp",

            file_path:
              filePath,

            file_name:
              fileName,
          })
          .select(`
            id,
            meeting_id,
            participant_id,
            speaker_name,
            speaker_position,
            content,
            status,
            registered_at,
            opinion_type,
            file_path,
            file_name
          `)
          .single();

        if (insertError) {
          console.error(
            "LỖI INSERT GÓP Ý:",
            insertError
          );

          setError(
            `Không thể gửi góp ý: ${insertError.message}`
          );

          return;
        }

        if (insertedData) {
          setRegistrations([
            insertedData as SpeakingRegistration,
          ]);
        }
      }

      setSpeakingContent("");
      setSpeakingFile(null);
      setShowSpeakingForm(false);

    } catch (err) {
      console.error(
        "LỖI GÓP Ý:",
        err
      );

      setError(
        "Có lỗi xảy ra khi gửi góp ý."
      );

    } finally {
      setSavingSpeaking(false);
    }
  }

  /* =========================================================
     BIỂU QUYẾT
  ========================================================= */

  async function castVote(
    choice:
      | "Đồng ý"
      | "Không đồng ý"
  ) {
    if (
      !participant ||
      !activeVote
    ) {
      return;
    }

    /* =====================================================
       1. CHỈ ĐƯỢC BIỂU QUYẾT KHI ĐANG BIỂU QUYẾT
    ===================================================== */

    if (
      activeVote.status !==
      "Đang biểu quyết"
    ) {
      setError(
        "Biểu quyết đã kết thúc, không thể thay đổi phiếu."
      );

      return;
    }

    /* =====================================================
       2. PHẢI ĐÃ XÁC NHẬN THAM DỰ
    ===================================================== */

    if (
      participant.attendance_status !==
      "Đã xác nhận tham dự"
    ) {
      setError(
        "Chỉ đại biểu đã xác nhận tham dự mới được biểu quyết."
      );

      return;
    }

    setSavingVote(true);
    setError("");

    const votedAt =
      new Date().toISOString();

    try {
      /* =====================================================
         3. ĐÃ CÓ PHIẾU TRONG STATE → UPDATE
      ===================================================== */

      if (myVote) {
        const {
          data: updatedVote,
          error: updateError,
        } = await supabase
          .from("meeting_vote_items")
          .update({
            choice,
            voted_at:
              votedAt,
          })
          .eq(
            "id",
            myVote.id
          )
          .eq(
            "vote_id",
            activeVote.id
          )
          .eq(
            "participant_id",
            participant.id
          )
          .select(`
            id,
            vote_id,
            participant_id,
            choice,
            voted_at
          `)
          .single();

        if (updateError) {
          console.error(
            "LỖI UPDATE PHIẾU:",
            updateError
          );

          setError(
            `Không thể thay đổi phiếu biểu quyết: ${
              updateError.message ||
              "Lỗi không xác định"
            }`
          );

          return;
        }

        if (updatedVote) {
          setMyVote(
            updatedVote as MeetingVoteItem
          );

          setVoteChoice(
            choice
          );
        }

        return;
      }

      /* =====================================================
         4. KIỂM TRA DATABASE TRƯỚC KHI INSERT
      ===================================================== */

      const {
        data: existingVote,
        error: existingVoteError,
      } = await supabase
        .from("meeting_vote_items")
        .select(`
          id,
          vote_id,
          participant_id,
          choice,
          voted_at
        `)
        .eq(
          "vote_id",
          activeVote.id
        )
        .eq(
          "participant_id",
          participant.id
        )
        .maybeSingle();

      if (existingVoteError) {
        console.error(
          "LỖI KIỂM TRA PHIẾU TRƯỚC KHI INSERT:",
          existingVoteError
        );

        setError(
          `Không thể kiểm tra phiếu hiện tại: ${
            existingVoteError.message ||
            "Lỗi không xác định"
          }`
        );

        return;
      }

      /* =====================================================
         5. PHIẾU ĐÃ TỒN TẠI → UPDATE
      ===================================================== */

      if (existingVote) {
        const {
          data: updatedVote,
          error: updateError,
        } = await supabase
          .from("meeting_vote_items")
          .update({
            choice,
            voted_at:
              votedAt,
          })
          .eq(
            "id",
            existingVote.id
          )
          .select(`
            id,
            vote_id,
            participant_id,
            choice,
            voted_at
          `)
          .single();

        if (updateError) {
          console.error(
            "LỖI UPDATE PHIẾU ĐÃ TỒN TẠI:",
            updateError
          );

          setError(
            `Không thể cập nhật phiếu: ${
              updateError.message ||
              "Lỗi không xác định"
            }`
          );

          return;
        }

        if (updatedVote) {
          setMyVote(
            updatedVote as MeetingVoteItem
          );

          setVoteChoice(
            choice
          );
        }

        return;
      }

      /* =====================================================
         6. CHƯA CÓ PHIẾU → INSERT
      ===================================================== */

      const {
        data: insertedVote,
        error: insertError,
      } = await supabase
        .from("meeting_vote_items")
        .insert({
          vote_id:
            activeVote.id,

          participant_id:
            participant.id,

          choice,

          voted_at:
            votedAt,
        })
        .select(`
          id,
          vote_id,
          participant_id,
          choice,
          voted_at
        `)
        .single();

      if (insertError) {
        console.error(
          "LỖI INSERT PHIẾU BIỂU QUYẾT:",
          {
            message:
              insertError.message,

            details:
              insertError.details,

            hint:
              insertError.hint,

            code:
              insertError.code,
          }
        );

        /* ===================================================
           THỬ ĐỌC LẠI PHIẾU

           Nếu request khác vừa tạo phiếu,
           chuyển sang UPDATE.
        =================================================== */

        const {
          data: retryExistingVote,
          error: retryError,
        } = await supabase
          .from("meeting_vote_items")
          .select(`
            id,
            vote_id,
            participant_id,
            choice,
            voted_at
          `)
          .eq(
            "vote_id",
            activeVote.id
          )
          .eq(
            "participant_id",
            participant.id
          )
          .maybeSingle();

        if (
          !retryError &&
          retryExistingVote
        ) {
          const {
            data: recoveredVote,
            error: recoveredUpdateError,
          } = await supabase
            .from("meeting_vote_items")
            .update({
              choice,
              voted_at:
                votedAt,
            })
            .eq(
              "id",
              retryExistingVote.id
            )
            .select(`
              id,
              vote_id,
              participant_id,
              choice,
              voted_at
            `)
            .single();

          if (
            recoveredUpdateError
          ) {
            console.error(
              "LỖI UPDATE PHIẾU SAU KHI INSERT:",
              recoveredUpdateError
            );

            setError(
              `Không thể cập nhật phiếu: ${
                recoveredUpdateError.message ||
                "Lỗi không xác định"
              }`
            );

            return;
          }

          if (recoveredVote) {
            setMyVote(
              recoveredVote as MeetingVoteItem
            );

            setVoteChoice(
              choice
            );
          }

          return;
        }

        setError(
          `Không thể ghi nhận phiếu biểu quyết: ${
            insertError.message ||
            insertError.code ||
            "Lỗi không xác định"
          }`
        );

        return;
      }

      /* =====================================================
         7. INSERT THÀNH CÔNG
      ===================================================== */

      if (insertedVote) {
        setMyVote(
          insertedVote as MeetingVoteItem
        );

        setVoteChoice(
          choice
        );
      }

    } catch (err) {
      console.error(
        "LỖI CAST VOTE:",
        err
      );

      setError(
        "Có lỗi xảy ra khi biểu quyết."
      );

    } finally {
      setSavingVote(false);
    }
  }

  /* =========================================================
     REFRESH BIỂU QUYẾT
  ========================================================= */

  async function refreshVote() {
    if (!participant) {
      return;
    }

    await loadActiveVote(
      participant.id,
      participant.attendance_status
    );
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100">

        <div className="mx-auto max-w-6xl px-5 py-10">

          <div className="py-16 text-center">

            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />

            <p className="mt-4 text-sm text-slate-500">
              Đang tải thông tin cuộc họp...
            </p>

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

        <div className="mx-auto max-w-6xl px-5 py-10">

          <Link
            href="/dai-bieu/phong-hop"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            ← Quay lại Phòng họp
          </Link>

          <div className="mt-5 border-l-4 border-red-400 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>

        </div>

      </main>
    );
  }

  if (
    !meeting ||
    !participant
  ) {
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

      <header className="border-b border-emerald-600 bg-emerald-800 text-white">

        <div className="mx-auto max-w-6xl px-5 py-4">

          <div className="flex items-center justify-between gap-5">

            {/* =================================================
                TÊN HỆ THỐNG
            ================================================= */}

            <div className="flex items-center gap-3">

              <div>

                <h1 className="text-xl font-bold tracking-wide">
                  PHÒNG HỌP KHÔNG GIẤY
                </h1>

                <p className="mt-0.5 text-sm text-emerald-100">
                  Hệ thống điều hành và quản lý công việc nội bộ Tỉnh đoàn
                </p>

              </div>

            </div>

            {/* =================================================
                XIN CHÀO + ICON
            ================================================= */}

            <Link
              href="/dai-bieu/tai-khoan"
              className="group hidden items-center gap-3 rounded-xl px-3 py-1.5 transition hover:bg-emerald-700 md:flex"
            >

              <div className="text-right">

                <p className="text-[11px] text-emerald-100">
                  Xin chào,
                </p>

                <p className="text-sm font-semibold text-white">
                  {currentUserName || "Đại biểu"}
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

        </div>

      </header>
      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-5xl px-5 py-2">

        {/* ===================================================
            TÀI LIỆU
        =================================================== */}

        <section className="border-b border-slate-300 py-4">

          <div className="flex items-start gap-3">

            <div className="mt-0.5 text-xl text-blue-600">
              📁
            </div>

            <div className="min-w-0 flex-1">

            <div className="flex items-center justify-between gap-4">

<h2 className="text-xl font-semibold text-emerald-900">
  Tài liệu: {meeting.title}
</h2>

<Link
  href="/dai-bieu/phong-hop"
  className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
>
  ← Quay về phòng họp
</Link>

</div>

              {documents.length === 0 ? (

                <p className="mt-4 text-sm text-slate-400">
                  Chưa có tài liệu được phát hành.
                </p>

              ) : (

                <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">

                  {documents.map(
                    (doc, index) => (

                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-4 py-1"
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <span className="text-sm text-blue-500">
                            📎
                          </span>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-medium text-slate-800">
                              {index + 1}.{" "}
                              {doc.name ||
                                "Tài liệu cuộc họp"}
                            </p>

                          </div>

                        </div>

                        {doc.file_path && (

                          <div className="flex shrink-0 items-center gap-2">

                            <button
                              type="button"
                              disabled={
                                openingDocumentId ===
                                doc.id
                              }
                              onClick={() =>
                                openDocument(
                                  doc
                                )
                              }
                              className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {openingDocumentId ===
                              doc.id
                                ? "Đang mở..."
                                : "👁 Xem"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                downloadingDocumentId ===
                                doc.id
                              }
                              onClick={() =>
                                downloadDocument(
                                  doc
                                )
                              }
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {downloadingDocumentId ===
                              doc.id
                                ? "Đang tải..."
                                : "↓ Tải về"}
                            </button>

                          </div>

                        )}

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>

        </section>

        {/* ===================================================
            XÁC NHẬN THAM DỰ
        =================================================== */}

        <section className="border-b border-slate-300 py-6">

          <div className="flex items-start gap-3">

            <div className="mt-0.5 text-lg text-emerald-600">
              ✓
            </div>

            <div className="min-w-0 flex-1">

              <h2 className="text-base font-semibold text-emerald-900">
                Xác nhận tham dự
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Vui lòng lựa chọn tình trạng tham dự cuộc họp.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">

                <button
                  type="button"
                  disabled={
                    savingAttendance
                  }
                  onClick={() =>
                    setAttendanceChoice(
                      "Đã xác nhận tham dự"
                    )
                  }
                  className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                    attendanceChoice ===
                    "Đã xác nhận tham dự"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  ✓ Tham dự
                </button>

                <button
                  type="button"
                  disabled={
                    savingAttendance
                  }
                  onClick={() =>
                    setAttendanceChoice(
                      "Không tham dự"
                    )
                  }
                  className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                    attendanceChoice ===
                    "Không tham dự"
                      ? "border-slate-500 bg-slate-500 text-white"
                      : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Không tham dự
                </button>

              </div>

              {attendanceChoice ===
                "Không tham dự" && (

                <div className="mt-4 max-w-2xl">

                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Lý do không tham dự
                  </label>

                  <textarea
                    value={
                      absenceReason
                    }
                    onChange={(
                      event
                    ) =>
                      setAbsenceReason(
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="Nhập lý do không tham dự..."
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                  />

                </div>

              )}

              {attendanceChoice && (

                <div className="mt-3">

                  <button
                    type="button"
                    disabled={
                      savingAttendance
                    }
                    onClick={
                      confirmAttendance
                    }
                    className="rounded-md border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-semibold text-orange-600 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingAttendance
                      ? "Đang cập nhật..."
                      : "Xác nhận"}
                  </button>

                </div>

              )}

              {participant.attendance_status ===
                "Đã xác nhận tham dự" && (

                <div className="mt-4 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">

                  ✓ Đại biểu{" "}

                  <strong>
                    {participant.full_name ||
                      "đại biểu"}
                  </strong>{" "}

                  xác nhận{" "}

                  <strong>
                    tham dự
                  </strong>{" "}

                  cuộc họp.

                </div>

              )}

              {participant.attendance_status ===
                "Không tham dự" && (

                <div className="mt-4 border-l-4 border-slate-400 bg-slate-100 px-4 py-3 text-sm text-slate-700">

                  Đại biểu{" "}

                  <strong>
                    {participant.full_name ||
                      "đại biểu"}
                  </strong>{" "}

                  xác nhận{" "}

                  <strong>
                    không tham dự
                  </strong>{" "}

                  cuộc họp.

                  {participant.response_note && (
                    <>
                      {" "}
                      Lý do:{" "}
                      <strong>
                        {
                          participant.response_note
                        }
                      </strong>
                    </>
                  )}

                </div>

              )}

            </div>

          </div>

        </section>

        {/* ===================================================
            BIỂU QUYẾT
        =================================================== */}

        {!loadingVote &&
          activeVote && (

            <section className="border-b border-slate-300 py-6">

              <div className="flex items-start gap-3">

                <div className="min-w-0 flex-1">

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <h2 className="text-base font-semibold text-emerald-900">

                        <span className="text-amber-500">
                          🗳️{" "}
                        </span>

                        Biểu quyết

                      </h2>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Nội dung biểu quyết do Quản trị mở tại cuộc họp.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={
                        refreshVote
                      }
                      disabled={loadingVote}
                      className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      ↻ Cập nhật
                    </button>

                  </div>

                  {/* =================================================
                      NỘI DUNG BIỂU QUYẾT
                  ================================================= */}

                  <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-4">

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0 flex-1">

                        <p className="text-sm font-semibold text-slate-900">
                          {activeVote.title}
                        </p>

                        {activeVote.description && (

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {
                              activeVote.description
                            }
                          </p>

                        )}

                      </div>

                      {/* =================================================
                          TRẠNG THÁI
                      ================================================= */}

                      {activeVote.status ===
                        "Đang biểu quyết" ? (

                        <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Đang biểu quyết
                        </span>

                      ) : activeVote.status ===
                        "Đã kết thúc" ? (

                        <span className="shrink-0 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          Đã kết thúc
                        </span>

                      ) : (

                        <span className="shrink-0 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                          {activeVote.status}
                        </span>

                      )}

                    </div>

                    {/* =================================================
                        CHƯA XÁC NHẬN THAM DỰ
                    ================================================= */}

                    {participant.attendance_status !==
                      "Đã xác nhận tham dự" && (

                      <div className="mt-4 border-l-4 border-slate-400 bg-slate-100 px-3 py-2.5 text-xs text-slate-600">

                        Anh/chị chưa xác nhận tham dự nên không thể tham gia biểu quyết.

                      </div>

                    )}

                    {/* =================================================
                        ĐANG BIỂU QUYẾT
                    ================================================= */}

                    {activeVote.status ===
                      "Đang biểu quyết" &&
                      participant.attendance_status ===
                        "Đã xác nhận tham dự" && (

                      <div className="mt-5">

                        <p className="mb-3 text-xs font-semibold text-slate-600">
                          Lựa chọn của anh/chị:
                        </p>

                        {/* =================================================
                            ĐÃ CHỌN
                        ================================================= */}

                        {voteChoice ? (

                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">

                            <p className="text-sm font-semibold text-emerald-800">

                              ✓ Bạn đã{" "}

                              {voteChoice ===
                              "Đồng ý"
                                ? "đồng ý"
                                : "không đồng ý"}{" "}

                              với nội dung biểu quyết.

                            </p>

                            <p className="mt-1 text-xs text-emerald-700">

                              Lựa chọn hiện tại:{" "}

                              <strong>
                                {voteChoice}
                              </strong>

                            </p>

                            <p className="mt-1 text-xs text-emerald-600">
                              Bạn có thể thay đổi lựa chọn khi cuộc biểu quyết chưa kết thúc.
                            </p>

                            <div className="mt-3 flex flex-wrap gap-3">

                              {voteChoice ===
                              "Đồng ý" ? (

                                <button
                                  type="button"
                                  disabled={
                                    savingVote
                                  }
                                  onClick={() =>
                                    castVote(
                                      "Không đồng ý"
                                    )
                                  }
                                  className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {savingVote
                                    ? "Đang cập nhật..."
                                    : "Đổi sang Không đồng ý"}
                                </button>

                              ) : (

                                <button
                                  type="button"
                                  disabled={
                                    savingVote
                                  }
                                  onClick={() =>
                                    castVote(
                                      "Đồng ý"
                                    )
                                  }
                                  className="rounded-md border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {savingVote
                                    ? "Đang cập nhật..."
                                    : "Đổi sang Đồng ý"}
                                </button>

                              )}

                            </div>

                          </div>

                        ) : (

                          /* =================================================
                             CHƯA BIỂU QUYẾT
                          ================================================= */

                          <div>

                            <p className="mb-3 text-sm text-slate-700">
                              Anh/chị có đồng ý với nội dung biểu quyết này không?
                            </p>

                            <div className="flex flex-wrap gap-3">

                              <button
                                type="button"
                                disabled={
                                  savingVote
                                }
                                onClick={() =>
                                  castVote(
                                    "Đồng ý"
                                  )
                                }
                                className="rounded-md border border-emerald-600 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingVote
                                  ? "Đang ghi nhận..."
                                  : "✓ Đồng ý"}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  savingVote
                                }
                                onClick={() =>
                                  castVote(
                                    "Không đồng ý"
                                  )
                                }
                                className="rounded-md border border-red-500 bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingVote
                                  ? "Đang ghi nhận..."
                                  : "Không đồng ý"}
                              </button>

                            </div>

                          </div>

                        )}

                      </div>

                    )}

                    {/* =================================================
                        ĐÃ KẾT THÚC
                    ================================================= */}

                    {activeVote.status ===
                      "Đã kết thúc" && (

                      <div className="mt-5 border-l-4 border-slate-400 bg-slate-100 px-4 py-3">

                        <p className="text-sm font-medium text-slate-700">
                          Biểu quyết đã kết thúc.
                        </p>

                        {myVote &&
                        myVote.choice ? (

                          <>

                            <p className="mt-2 text-sm text-slate-600">

                              Bạn đã biểu quyết:{" "}

                              <strong className="text-slate-800">
                                {myVote.choice}
                              </strong>

                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Lựa chọn của bạn đã được khóa và không thể thay đổi.
                            </p>

                          </>

                        ) : (

                          <p className="mt-1 text-xs text-slate-500">
                            Bạn chưa thực hiện biểu quyết trước khi cuộc biểu quyết kết thúc.
                          </p>

                        )}

                      </div>

                    )}

                  </div>

                </div>

              </div>

            </section>

          )}

        {/* ===================================================
            GÓP Ý / PHÁT BIỂU
        =================================================== */}

        <section className="py-6">

          <div className="flex items-start gap-3">

            <div className="mt-0.5 text-lg text-indigo-600">
              💬
            </div>

            <div className="min-w-0 flex-1">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                <div>

                  <h2 className="text-base font-semibold text-emerald-900">
                    Góp ý / Phát biểu
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Gửi một lần cho toàn bộ cuộc họp bằng nội dung hoặc file góp ý.
                  </p>

                </div>

                {!showSpeakingForm && (

                  <button
                    type="button"
                    onClick={() =>
                      setShowSpeakingForm(
                        true
                      )
                    }
                    className="shrink-0 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    {registrations.length > 0
                      ? "✎ Sửa góp ý"
                      : "+ Gửi góp ý"}
                  </button>

                )}

              </div>

              {showSpeakingForm && (

                <div className="mt-4 max-w-3xl">

                  <textarea
                    value={
                      speakingContent
                    }
                    onChange={(
                      event
                    ) =>
                      setSpeakingContent(
                        event.target.value
                      )
                    }
                    rows={5}
                    placeholder="Nhập nội dung góp ý hoặc vấn đề dự kiến phát biểu..."
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                  />

                  <div className="mt-3">

                    <label className="block text-xs font-semibold text-slate-600">
                      File góp ý
                    </label>

                    <input
                      type="file"
                      onChange={(
                        event
                      ) =>
                        setSpeakingFile(
                          event.target.files?.[0] ||
                            null
                        )
                      }
                      className="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
                    />

                    {speakingFile && (

                      <p className="mt-1.5 text-xs text-slate-400">
                        Đã chọn:{" "}
                        {speakingFile.name}
                      </p>

                    )}

                  </div>

                  <div className="mt-3 flex justify-end gap-2">

                    <button
                      type="button"
                      onClick={() => {

                        setShowSpeakingForm(
                          false
                        );

                        setSpeakingContent(
                          ""
                        );

                        setSpeakingFile(
                          null
                        );

                      }}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Hủy
                    </button>

                    <button
                      type="button"
                      disabled={
                        savingSpeaking
                      }
                      onClick={
                        registerSpeaking
                      }
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {savingSpeaking
                        ? "Đang gửi..."
                        : registrations.length > 0
                          ? "Cập nhật góp ý"
                          : "Gửi góp ý"}
                    </button>

                  </div>

                </div>

              )}

              {registrations.length >
                0 && (

                <div className="mt-5 max-w-3xl border-t border-slate-200 pt-4">

                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Góp ý của tôi
                  </p>

                  {registrations
                    .slice(0, 1)
                    .map(
                      (
                        registration
                      ) => (

                        <div
                          key={
                            registration.id
                          }
                          className="border-l-2 border-emerald-400 pl-3"
                        >

                          {registration.content && (

                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {
                                registration.content
                              }
                            </p>

                          )}

                          {registration.file_name && (

                            <p className="mt-2 text-xs text-slate-500">

                              📎 File:{" "}

                              <span className="font-medium text-slate-700">
                                {
                                  registration.file_name
                                }
                              </span>

                            </p>

                          )}

                          <p className="mt-1 text-xs text-slate-400">

                            Gửi lúc{" "}

                            {new Date(
                              registration.registered_at
                            ).toLocaleString(
                              "vi-VN"
                            )}

                          </p>

                        </div>

                      )
                    )}

                </div>

              )}

            </div>

          </div>

        </section>

        {/* =====================================================
            THÔNG BÁO LỖI
        ===================================================== */}

        {error && (

          <div className="mb-5 border-l-4 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>

        )}

      </div>

    </main>
  );
}

