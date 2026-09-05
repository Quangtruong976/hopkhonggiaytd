"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type OpinionRequest = {
  id: number;
  title: string;
  content: string;
  deadline: string | null;
  status: string;
  created_at: string;
};

type OpinionParticipant = {
  id: number;
  opinion_request_id: number;
  full_name: string;
  position: string | null;
  organization: string | null;
};

type OpinionResponse = {
  id: number;
  opinion_request_id: number;
  participant_id: number;
  result: string;
  opinion: string | null;
  responded_at: string;
};

type OpinionDocument = {
  id: number;
  opinion_request_id: number;
  file_name: string;
  file_path: string;
  created_at: string;
};

/* =========================================================
   PAGE
========================================================= */

export default function XinYKienDaiBieuPage() {
  /* =======================================================
     DATA
  ======================================================= */

  const [requests, setRequests] =
    useState<OpinionRequest[]>([]);

  const [participants, setParticipants] =
    useState<OpinionParticipant[]>([]);

  const [responses, setResponses] =
    useState<OpinionResponse[]>([]);

  const [documents, setDocuments] =
    useState<OpinionDocument[]>([]);

  /* =======================================================
     CURRENT USER
  ======================================================= */

  const [currentUserName, setCurrentUserName] =
    useState("");

  /* =======================================================
     UI
  ======================================================= */

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [expandedId, setExpandedId] =
    useState<number | null>(null);

  /* =======================================================
     RESPONSE FORM
  ======================================================= */

  const [selectedResult, setSelectedResult] =
    useState("");

  const [opinion, setOpinion] =
    useState("");

  /* =======================================================
     PAGINATION
  ======================================================= */

  const ITEMS_PER_PAGE = 5;

  const [currentPage, setCurrentPage] =
    useState(1);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    setMessage("");

    /* -------------------------------------------------------
       1. NGƯỜI ĐANG ĐĂNG NHẬP
    ------------------------------------------------------- */

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser();

    if (
      authError ||
      !authData.user
    ) {
      setError(
        "Không xác định được người đang đăng nhập."
      );

      setLoading(false);
      return;
    }

    const userId =
      authData.user.id;

    /* -------------------------------------------------------
       2. PROFILE
    ------------------------------------------------------- */

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (
      profileError ||
      !profileData
    ) {
      console.error(profileError);

      setError(
        "Không thể xác định thông tin đại biểu."
      );

      setLoading(false);
      return;
    }

    const fullName =
      profileData.full_name?.trim() ||
      "";

    setCurrentUserName(
      fullName
    );

    if (!fullName) {
      setError(
        "Tài khoản chưa có họ và tên trong hồ sơ."
      );

      setLoading(false);
      return;
    }

    /* -------------------------------------------------------
       3. TẤT CẢ PHIẾU
    ------------------------------------------------------- */

    const {
      data: requestData,
      error: requestError,
    } = await supabase
      .from("opinion_requests")
      .select(
        "id,title,content,deadline,status,created_at"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (requestError) {
      console.error(
        requestError
      );

      setError(
        `Không thể tải phiếu xin ý kiến: ${requestError.message}`
      );

      setLoading(false);
      return;
    }

    /* -------------------------------------------------------
       4. THÀNH PHẦN ĐƯỢC LẤY Ý KIẾN
    ------------------------------------------------------- */

    const {
      data: participantData,
      error: participantError,
    } = await supabase
      .from("opinion_participants")
      .select(
        "id,opinion_request_id,full_name,position,organization"
      )
      .order("id", {
        ascending: true,
      });

    if (participantError) {
      console.error(
        participantError
      );

      setError(
        `Không thể tải thành phần xin ý kiến: ${participantError.message}`
      );

      setLoading(false);
      return;
    }

    /* -------------------------------------------------------
       5. PHẢN HỒI
    ------------------------------------------------------- */

    const {
      data: responseData,
      error: responseError,
    } = await supabase
      .from("opinion_responses")
      .select(
        "id,opinion_request_id,participant_id,result,opinion,responded_at"
      )
      .order(
        "responded_at",
        {
          ascending: false,
        }
      );

    if (responseError) {
      console.error(
        responseError
      );

      setError(
        `Không thể tải ý kiến đã gửi: ${responseError.message}`
      );

      setLoading(false);
      return;
    }

    /* -------------------------------------------------------
       6. VĂN BẢN
    ------------------------------------------------------- */

    const {
      data: documentData,
      error: documentError,
    } = await supabase
      .from("opinion_documents")
      .select(
        "id,opinion_request_id,file_name,file_path,created_at"
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (documentError) {
      console.error(
        documentError
      );

      setError(
        `Không thể tải văn bản: ${documentError.message}`
      );

      setLoading(false);
      return;
    }

    /* -------------------------------------------------------
       7. GÁN DATA
    ------------------------------------------------------- */

    setRequests(
      (requestData ||
        []) as OpinionRequest[]
    );

    setParticipants(
      (participantData ||
        []) as OpinionParticipant[]
    );

    setResponses(
      (responseData ||
        []) as OpinionResponse[]
    );

    setDocuments(
      (documentData ||
        []) as OpinionDocument[]
    );

    setLoading(false);
  }

  /* =========================================================
     LỌC PHIẾU ĐẠI BIỂU ĐƯỢC MỜI
  ========================================================= */

  const myParticipants =
    useMemo(() => {
      const normalizedName =
        currentUserName
          .trim()
          .toLowerCase();

      if (!normalizedName) {
        return [];
      }

      return participants.filter(
        (participant) =>
          participant.full_name
            .trim()
            .toLowerCase() ===
          normalizedName
      );
    }, [
      participants,
      currentUserName,
    ]);

  /* =========================================================
     PHIẾU CỦA ĐẠI BIỂU
  ========================================================= */

  const myRequests =
    useMemo(() => {
      const requestIds =
        new Set(
          myParticipants.map(
            (participant) =>
              participant.opinion_request_id
          )
        );

      return requests.filter(
        (request) =>
          requestIds.has(
            request.id
          )
      );
    }, [
      requests,
      myParticipants,
    ]);

  /* =========================================================
     TOTAL PAGES
  ========================================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        myRequests.length /
          ITEMS_PER_PAGE
      )
    );

  /* =========================================================
     ĐẢM BẢO TRANG HỢP LỆ
  ========================================================= */

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

  /* =========================================================
     PHIẾU TRÊN TRANG HIỆN TẠI
  ========================================================= */

  const paginatedRequests =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        ITEMS_PER_PAGE;

      return myRequests.slice(
        start,
        start +
          ITEMS_PER_PAGE
      );
    }, [
      myRequests,
      currentPage,
    ]);

  /* =========================================================
     SỐ THỨ TỰ TOÀN BỘ
  ========================================================= */

  function getDisplayNumber(
    index: number
  ) {
    return (
      (currentPage - 1) *
        ITEMS_PER_PAGE +
      index +
      1
    );
  }

  /* =========================================================
     HELPER
  ========================================================= */

  function getParticipantForRequest(
    requestId: number
  ) {
    return (
      myParticipants.find(
        (participant) =>
          participant.opinion_request_id ===
          requestId
      ) || null
    );
  }

  function getMyResponse(
    requestId: number
  ) {
    const participant =
      getParticipantForRequest(
        requestId
      );

    if (!participant) {
      return undefined;
    }

    return responses.find(
      (response) =>
        response.opinion_request_id ===
          requestId &&
        response.participant_id ===
          participant.id
    );
  }

  function getDocuments(
    requestId: number
  ) {
    return documents.filter(
      (document) =>
        document.opinion_request_id ===
        requestId
    );
  }

  function getParticipantCount(
    requestId: number
  ) {
    return participants.filter(
      (participant) =>
        participant.opinion_request_id ===
        requestId
    ).length;
  }

  function getResponseCount(
    requestId: number
  ) {
    return responses.filter(
      (response) =>
        response.opinion_request_id ===
        requestId
    ).length;
  }

  function isFinished(
    request: OpinionRequest
  ) {
    return (
      request.status ===
      "Đã kết thúc"
    );
  }

  function isDeadlinePassed(
    deadline: string | null
  ) {
    if (!deadline) {
      return false;
    }

    const end =
      new Date(deadline);

    if (
      Number.isNaN(
        end.getTime()
      )
    ) {
      return false;
    }

    return (
      end.getTime() <
      Date.now()
    );
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "—";
    }

    const parts =
      value.split("-");

    if (
      parts.length === 3
    ) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return new Date(
      value
    ).toLocaleDateString(
      "vi-VN"
    );
  }

  function formatDeadline(
    value: string | null
  ) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function formatDateTime(
    value: string
  ) {
    return new Date(
      value
    ).toLocaleString(
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  /* =========================================================
     OPEN DOCUMENT
  ========================================================= */

  async function openDocument(
    filePath: string
  ) {
    setError("");

    const {
      data,
      error,
    } = await supabase.storage
      .from(
        "opinion-documents"
      )
      .createSignedUrl(
        filePath,
        60 * 10
      );

    if (error) {
      console.error(error);

      setError(
        `Không thể mở văn bản: ${error.message}`
      );

      return;
    }

    if (
      data?.signedUrl
    ) {
      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    }
  }

  /* =========================================================
     OPEN REQUEST
  ========================================================= */

  function openRequest(
    request: OpinionRequest
  ) {
    setError("");
    setMessage("");

    const response =
      getMyResponse(
        request.id
      );

    if (response) {
      setSelectedResult(
        response.result
      );

      setOpinion(
        response.opinion ||
          ""
      );
    } else {
      setSelectedResult("");
      setOpinion("");
    }

    setExpandedId(
      request.id
    );
  }

  /* =========================================================
     CLOSE REQUEST
  ========================================================= */

  function closeRequest() {
    setExpandedId(
      null
    );

    setSelectedResult(
      ""
    );

    setOpinion(
      ""
    );
  }

  /* =========================================================
     SAVE RESPONSE
  ========================================================= */

  async function saveResponse(
    event: FormEvent<HTMLFormElement>,
    request: OpinionRequest
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const participant =
      getParticipantForRequest(
        request.id
      );

    if (!participant) {
      setError(
        "Bạn không thuộc thành phần được lấy ý kiến của phiếu này."
      );
      return;
    }

    /* -------------------------------------------------------
       PHIẾU ĐÃ KẾT THÚC
    ------------------------------------------------------- */

    if (
      isFinished(request)
    ) {
      setError(
        "Phiếu đã kết thúc. Không thể thay đổi ý kiến."
      );
      return;
    }

    /* -------------------------------------------------------
       HẾT HẠN
    ------------------------------------------------------- */

    if (
      isDeadlinePassed(
        request.deadline
      )
    ) {
      setError(
        "Phiếu đã hết thời hạn gửi ý kiến."
      );
      return;
    }

    /* -------------------------------------------------------
       KIỂM TRA KẾT QUẢ
    ------------------------------------------------------- */

    if (!selectedResult) {
      setError(
        "Vui lòng chọn Đồng ý, Không đồng ý hoặc Ý kiến khác."
      );
      return;
    }

    /* -------------------------------------------------------
       Ý KIẾN KHÁC
    ------------------------------------------------------- */

    if (
      selectedResult ===
        "Ý kiến khác" &&
      !opinion.trim()
    ) {
      setError(
        "Vui lòng nhập nội dung ý kiến khác."
      );
      return;
    }

    setSaving(true);

    const existingResponse =
      getMyResponse(
        request.id
      );

    /* =======================================================
       CẬP NHẬT
    ======================================================= */

    if (existingResponse) {
      const {
        error: updateError,
      } = await supabase
        .from(
          "opinion_responses"
        )
        .update({
          result:
            selectedResult,

          opinion:
            opinion.trim() ||
            null,

          responded_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          existingResponse.id
        );

      if (updateError) {
        console.error(
          updateError
        );

        setError(
          `Không thể cập nhật ý kiến: ${updateError.message}`
        );

        setSaving(false);
        return;
      }

      setResponses(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              existingResponse.id
                ? {
                    ...item,
                    result:
                      selectedResult,
                    opinion:
                      opinion.trim() ||
                      null,
                    responded_at:
                      new Date().toISOString(),
                  }
                : item
          )
      );

      setMessage(
        "Đã cập nhật ý kiến thành công."
      );
    }

    /* =======================================================
       TẠO MỚI
    ======================================================= */

    else {
      const {
        data: insertedResponse,
        error: insertError,
      } = await supabase
        .from(
          "opinion_responses"
        )
        .insert({
          opinion_request_id:
            request.id,

          participant_id:
            participant.id,

          result:
            selectedResult,

          opinion:
            opinion.trim() ||
            null,

          responded_at:
            new Date().toISOString(),
        })
        .select(
          "id,opinion_request_id,participant_id,result,opinion,responded_at"
        )
        .single();

      if (insertError) {
        console.error(
          insertError
        );

        setError(
          `Không thể gửi ý kiến: ${insertError.message}`
        );

        setSaving(false);
        return;
      }

      if (
        insertedResponse
      ) {
        setResponses(
          (current) => [
            insertedResponse as OpinionResponse,
            ...current,
          ]
        );
      }

      setMessage(
        "Đã gửi ý kiến thành công."
      );
    }

    /* -------------------------------------------------------
       TỰ ĐỘNG THU GỌN
    ------------------------------------------------------- */

    setExpandedId(
      null
    );

    setSelectedResult(
      ""
    );

    setOpinion(
      ""
    );

    setSaving(false);
  }

  /* =========================================================
     ĐỔI TRANG
  ========================================================= */

  function goToPage(
    page: number
  ) {
    if (
      page < 1 ||
      page > totalPages
    ) {
      return;
    }

    setCurrentPage(
      page
    );

    setExpandedId(
      null
    );

    setSelectedResult(
      ""
    );

    setOpinion(
      ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =========================================================
     PAGE NUMBERS
  ========================================================= */

  const pageNumbers =
    Array.from(
      {
        length: totalPages,
      },
      (_, index) =>
        index + 1
    );

  /* =========================================================
     RANGE HIỂN THỊ
  ========================================================= */

  const displayStart =
    myRequests.length === 0
      ? 0
      : (currentPage - 1) *
          ITEMS_PER_PAGE +
        1;

  const displayEnd =
    Math.min(
      currentPage *
        ITEMS_PER_PAGE,
      myRequests.length
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

  {/* BÊN TRÁI */}

  <div className="min-w-0">

    <h1 className="text-xl font-bold tracking-wide">
      PHÒNG HỌP KHÔNG GIẤY
    </h1>

    <p className="mt-0.5 text-sm text-emerald-100">
      Trang thông tin dành cho đại biểu
    </p>

  </div>


  {/* BÊN PHẢI - XIN CHÀO ĐẠI BIỂU */}
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

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

          <div>

          <h2 className="flex items-center gap-2 text-xl font-bold text-emerald-900">
  <span className="text-amber-500">💬</span>
            Nội dung xin ý kiến đại biểu
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Các nội dung được gửi đến bạn để xem xét và cho ý kiến.
            </p>

          </div>


          {/* =================================================
              TỔNG SỐ
          ================================================= */}

          {!loading &&
            myRequests.length > 0 && (

              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-2.5 shadow-sm">

                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700">
                  {myRequests.length}
                </span>

                <div>

                  <p className="text-[11px] text-slate-400">
                    Tổng nội dung
                  </p>

                  <p className="text-xs font-semibold text-slate-700">
                    được lấy ý kiến

                  </p>

                </div>

              </div>

            )}

        </div>


        {/* ===================================================
            MESSAGE
        =================================================== */}

        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}


        {/* ===================================================
            LOADING
        =================================================== */}

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            Đang tải nội dung xin ý kiến...
          </div>

        ) : myRequests.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600">
              ✓
            </div>

            <p className="mt-4 font-semibold text-slate-700">
              Hiện không có nội dung xin ý kiến
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Khi quản trị viên gửi nội dung đến bạn, nội dung sẽ được hiển thị tại đây.
            </p>

          </div>

        ) : (

          <>

            {/* =================================================
                THÔNG TIN TRANG
            ================================================= */}

            <div className="mb-3 flex items-center justify-between">

              <p className="text-xs font-medium text-slate-500">
                Hiển thị{" "}
                <span className="font-semibold text-slate-700">
                  {displayStart}
                </span>
                –
                <span className="font-semibold text-slate-700">
                  {displayEnd}
                </span>{" "}
                /{" "}
                <span className="font-semibold text-emerald-700">
                  {myRequests.length}
                </span>{" "}
                nội dung
              </p>

              {totalPages > 1 && (
                <p className="hidden text-xs text-slate-400 sm:block">
                  Trang {currentPage} / {totalPages}
                </p>
              )}

            </div>


            {/* =================================================
                DANH SÁCH
            ================================================= */}

            <div className="space-y-3">

              {paginatedRequests.map(
                (
                  request,
                  index
                ) => {

                  const participant =
                    getParticipantForRequest(
                      request.id
                    );

                  if (!participant) {
                    return null;
                  }

                  const response =
                    getMyResponse(
                      request.id
                    );

                  const expanded =
                    expandedId ===
                    request.id;

                  const finished =
                    isFinished(
                      request
                    );

                  const deadlinePassed =
                    isDeadlinePassed(
                      request.deadline
                    );

                  const totalParticipants =
                    getParticipantCount(
                      request.id
                    );

                  const totalResponses =
                    getResponseCount(
                      request.id
                    );

                  const displayNumber =
                    getDisplayNumber(
                      index
                    );

                  return (
                    <section
                      key={
                        request.id
                      }
                      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                        expanded
                          ? "border-emerald-300 shadow-md"
                          : finished
                            ? "border-slate-200"
                            : "border-slate-200 hover:border-emerald-200 hover:shadow-md"
                      }`}
                    >

                      {/* =================================================
                          CARD HEADER
                      ================================================= */}

                      <button
                        type="button"
                        onClick={() =>
                          expanded
                            ? closeRequest()
                            : openRequest(
                                request
                              )
                        }
                        className="w-full cursor-pointer px-4 py-4 text-left sm:px-5"
                      >

                        <div className="flex items-center gap-4">

                          {/* =================================================
                              SỐ THỨ TỰ
                          ================================================= */}

                          <div
                            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold shadow-sm ${
                              finished
                                ? "bg-slate-100 text-slate-400"
                                : response
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-emerald-700 text-white"
                            }`}
                          >

                            {String(
                              displayNumber
                            ).padStart(
                              2,
                              "0"
                            )}

                            {response && (
                              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[10px] font-bold text-white">
                                ✓
                              </span>
                            )}

                          </div>


                          {/* =================================================
                              NỘI DUNG
                          ================================================= */}

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3
                                className={`text-sm font-semibold leading-5 sm:text-base ${
                                  finished
                                    ? "text-slate-500"
                                    : "text-slate-800"
                                }`}
                              >
                                {request.title}
                              </h3>


                              {/* TRẠNG THÁI */}

                              {finished ? (

                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                                  Đã kết thúc
                                </span>

                              ) : deadlinePassed ? (

                                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600">
                                  Hết hạn
                                </span>

                              ) : (

                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                                  Đang lấy ý kiến
                                </span>

                              )}

                            </div>


                            <p
                              className={`mt-1 line-clamp-1 text-xs sm:text-sm ${
                                finished
                                  ? "text-slate-400"
                                  : "text-slate-500"
                              }`}
                            >
                              {request.content}
                            </p>

                          </div>


                          {/* =================================================
                              THỐNG KÊ
                          ================================================= */}

                          <div className="hidden shrink-0 items-center gap-2 sm:flex">

                            {/* ĐÃ TRẢ LỜI / TỔNG */}

                            <div
                              className={`rounded-xl px-3 py-2 text-center ${
                                finished
                                  ? "bg-slate-100"
                                  : response
                                    ? "bg-emerald-50"
                                    : "bg-amber-50"
                              }`}
                            >

                              <p
                                className={`text-sm font-bold ${
                                  finished
                                    ? "text-slate-500"
                                    : response
                                      ? "text-emerald-700"
                                      : "text-amber-700"
                                }`}
                              >
                                {response
                                  ? "1"
                                  : "0"}
                                /
                                1
                              </p>

                              <p className="text-[9px] font-medium text-slate-400">
                                Ý kiến của bạn
                              </p>

                            </div>


                            {/* TỔNG ĐẠI BIỂU */}

                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">

                              <p className="text-sm font-bold text-slate-600">
                                {
                                  totalResponses
                                }
                                /
                                {
                                  totalParticipants
                                }
                              </p>

                              <p className="text-[9px] font-medium text-slate-400">
                                Đã trả lời
                              </p>

                            </div>

                          </div>


                          {/* =================================================
                              MOBILE STATS
                          ================================================= */}

                          <div className="flex shrink-0 flex-col items-end gap-1 sm:hidden">

                            <span
                              className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                                response
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {response
                                ? "✓ Đã trả lời"
                                : "Chưa trả lời"}
                            </span>

                            <span className="text-[10px] text-slate-400">
                              {totalResponses}/
                              {totalParticipants}
                            </span>

                          </div>


                          {/* =================================================
                              ARROW
                          ================================================= */}

                          <span
                            className={`hidden shrink-0 text-slate-400 transition sm:block ${
                              expanded
                                ? "rotate-180"
                                : ""
                            }`}
                          >
                            ▼
                          </span>

                        </div>


                        {/* =================================================
                            META LINE
                        ================================================= */}

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 pl-16 text-[11px] text-slate-400 sm:pl-16">

                          <span>
                            Hạn:{" "}
                            <span
                              className={
                                finished
                                  ? "text-slate-400"
                                  : deadlinePassed
                                    ? "font-semibold text-slate-500"
                                    : "text-slate-500"
                              }
                            >
                              {formatDate(
                                request.deadline
                              )}
                            </span>
                          </span>

                          <span>
                            {totalParticipants} đại biểu được lấy ý kiến
                          </span>

                          {response && (
                            <span className="font-semibold text-emerald-600">
                              ✓ Bạn đã gửi ý kiến
                            </span>
                          )}

                        </div>

                      </button>


                      {/* =================================================
                          DETAIL
                      ================================================= */}

                      {expanded && (

                        <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5">

                          {/* =================================================
                              BASIC INFORMATION
                          ================================================= */}

                          <div className="grid gap-4 lg:grid-cols-2">

                            {/* ---------------------------------------------
                                NỘI DUNG
                            --------------------------------------------- */}

                            <div className="rounded-xl border border-slate-200 bg-white p-4">

                              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">

                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-xs text-emerald-700">
                                  01
                                </span>

                                Nội dung xin ý kiến

                              </h4>

                              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                {request.content}
                              </div>


                              <div className="mt-4 flex flex-wrap gap-2">

                                <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                                  Ngày tạo:{" "}
                                  {formatDateTime(
                                    request.created_at
                                  )}
                                </span>

                                <span
                                  className={`rounded-lg px-3 py-2 text-xs ${
                                    deadlinePassed
                                      ? "bg-red-50 text-red-600"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  Hạn trả lời:{" "}
                                  {formatDeadline(
                                    request.deadline
                                  )}
                                </span>

                              </div>

                            </div>


                            {/* ---------------------------------------------
                                VĂN BẢN
                            --------------------------------------------- */}

                            <div className="rounded-xl border border-slate-200 bg-white p-4">

                              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">

                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-xs text-blue-700">
                                  📄
                                </span>

                                Văn bản gửi kèm

                              </h4>

                              <div className="mt-3 space-y-2">

                                {getDocuments(
                                  request.id
                                ).length ===
                                0 ? (

                                  <p className="text-sm text-slate-400">
                                    Chưa có văn bản gửi kèm.
                                  </p>

                                ) : (

                                  getDocuments(
                                    request.id
                                  ).map(
                                    (
                                      document,
                                      documentIndex
                                    ) => (

                                      <button
                                        key={
                                          document.id
                                        }
                                        type="button"
                                        onClick={() =>
                                          openDocument(
                                            document.file_path
                                          )
                                        }
                                        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-emerald-200 hover:bg-slate-50"
                                      >

                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm">
                                          📄
                                        </span>

                                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                          {documentIndex +
                                            1}
                                          .{" "}
                                          {
                                            document.file_name
                                          }
                                        </span>

                                        <span className="shrink-0 text-xs font-semibold text-emerald-700">
                                          Xem
                                        </span>

                                      </button>

                                    )
                                  )

                                )}

                              </div>

                            </div>

                          </div>


                          {/* =================================================
                              PHIẾU ĐÃ KẾT THÚC
                          ================================================= */}

                          {finished ? (

                            <div className="mt-4 rounded-xl border border-slate-200 bg-white">

                              <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">

                                <h4 className="text-sm font-bold text-slate-700">
                                  Ý kiến của bạn
                                </h4>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  Phiếu đã kết thúc và không thể thay đổi.
                                </p>

                              </div>


                              <div className="p-4 sm:p-5">

                                {response ? (

                                  <>

                                    <div className="flex flex-wrap items-center gap-2">

                                      <span className="text-sm font-semibold text-slate-600">
                                        Kết quả:
                                      </span>

                                      <span
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                          response.result ===
                                          "Đồng ý"
                                            ? "bg-emerald-50 text-emerald-700"
                                            : response.result ===
                                                "Không đồng ý"
                                              ? "bg-red-50 text-red-700"
                                              : "bg-amber-50 text-amber-700"
                                        }`}
                                      >
                                        {
                                          response.result
                                        }
                                      </span>

                                    </div>


                                    {response.opinion && (

                                      <div className="mt-4 rounded-xl bg-slate-50 p-4">

                                        <p className="text-xs font-semibold text-slate-500">
                                          Nội dung ý kiến
                                        </p>

                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                          {
                                            response.opinion
                                          }
                                        </p>

                                      </div>

                                    )}


                                    <p className="mt-3 text-xs text-slate-400">
                                      Đã gửi lúc{" "}
                                      {formatDateTime(
                                        response.responded_at
                                      )}
                                    </p>

                                  </>

                                ) : (

                                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">

                                    <p className="font-semibold text-slate-600">
                                      Bạn chưa gửi ý kiến
                                    </p>

                                    <p className="mt-1 text-sm text-slate-400">
                                      Phiếu đã kết thúc nên không thể gửi bổ sung.
                                    </p>

                                  </div>

                                )}

                              </div>

                            </div>

                          ) : deadlinePassed ? (

                            /* =================================================
                                HẾT HẠN
                            ================================================= */

                            <div className="mt-4 rounded-xl border border-red-200 bg-white">

                              <div className=" border-red-100 bg-emerald-100 px-4 py-3">

                                <h4 className="text-sm font-bold emerald-red-600">
                                  Phiếu đã hết thời hạn
                                </h4>

                                <p className="mt-0.5 text-xs text-emerald-500">
                                  Không thể gửi hoặc cập nhật ý kiến sau thời hạn.
                                </p>

                              </div>


                              <div className="p-4 sm:p-5">

                                {response ? (

                                  <div className="rounded-xl bg-slate-50 p-4">

                                    <div className="flex flex-wrap items-center gap-2">

                                      <span className="text-sm font-semibold text-slate-600">
                                        Ý kiến đã gửi:
                                      </span>

                                      <span
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                          response.result ===
                                          "Đồng ý"
                                            ? "bg-emerald-50 text-emerald-700"
                                            : response.result ===
                                                "Không đồng ý"
                                              ? "bg-red-50 text-red-700"
                                              : "bg-amber-50 text-amber-700"
                                        }`}
                                      >
                                        {
                                          response.result
                                        }
                                      </span>

                                    </div>

                                    {response.opinion && (
                                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                        {
                                          response.opinion
                                        }
                                      </p>
                                    )}

                                  </div>

                                ) : (

                                  <div className="text-center">

                                    <p className="font-semibold text-slate-600">
                                      Bạn chưa gửi ý kiến
                                    </p>

                                    <p className="mt-1 text-sm text-slate-400">
                                      Thời hạn gửi ý kiến đã kết thúc.
                                    </p>

                                  </div>

                                )}

                              </div>

                            </div>

                          ) : (

                            /* =================================================
                                FORM TRẢ LỜI
                            ================================================= */

                            <div className="mt-4 rounded-xl border border-emerald-200 bg-white">

                              <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3">

                                <h4 className="text-sm font-bold text-emerald-900">
                                  Ý kiến của đại biểu
                                </h4>

                                <p className="mt-0.5 text-xs text-emerald-700">
                                  {participant.full_name}
                                </p>

                              </div>


                              <form
                                onSubmit={(
                                  event
                                ) =>
                                  saveResponse(
                                    event,
                                    request
                                  )
                                }
                                className="p-4 sm:p-5"
                              >

                                {/* -----------------------------------------
                                    KẾT QUẢ
                                ----------------------------------------- */}

                                <div>

                                  <p className="text-sm font-semibold text-slate-700">

                                    Kết quả trả lời{" "}

                                    <span className="text-red-500">
                                      *
                                    </span>

                                  </p>


                                  <div className="mt-3 grid gap-3 md:grid-cols-3">

                                    {/* ĐỒNG Ý */}

                                    <label
                                      className={`cursor-pointer rounded-xl border p-4 transition ${
                                        selectedResult ===
                                        "Đồng ý"
                                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                                          : "border-slate-200 bg-white hover:border-emerald-300"
                                      }`}
                                    >

                                      <div className="flex items-center gap-3">

                                        <input
                                          type="radio"
                                          name={`result-${request.id}`}
                                          value="Đồng ý"
                                          checked={
                                            selectedResult ===
                                            "Đồng ý"
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            setSelectedResult(
                                              event
                                                .target
                                                .value
                                            )
                                          }
                                          className="h-4 w-4 cursor-pointer accent-emerald-600"
                                        />

                                        <div>

                                          <p className="font-semibold text-emerald-700">
                                            Đồng ý
                                          </p>

                                          <p className="mt-0.5 text-xs text-slate-500">
                                            Thống nhất với nội dung xin ý kiến
                                          </p>

                                        </div>

                                      </div>

                                    </label>


                                    {/* KHÔNG ĐỒNG Ý */}

                                    <label
                                      className={`cursor-pointer rounded-xl border p-4 transition ${
                                        selectedResult ===
                                        "Không đồng ý"
                                          ? "border-red-400 bg-red-50 ring-2 ring-red-100"
                                          : "border-slate-200 bg-white hover:border-red-300"
                                      }`}
                                    >

                                      <div className="flex items-center gap-3">

                                        <input
                                          type="radio"
                                          name={`result-${request.id}`}
                                          value="Không đồng ý"
                                          checked={
                                            selectedResult ===
                                            "Không đồng ý"
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            setSelectedResult(
                                              event
                                                .target
                                                .value
                                            )
                                          }
                                          className="h-4 w-4 cursor-pointer accent-red-600"
                                        />

                                        <div>

                                          <p className="font-semibold text-red-700">
                                            Không đồng ý
                                          </p>

                                          <p className="mt-0.5 text-xs text-slate-500">
                                            Không thống nhất với nội dung
                                          </p>

                                        </div>

                                      </div>

                                    </label>


                                    {/* Ý KIẾN KHÁC */}

                                    <label
                                      className={`cursor-pointer rounded-xl border p-4 transition ${
                                        selectedResult ===
                                        "Ý kiến khác"
                                          ? "border-amber-400 bg-amber-50 ring-2 ring-amber-100"
                                          : "border-slate-200 bg-white hover:border-amber-300"
                                      }`}
                                    >

                                      <div className="flex items-center gap-3">

                                        <input
                                          type="radio"
                                          name={`result-${request.id}`}
                                          value="Ý kiến khác"
                                          checked={
                                            selectedResult ===
                                            "Ý kiến khác"
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            setSelectedResult(
                                              event
                                                .target
                                                .value
                                            )
                                          }
                                          className="h-4 w-4 cursor-pointer accent-amber-600"
                                        />

                                        <div>

                                          <p className="font-semibold text-amber-700">
                                            Ý kiến khác
                                          </p>

                                          <p className="mt-0.5 text-xs text-slate-500">
                                            Có nội dung đề xuất, bổ sung
                                          </p>

                                        </div>

                                      </div>

                                    </label>

                                  </div>

                                </div>


                                {/* -----------------------------------------
                                    NỘI DUNG Ý KIẾN
                                ----------------------------------------- */}

                                <div className="mt-4">

                                  <label className="text-sm font-semibold text-slate-700">

                                    Nội dung ý kiến{" "}

                                    {selectedResult ===
                                      "Ý kiến khác" && (
                                      <span className="text-red-500">
                                        *
                                      </span>
                                    )}

                                  </label>


                                  <textarea
                                    rows={5}
                                    value={
                                      opinion
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      setOpinion(
                                        event
                                          .target
                                          .value
                                      )
                                    }
                                    placeholder={
                                      selectedResult ===
                                      "Ý kiến khác"
                                        ? "Nhập nội dung ý kiến, đề xuất hoặc nội dung cần chỉnh sửa..."
                                        : "Nếu có ý kiến bổ sung, bạn có thể nhập tại đây..."
                                    }
                                    className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                  />

                                </div>


                                {/* -----------------------------------------
                                    ACTION
                                ----------------------------------------- */}

                                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

                                  <div>

                                    {response ? (

                                      <p className="text-xs text-blue-600">
                                        Bạn đã gửi ý kiến. Có thể cập nhật trước khi phiếu kết thúc.
                                      </p>

                                    ) : (

                                      <p className="text-xs text-slate-400">
                                        Vui lòng gửi ý kiến trước thời hạn.
                                      </p>

                                    )}

                                  </div>


                                  <div className="flex gap-2">

                                    <button
                                      type="button"
                                      onClick={
                                        closeRequest
                                      }
                                      className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                      Thu gọn
                                    </button>


                                    <button
                                      type="submit"
                                      disabled={
                                        saving
                                      }
                                      className="cursor-pointer rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {saving
                                        ? "Đang lưu..."
                                        : response
                                          ? "Cập nhật ý kiến"
                                          : "Gửi ý kiến"}
                                    </button>

                                  </div>

                                </div>

                              </form>

                            </div>

                          )}

                        </div>

                      )}

                    </section>
                  );
                }
              )}

            </div>


            {/* =================================================
                PAGINATION
            ================================================= */}

            {totalPages > 1 && (

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">

                {/* TRANG TRƯỚC */}

                <button
                  type="button"
                  onClick={() =>
                    goToPage(
                      currentPage - 1
                    )
                  }
                  disabled={
                    currentPage === 1
                  }
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Trước
                </button>


                {/* SỐ TRANG */}

                {pageNumbers.map(
                  (page) => (

                    <button
                      key={page}
                      type="button"
                      onClick={() =>
                        goToPage(
                          page
                        )
                      }
                      className={`min-w-10 cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-bold shadow-sm transition ${
                        currentPage ===
                        page
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                    >
                      {page}
                    </button>

                  )
                )}


                {/* TRANG SAU */}

                <button
                  type="button"
                  onClick={() =>
                    goToPage(
                      currentPage + 1
                    )
                  }
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau →
                </button>

              </div>

            )}


            {/* =================================================
                FOOTER PAGINATION
            ================================================= */}

            <div className="mt-3 text-center text-xs text-slate-400">

              Trang{" "}
              <span className="font-semibold text-slate-600">
                {currentPage}
              </span>{" "}
              /{" "}
              <span className="font-semibold text-slate-600">
                {totalPages}
              </span>

              {" • "}

              Tổng{" "}
              <span className="font-semibold text-emerald-700">
                {myRequests.length}
              </span>{" "}
              nội dung xin ý kiến

            </div>

          </>

        )}

      </div>

    </main>
  );
}

