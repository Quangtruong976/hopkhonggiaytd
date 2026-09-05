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
   CONSTANT
========================================================= */

const ITEMS_PER_PAGE = 5;

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

export default function XinYKienPage() {
  const [requests, setRequests] = useState<
    OpinionRequest[]
  >([]);

  const [participants, setParticipants] = useState<
    OpinionParticipant[]
  >([]);

  const [responses, setResponses] = useState<
    OpinionResponse[]
  >([]);

  const [documents, setDocuments] = useState<
    OpinionDocument[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [currentUserName, setCurrentUserName] =
    useState("Quản trị viên");

  /* =======================================================
     SEARCH / FILTER / PAGINATION
  ======================================================= */

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("Tất cả");

  const [currentPage, setCurrentPage] = useState(1);

  /* =======================================================
     EXPAND
  ======================================================= */

  const [expandedId, setExpandedId] =
    useState<number | null>(null);

  /* =======================================================
     EDIT
  ======================================================= */

  const [editingRequestId, setEditingRequestId] =
    useState<number | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  /* =======================================================
     LOAD CURRENT USER
  ======================================================= */

  async function loadCurrentUserName() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (data?.full_name) {
      setCurrentUserName(data.full_name);
    }
  }

  /* =======================================================
     LOAD DATA
  ======================================================= */

  async function loadData() {
    setLoading(true);
    setError("");
    setMessage("");

    const [
      requestResult,
      participantResult,
      responseResult,
      documentResult,
    ] = await Promise.all([
      supabase
        .from("opinion_requests")
        .select(
          `
            id,
            title,
            content,
            deadline,
            status,
            created_at
          `
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("opinion_participants")
        .select(
          `
            id,
            opinion_request_id,
            full_name,
            position,
            organization
          `
        )
        .order("id", {
          ascending: true,
        }),

      supabase
        .from("opinion_responses")
        .select(
          `
            id,
            opinion_request_id,
            participant_id,
            result,
            opinion,
            responded_at
          `
        )
        .order("responded_at", {
          ascending: true,
        }),

      supabase
        .from("opinion_documents")
        .select(
          `
            id,
            opinion_request_id,
            file_name,
            file_path,
            created_at
          `
        )
        .order("created_at", {
          ascending: true,
        }),
    ]);

    if (requestResult.error) {
      console.error(requestResult.error);
      setError(
        `Không thể tải danh sách phiếu: ${requestResult.error.message}`
      );
      setLoading(false);
      return;
    }

    if (participantResult.error) {
      console.error(participantResult.error);
      setError(
        `Không thể tải danh sách đại biểu: ${participantResult.error.message}`
      );
      setLoading(false);
      return;
    }

    if (responseResult.error) {
      console.error(responseResult.error);
      setError(
        `Không thể tải kết quả trả lời: ${responseResult.error.message}`
      );
      setLoading(false);
      return;
    }

    if (documentResult.error) {
      console.error(documentResult.error);
      setError(
        `Không thể tải tài liệu: ${documentResult.error.message}`
      );
      setLoading(false);
      return;
    }

    setRequests(
      (requestResult.data || []) as OpinionRequest[]
    );

    setParticipants(
      (participantResult.data ||
        []) as OpinionParticipant[]
    );

    setResponses(
      (responseResult.data ||
        []) as OpinionResponse[]
    );

    setDocuments(
      (documentResult.data ||
        []) as OpinionDocument[]
    );

    setLoading(false);
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadData();
    loadCurrentUserName();
  }, []);

  /* =======================================================
     STATUS OPTIONS
  ======================================================= */

  const statusOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        requests
          .map((request) => request.status)
          .filter(Boolean)
      )
    );

    return ["Tất cả", ...values];
  }, [requests]);

  /* =======================================================
     FILTERED REQUESTS
  ======================================================= */

  const filteredRequests = useMemo(() => {
    const keyword = searchTerm
      .trim()
      .toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !keyword ||
        request.title
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "Tất cả" ||
        request.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    requests,
    searchTerm,
    statusFilter,
  ]);

  /* =======================================================
     TOTAL PAGES
  ======================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredRequests.length /
        ITEMS_PER_PAGE
    )
  );

  /* =======================================================
     RESET PAGINATION WHEN FILTER CHANGES
  ======================================================= */

  useEffect(() => {
    setCurrentPage(1);
    setExpandedId(null);
    setEditingRequestId(null);
  }, [
    searchTerm,
    statusFilter,
  ]);

  /* =======================================================
     KEEP CURRENT PAGE VALID
  ======================================================= */

  useEffect(() => {
    setCurrentPage((page) =>
      Math.min(page, totalPages)
    );
  }, [totalPages]);

  /* =======================================================
     PAGINATED REQUESTS
  ======================================================= */

  const paginatedRequests = useMemo(() => {
    const start =
      (currentPage - 1) *
      ITEMS_PER_PAGE;

    return filteredRequests.slice(
      start,
      start + ITEMS_PER_PAGE
    );
  }, [
    filteredRequests,
    currentPage,
  ]);

  /* =======================================================
     PAGINATION RANGE
  ======================================================= */

  const paginationStart =
    filteredRequests.length === 0
      ? 0
      : (currentPage - 1) *
          ITEMS_PER_PAGE +
        1;

  const paginationEnd =
    Math.min(
      currentPage *
        ITEMS_PER_PAGE,
      filteredRequests.length
    );

  /* =======================================================
     OPEN DOCUMENT
  ======================================================= */

  async function openDocument(
    document: OpinionDocument
  ) {
    setError("");

    const { data, error } =
      await supabase.storage
        .from("opinion-documents")
        .createSignedUrl(
          document.file_path,
          60 * 10
        );

    if (error || !data?.signedUrl) {
      console.error(error);

      setError(
        `Không thể mở tài liệu: ${
          error?.message ||
          "Không tạo được liên kết."
        }`
      );

      return;
    }

    window.open(
      data.signedUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  /* =======================================================
     START EDIT
  ======================================================= */

  function startEditRequest(
    request: OpinionRequest
  ) {
    if (
      request.status === "Đã kết thúc"
    ) {
      return;
    }

    setExpandedId(request.id);
    setEditingRequestId(request.id);

    setEditTitle(request.title);
    setEditContent(request.content);

    setEditDeadline(
      request.deadline
        ? request.deadline.slice(0, 16)
        : ""
    );

    setError("");
    setMessage("");
  }

  /* =======================================================
     CANCEL EDIT
  ======================================================= */

  function cancelEditRequest() {
    setEditingRequestId(null);
    setEditTitle("");
    setEditContent("");
    setEditDeadline("");
  }

  /* =======================================================
     SAVE EDIT
  ======================================================= */

  async function saveEditRequest(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!editingRequestId) {
      return;
    }

    const title =
      editTitle.trim();

    const content =
      editContent.trim();

    if (!title) {
      setError(
        "Vui lòng nhập nội dung xin ý kiến."
      );
      return;
    }

    if (!content) {
      setError(
        "Vui lòng nhập nội dung chi tiết."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const {
      data: currentRequest,
      error: currentError,
    } = await supabase
      .from("opinion_requests")
      .select("status")
      .eq("id", editingRequestId)
      .maybeSingle();

    if (currentError) {
      setError(
        `Không thể kiểm tra phiếu: ${currentError.message}`
      );
      setSaving(false);
      return;
    }

    if (
      currentRequest?.status ===
      "Đã kết thúc"
    ) {
      setError(
        "Phiếu đã kết thúc, không thể chỉnh sửa."
      );
      setSaving(false);
      cancelEditRequest();
      return;
    }

    const deadlineValue =
      editDeadline.trim()
        ? new Date(
            editDeadline
          ).toISOString()
        : null;

    const { error } =
      await supabase
        .from("opinion_requests")
        .update({
          title,
          content,
          deadline: deadlineValue,
        })
        .eq("id", editingRequestId);

    if (error) {
      console.error(error);

      setError(
        `Không thể cập nhật phiếu: ${error.message}`
      );

      setSaving(false);
      return;
    }

    setMessage(
      "Đã cập nhật phiếu xin ý kiến."
    );

    cancelEditRequest();

    await loadData();

    setSaving(false);
  }

  /* =======================================================
     DELETE REQUEST
  ======================================================= */

  async function deleteRequest(
    request: OpinionRequest
  ) {
    const confirmed =
      window.confirm(
        `Bạn có chắc chắn muốn xóa phiếu "${request.title}" không?`
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    /* -----------------------------------------------------
       Lấy tài liệu thuộc phiếu
    ----------------------------------------------------- */

    const {
      data: requestDocuments,
      error: documentLoadError,
    } = await supabase
      .from("opinion_documents")
      .select("file_path")
      .eq(
        "opinion_request_id",
        request.id
      );

    if (documentLoadError) {
      console.error(
        documentLoadError
      );

      setError(
        `Không thể xác định tài liệu của phiếu: ${documentLoadError.message}`
      );

      setSaving(false);
      return;
    }

    /* -----------------------------------------------------
       Xóa file trong Storage
    ----------------------------------------------------- */

    const filePaths =
      (requestDocuments || [])
        .map(
          (item) =>
            item.file_path
        )
        .filter(Boolean);

    if (filePaths.length > 0) {
      const {
        error: storageError,
      } = await supabase.storage
        .from("opinion-documents")
        .remove(filePaths);

      if (storageError) {
        console.error(
          storageError
        );

        setError(
          `Không thể xóa tài liệu đính kèm: ${storageError.message}`
        );

        setSaving(false);
        return;
      }
    }

    /* -----------------------------------------------------
       Xóa phiếu
    ----------------------------------------------------- */

    const { error } =
      await supabase
        .from("opinion_requests")
        .delete()
        .eq("id", request.id);

    if (error) {
      console.error(error);

      setError(
        `Không thể xóa phiếu: ${error.message}`
      );

      setSaving(false);
      return;
    }

    if (
      expandedId === request.id
    ) {
      setExpandedId(null);
    }

    if (
      editingRequestId ===
      request.id
    ) {
      cancelEditRequest();
    }

    setMessage(
      "Đã xóa phiếu xin ý kiến."
    );

    await loadData();

    setSaving(false);
  }

  /* =======================================================
     END REQUEST
  ======================================================= */

  async function endRequest(
    request: OpinionRequest
  ) {
    if (
      request.status ===
      "Đã kết thúc"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Bạn có chắc chắn muốn kết thúc phiếu "${request.title}" không?`
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error } =
      await supabase
        .from("opinion_requests")
        .update({
          status: "Đã kết thúc",
        })
        .eq("id", request.id);

    if (error) {
      console.error(error);

      setError(
        `Không thể kết thúc phiếu: ${error.message}`
      );

      setSaving(false);
      return;
    }

    if (
      editingRequestId ===
      request.id
    ) {
      cancelEditRequest();
    }

    setMessage(
      "Đã kết thúc phiếu xin ý kiến."
    );

    await loadData();

    setSaving(false);
  }

  /* =======================================================
     HELPERS
  ======================================================= */

  function getParticipants(
    requestId: number
  ) {
    return participants.filter(
      (participant) =>
        participant.opinion_request_id ===
        requestId
    );
  }

  function getResponses(
    requestId: number
  ) {
    return responses.filter(
      (response) =>
        response.opinion_request_id ===
        requestId
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

  function getResponse(
    requestId: number,
    participantId: number
  ) {
    return responses.find(
      (response) =>
        response.opinion_request_id ===
          requestId &&
        response.participant_id ===
          participantId
    );
  }

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "Chưa xác định";
    }

    return new Date(
      `${date.slice(0, 10)}T00:00:00`
    ).toLocaleDateString(
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  function formatDateTime(
    value: string | null
  ) {
    if (!value) {
      return "Chưa xác định";
    }

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

  function isDeadlinePassed(
    deadline: string | null
  ) {
    if (!deadline) {
      return false;
    }

    return (
      new Date(deadline).getTime() <
      Date.now()
    );
  }

  function getStatusStyle(
    status: string
  ) {
    if (
      status === "Đang lấy ý kiến"
    ) {
      return "bg-amber-50 text-amber-700";
    }

    if (
      status === "Đã kết thúc"
    ) {
      return "bg-slate-100 text-slate-600";
    }

    return "bg-emerald-50 text-emerald-700";
  }

  /* =======================================================
     STATISTICS
  ======================================================= */

  const requestStatistics =
    useMemo(() => {
      const result: Record<
        number,
        {
          total: number;
          responded: number;
          agree: number;
          disagree: number;
          other: number;
        }
      > = {};

      requests.forEach(
        (request) => {
          const requestParticipants =
            getParticipants(
              request.id
            );

          const requestResponses =
            getResponses(
              request.id
            );

          let agree = 0;
          let disagree = 0;
          let other = 0;

          requestResponses.forEach(
            (response) => {
              if (
                response.result ===
                "Đồng ý"
              ) {
                agree++;
              } else if (
                response.result ===
                "Không đồng ý"
              ) {
                disagree++;
              } else {
                other++;
              }
            }
          );

          result[request.id] = {
            total:
              requestParticipants.length,
            responded:
              requestResponses.length,
            agree,
            disagree,
            other,
          };
        }
      );

      return result;
    }, [
      requests,
      participants,
      responses,
    ]);

  function percentage(
    value: number,
    total: number
  ) {
    if (total === 0) {
      return "0%";
    }

    return `${Math.round(
      (value / total) * 100
    )}%`;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ===================================================
          HEADER
      =================================================== */}

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



      {/* ===================================================
          CONTENT
      =================================================== */}

      <div className="mx-auto max-w-7xl px-5 py-6">

        {/* =================================================
            TITLE
        ================================================= */}

        <div className="mb-5 flex items-center justify-between gap-4">

          <div>

          <h2 className="text-lg font-bold text-emerald-900">
          
              💬 Phiếu xin ý kiến
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Quản lý các phiếu xin ý kiến và kết quả phản hồi của đại biểu.
            </p>

          </div>

          <Link
            href="/quan-tri/dieu-hanh/xin-y-kien/tao-moi"
            className="cursor-pointer shrink-0 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            + Tạo phiếu
          </Link>

        </div>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}


        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}


        {/* =================================================
            MAIN LIST
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">

          {/* ===============================================
              SECTION HEADER + SEARCH
          =============================================== */}

          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">

            <div className="shrink-0">

              <h3 className="text-base font-bold text-slate-800">
                Danh sách phiếu
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                Quản lý, chỉnh sửa và theo dõi kết quả xin ý kiến.
              </p>

            </div>

            {/* SEARCH / FILTER */}

            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">

              <div className="relative w-full sm:w-64">

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder="Tìm theo tên phiếu..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchTerm("")
                    }
                    className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    ×
                  </button>
                )}

              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500"
              >
                {statusOptions.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ↻ Làm mới
              </button>

            </div>

          </div>


          {/* ===============================================
              TABLE
          =============================================== */}

          {loading ? (

            <div className="p-12 text-center text-sm text-slate-500">
              Đang tải danh sách phiếu...
            </div>

          ) : filteredRequests.length === 0 ? (

            <div className="p-12 text-center">

              <p className="font-semibold text-slate-700">
                {requests.length === 0
                  ? "Chưa có phiếu xin ý kiến"
                  : "Không tìm thấy phiếu phù hợp"}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {requests.length === 0
                  ? "Chưa có dữ liệu phiếu xin ý kiến."
                  : "Hãy thay đổi từ khóa tìm kiếm hoặc trạng thái lọc."}
              </p>

              {requests.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter(
                      "Tất cả"
                    );
                  }}
                  className="cursor-pointer mt-5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-normal text-slate-700 transition hover:bg-slate-50"
                >
                  Xóa bộ lọc
                </button>
              )}

            </div>

          ) : (

            <>

              <div className="overflow-x-auto">

                <table className="w-full table-fixed border-collapse text-sm">

                  <colgroup>
                    <col className="w-[4%]" />
                    <col className="w-[25%]" />
                    <col className="w-[11%]" />
                    <col className="w-[11%]" />
                    <col className="w-[8%]" />
                    <col className="w-[9%]" />
                    <col className="w-[8%]" />
                    <col className="w-[7%]" />
                    <col className="w-[17%]" />
                  </colgroup>

                  <thead>

                    <tr className="bg-white text-xs font-semibold text-slate-600">

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        STT
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-left">
                        Nội dung xin ý kiến
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        Hạn ý kiến
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        Trạng thái
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        Đại biểu
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        Đã trả lời
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        Đồng ý
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        Tỷ lệ
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        Thao tác
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {paginatedRequests.map(
                      (request, index) => (
                        <RequestRows
                          key={request.id}
                          request={request}
                          index={
                            (currentPage - 1) *
                              ITEMS_PER_PAGE +
                            index
                          }
                          expandedId={
                            expandedId
                          }
                          setExpandedId={
                            setExpandedId
                          }
                          editingRequestId={
                            editingRequestId
                          }
                          editTitle={
                            editTitle
                          }
                          editContent={
                            editContent
                          }
                          editDeadline={
                            editDeadline
                          }
                          setEditTitle={
                            setEditTitle
                          }
                          setEditContent={
                            setEditContent
                          }
                          setEditDeadline={
                            setEditDeadline
                          }
                          saving={saving}
                          startEditRequest={
                            startEditRequest
                          }
                          cancelEditRequest={
                            cancelEditRequest
                          }
                          saveEditRequest={
                            saveEditRequest
                          }
                          deleteRequest={
                            deleteRequest
                          }
                          endRequest={
                            endRequest
                          }
                          getParticipants={
                            getParticipants
                          }
                          getDocuments={
                            getDocuments
                          }
                          getResponse={
                            getResponse
                          }
                          requestStatistics={
                            requestStatistics
                          }
                          percentage={
                            percentage
                          }
                          formatDate={
                            formatDate
                          }
                          formatDateTime={
                            formatDateTime
                          }
                          isDeadlinePassed={
                            isDeadlinePassed
                          }
                          getStatusStyle={
                            getStatusStyle
                          }
                          openDocument={
                            openDocument
                          }
                        />
                      )
                    )}

                  </tbody>

                </table>

              </div>


              {/* =============================================
                  PAGINATION
              ============================================= */}

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-xs text-slate-500">
                  Hiển thị{" "}
                  <span className="font-semibold text-slate-700">
                    {paginationStart}
                  </span>
                  –
                  <span className="font-semibold text-slate-700">
                    {paginationEnd}
                  </span>{" "}
                  /{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredRequests.length}
                  </span>{" "}
                  phiếu
                </p>


                <div className="flex items-center justify-end gap-1">

                  {/* TRANG TRƯỚC */}

                  <button
                    type="button"
                    disabled={
                      currentPage === 1
                    }
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.max(
                            1,
                            page - 1
                          )
                      )
                    }
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-normal text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ‹ Trước
                  </button>


                  {/* SỐ TRANG */}

                  {Array.from(
                    {
                      length: totalPages,
                    },
                    (_, index) =>
                      index + 1
                  ).map((page) => (

                    <button
                      key={page}
                      type="button"
                      onClick={() =>
                        setCurrentPage(
                          page
                        )
                      }
                      className={`cursor-pointer min-w-8 rounded-lg border px-2.5 py-1.5 text-xs font-normal transition ${
                        currentPage ===
                        page
                          ? "border-emerald-600 bg-emerald-700 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>

                  ))}


                  {/* TRANG SAU */}

                  <button
                    type="button"
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.min(
                            totalPages,
                            page + 1
                          )
                      )
                    }
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-normal text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau ›
                  </button>

                </div>

              </div>

            </>

          )}

        </section>

      </div>

    </main>
  );
}


/* =========================================================
   REQUEST ROWS
========================================================= */

function RequestRows({
  request,
  index,
  expandedId,
  setExpandedId,
  editingRequestId,
  editTitle,
  editContent,
  editDeadline,
  setEditTitle,
  setEditContent,
  setEditDeadline,
  saving,
  startEditRequest,
  cancelEditRequest,
  saveEditRequest,
  deleteRequest,
  endRequest,
  getParticipants,
  getDocuments,
  getResponse,
  requestStatistics,
  percentage,
  formatDate,
  formatDateTime,
  isDeadlinePassed,
  getStatusStyle,
  openDocument,
}: {
  request: OpinionRequest;
  index: number;
  expandedId: number | null;
  setExpandedId: (
    id: number | null
  ) => void;
  editingRequestId: number | null;
  editTitle: string;
  editContent: string;
  editDeadline: string;
  setEditTitle: (
    value: string
  ) => void;
  setEditContent: (
    value: string
  ) => void;
  setEditDeadline: (
    value: string
  ) => void;
  saving: boolean;
  startEditRequest: (
    request: OpinionRequest
  ) => void;
  cancelEditRequest: () => void;
  saveEditRequest: (
    event: FormEvent
  ) => void;
  deleteRequest: (
    request: OpinionRequest
  ) => void;
  endRequest: (
    request: OpinionRequest
  ) => void;
  getParticipants: (
    requestId: number
  ) => OpinionParticipant[];
  getDocuments: (
    requestId: number
  ) => OpinionDocument[];
  getResponse: (
    requestId: number,
    participantId: number
  ) => OpinionResponse | undefined;
  requestStatistics: Record<
    number,
    {
      total: number;
      responded: number;
      agree: number;
      disagree: number;
      other: number;
    }
  >;
  percentage: (
    value: number,
    total: number
  ) => string;
  formatDate: (
    date: string | null
  ) => string;
  formatDateTime: (
    value: string | null
  ) => string;
  isDeadlinePassed: (
    deadline: string | null
  ) => boolean;
  getStatusStyle: (
    status: string
  ) => string;
  openDocument: (
    document: OpinionDocument
  ) => void;
}) {
  const isExpanded =
    expandedId === request.id;

  const stats =
    requestStatistics[
      request.id
    ] || {
      total: 0,
      responded: 0,
      agree: 0,
      disagree: 0,
      other: 0,
    };

  const deadlinePassed =
    isDeadlinePassed(
      request.deadline
    );

  return (
    <>
      {/* =====================================================
          MAIN ROW
      ===================================================== */}

      <tr
        className={`cursor-pointer transition ${
          isExpanded
            ? "bg-amber-50"
            : "hover:bg-emerald-50"
        }`}
        onClick={() =>
          setExpandedId(
            isExpanded
              ? null
              : request.id
          )
        }
      >

        {/* STT */}

        <td className="border-b border-slate-200 px-2 py-3 text-center text-xs text-slate-500">
          {index + 1}
        </td>


        {/* NỘI DUNG */}

        <td className="border-b border-slate-200 px-2 py-3 align-top">

          <div className="min-w-0">

            <p className="truncate text-sm font-medium text-slate-800">
              {request.title}
            </p>

            <p className="mt-1 truncate text-xs text-slate-400">
              {formatDateTime(
                request.created_at
              )}
            </p>

          </div>

        </td>


        {/* HẠN */}

        <td className="border-b border-slate-200 px-2 py-3 text-center align-top">

          <span
            className={
              deadlinePassed &&
              request.status !==
                "Đã kết thúc"
                ? "text-xs text-red-600"
                : "text-xs text-slate-600"
            }
          >
            {formatDate(
              request.deadline
            )}
          </span>

        </td>


        {/* TRẠNG THÁI */}

        <td className="border-b border-slate-200 px-2 py-3 text-center align-top">

          <span
            className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStatusStyle(
              request.status
            )}`}
          >
            {request.status ||
              "Chưa xác định"}
          </span>

        </td>


        {/* ĐẠI BIỂU */}

        <td className="border-b border-slate-200 px-2 py-3 text-center text-xs text-slate-600">
          {stats.total}
        </td>


        {/* ĐÃ TRẢ LỜI */}

        <td className="border-b border-slate-200 px-2 py-3 text-center text-xs text-slate-600">
          {stats.responded}
        </td>


        {/* ĐỒNG Ý */}

        <td className="border-b border-slate-200 px-2 py-3 text-center text-xs text-emerald-700">
          {stats.agree}
        </td>


        {/* TỶ LỆ */}

        <td className="border-b border-slate-200 px-2 py-3 text-center text-xs text-slate-600">
          {percentage(
            stats.responded,
            stats.total
          )}
        </td>


        {/* THAO TÁC */}

        <td
          className="border-b border-slate-200 px-2 py-3"
          onClick={(event) =>
            event.stopPropagation()
          }
        >

          <div className="flex items-center justify-center gap-1.5">

            {/* SỬA */}

            {request.status !==
              "Đã kết thúc" && (
              <button
                type="button"
                onClick={() =>
                  startEditRequest(
                    request
                  )
                }
                disabled={saving}
                className="cursor-pointer rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-normal text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                title="Sửa phiếu"
              >
                ✎ Sửa
              </button>
            )}


            {/* XÓA */}

            <button
              type="button"
              onClick={() =>
                deleteRequest(
                  request
                )
              }
              disabled={saving}
              className="cursor-pointer rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-normal text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              title="Xóa phiếu"
            >
              🗑 Xóa
            </button>

          </div>

        </td>

      </tr>


      {/* =====================================================
          DETAIL
      ===================================================== */}

      {isExpanded && (

        <tr>

          <td
            colSpan={9}
            className="border-b border-slate-200 bg-amber-50 px-5 py-5"
          >

            {/* ===============================================
                EDIT FORM
            =============================================== */}

            {editingRequestId ===
            request.id ? (

              <form
                onSubmit={
                  saveEditRequest
                }
                className="space-y-4"
              >

                <div>

                  <h4 className="text-sm font-semibold text-slate-800">
                    Chỉnh sửa phiếu xin ý kiến
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    Có thể chỉnh sửa phiếu khi phiếu chưa kết thúc.
                  </p>

                </div>


                <div>

                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Nội dung xin ý kiến
                  </label>

                  <input
                    value={editTitle}
                    onChange={(event) =>
                      setEditTitle(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                </div>


                <div>

                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Nội dung chi tiết
                  </label>

                  <textarea
                    value={editContent}
                    onChange={(event) =>
                      setEditContent(
                        event.target.value
                      )
                    }
                    rows={5}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                </div>


                <div className="max-w-xs">

                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Hạn ý kiến
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      editDeadline
                    }
                    onChange={(event) =>
                      setEditDeadline(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                  />

                </div>


                <div className="flex items-center gap-2">

                  <button
                    type="submit"
                    disabled={saving}
                    className="cursor-pointer rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-normal text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Đang lưu..."
                      : "Lưu thay đổi"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      cancelEditRequest
                    }
                    disabled={saving}
                    className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-normal text-slate-700 transition hover:bg-slate-50"
                  >
                    Hủy
                  </button>

                </div>

              </form>

            ) : (

              <div className="space-y-5">

                {/* =========================================
                    NỘI DUNG
                ========================================= */}

                <div>

                  <div className="flex items-start justify-between gap-4">

                    <div className="min-w-0">

                      <h4 className="text-base font-semibold text-slate-800">
                        {request.title}
                      </h4>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {request.content}
                      </p>

                    </div>

                  </div>

                </div>


                {/* =========================================
                    TÀI LIỆU
                ========================================= */}

                {getDocuments(
                  request.id
                ).length > 0 && (

                  <div className="rounded-xl border border-amber-200 bg-white p-4">

                    <h5 className="text-sm font-semibold text-slate-800">
                      Tài liệu đính kèm
                    </h5>

                    <div className="mt-3 space-y-2">

                      {getDocuments(
                        request.id
                      ).map(
                        (document) => (

                          <button
                            key={
                              document.id
                            }
                            type="button"
                            onClick={() =>
                              openDocument(
                                document
                              )
                            }
                            className="cursor-pointer flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-emerald-700 transition hover:bg-emerald-50"
                          >
                            📎{" "}
                            {document.file_name}
                          </button>

                        )
                      )}

                    </div>

                  </div>

                )}


                {/* =========================================
                    THỐNG KÊ
                ========================================= */}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

                  <StatBox
                    title="Đại biểu"
                    value={
                      stats.total
                    }
                  />

                  <StatBox
                    title="Đã trả lời"
                    value={
                      stats.responded
                    }
                  />

                  <StatBox
                    title="Đồng ý"
                    value={
                      stats.agree
                    }
                  />

                  <StatBox
                    title="Không đồng ý"
                    value={
                      stats.disagree
                    }
                  />

                  <StatBox
                    title="Ý kiến khác"
                    value={
                      stats.other
                    }
                  />

                </div>


                {/* =========================================
                    ĐẠI BIỂU
                ========================================= */}

                <div className="rounded-xl border border-amber-200 bg-white">

                  <div className="border-b border-slate-200 px-4 py-3">

                    <h5 className="text-sm font-semibold text-slate-800">
                      Danh sách đại biểu
                    </h5>

                  </div>

                  {getParticipants(
                    request.id
                  ).length === 0 ? (

                    <div className="px-4 py-6 text-center text-xs text-slate-400">
                      Chưa có đại biểu.
                    </div>

                  ) : (

                    <div className="overflow-x-auto">

                      <table className="w-full text-xs">

                        <thead>

                          <tr className="bg-slate-50 text-slate-500">

                            <th className="px-3 py-2 text-left">
                              Đại biểu
                            </th>

                            <th className="px-3 py-2 text-left">
                              Chức vụ
                            </th>

                            <th className="px-3 py-2 text-left">
                              Đơn vị
                            </th>

                            <th className="px-3 py-2 text-center">
                              Kết quả
                            </th>

                            <th className="px-3 py-2 text-left">
                              Ý kiến
                            </th>

                            <th className="px-3 py-2 text-left">
                              Thời gian
                            </th>

                          </tr>

                        </thead>

                        <tbody className="divide-y divide-slate-100">

                          {getParticipants(
                            request.id
                          ).map(
                            (
                              participant
                            ) => {
                              const response =
                                getResponse(
                                  request.id,
                                  participant.id
                                );

                              return (
                                <tr
                                  key={
                                    participant.id
                                  }
                                  className="hover:bg-slate-50"
                                >

                                  <td className="px-3 py-2 font-medium text-slate-700">
                                    {
                                      participant.full_name
                                    }
                                  </td>

                                  <td className="px-3 py-2 text-slate-500">
                                    {
                                      participant.position ||
                                      "—"
                                    }
                                  </td>

                                  <td className="px-3 py-2 text-slate-500">
                                    {
                                      participant.organization ||
                                      "—"
                                    }
                                  </td>

                                  <td className="px-3 py-2 text-center">

                                    {response ? (
                                      <span
                                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
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
                                    ) : (
                                      <span className="text-slate-400">
                                        Chưa trả lời
                                      </span>
                                    )}

                                  </td>

                                  <td className="max-w-xs px-3 py-2 text-slate-500">

                                    {response?.opinion ||
                                      "—"}

                                  </td>

                                  <td className="px-3 py-2 text-slate-400">

                                    {formatDateTime(
                                      response?.responded_at ||
                                        null
                                    )}

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


                {/* =========================================
                    ADMIN ACTIONS
                ========================================= */}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200 pt-4">

                  <div className="text-xs text-slate-400">

                    Tạo lúc:{" "}
                    {formatDateTime(
                      request.created_at
                    )}

                    {request.deadline && (
                      <>
                        {" "}
                        · Hạn:{" "}
                        {formatDateTime(
                          request.deadline
                        )}
                      </>
                    )}

                  </div>


                  <div className="flex items-center gap-2">

                    {request.status !==
                      "Đã kết thúc" && (

                      <button
                        type="button"
                        onClick={() =>
                          endRequest(
                            request
                          )
                        }
                        disabled={saving}
                        className="cursor-pointer rounded-xl bg-emerald-700 px-4 py-2 text-sm font-normal text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ✓ Kết thúc phiếu
                      </button>

                    )}


                    <button
                      type="button"
                      onClick={() =>
                        deleteRequest(
                          request
                        )
                      }
                      disabled={saving}
                      className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-sm font-normal text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      🗑 Xóa phiếu
                    </button>

                  </div>

                </div>


                {/* =========================================
                    COLLAPSE
                ========================================= */}

                <div className="flex justify-end pt-1">

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(
                        null
                      )
                    }
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-normal text-slate-600 transition hover:bg-slate-50"
                  >
                    Thu gọn ↑
                  </button>

                </div>

              </div>

            )}

          </td>

        </tr>

      )}

    </>
  );
}


/* =========================================================
   STAT BOX
========================================================= */

function StatBox({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}

