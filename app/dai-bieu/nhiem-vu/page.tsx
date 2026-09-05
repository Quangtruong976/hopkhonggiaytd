"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import Link from "next/link";
/* =========================================================
   TYPES
========================================================= */

type Task = {
  id: number;
  meeting_id: number | null;

  title: string;
  description: string | null;

  assignee: string | null;

  // Đơn vị tham mưu
  department: string | null;

  priority: string | null;
  due_date: string | null;

  status: string | null;

  completed_at: string | null;
  completed_note: string | null;

  completion_file_path: string | null;
  completion_file_name: string | null;

  created_at: string;
};

/* =========================================================
   PAGE
========================================================= */

export default function DaiBieuNhiemVuPage() {
  /* =======================================================
     STATE
  ======================================================= */

  const [tasks, setTasks] = useState<Task[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [currentUserName, setCurrentUserName] =
  useState("");
  const [processingTaskId, setProcessingTaskId] =
    useState<number | null>(null);

  const [expandedTaskId, setExpandedTaskId] =
    useState<number | null>(null);

  const [completionNotes, setCompletionNotes] =
    useState<Record<number, string>>({});

  const [completionFiles, setCompletionFiles] =
    useState<Record<number, File | null>>({});

  /* =======================================================
     SEARCH + FILTER
  ======================================================= */

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("Tất cả");

  const [priorityFilter, setPriorityFilter] =
    useState("Tất cả");

  /* =======================================================
     PAGINATION
  ======================================================= */

  const [currentPage, setCurrentPage] =
    useState(1);

  const itemsPerPage = 5;

  /* =======================================================
     LOAD TASKS
  ======================================================= */

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      /* -----------------------------------------------------
         LẤY TÀI KHOẢN ĐANG ĐĂNG NHẬP
      ----------------------------------------------------- */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setTasks([]);

        setError(
          "Phiên đăng nhập không hợp lệ."
        );

        return;
      }

      /* -----------------------------------------------------
         CHỈ LẤY NHIỆM VỤ ĐƯỢC GIAO CHO
         ĐẠI BIỂU ĐANG ĐĂNG NHẬP
         
         profiles.id
              ↓
         meeting_tasks.assignee_id
      ----------------------------------------------------- */

      const {
        data,
        error: taskError,
      } = await supabase
        .from("meeting_tasks")
        .select(`
          id,
          meeting_id,
          title,
          description,
          assignee,
          department,
          priority,
          due_date,
          status,
          completed_at,
          completed_note,
          completion_file_path,
          completion_file_name,
          created_at
        `)
        .eq("assignee_id", user.id)
        .order("due_date", {
          ascending: true,
          nullsFirst: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (taskError) {
        throw taskError;
      }

      /*
        Không join meetings.
        Không join participants.
        Không join bảng khác.

        Mỗi record meeting_tasks
        tương ứng đúng một nhiệm vụ.
      */

      const loadedTasks =
        (data || []) as Task[];

      setTasks(loadedTasks);

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            loadedTasks.length /
              itemsPerPage
          )
        );

      setCurrentPage((page) =>
        Math.min(
          page,
          totalPages
        )
      );
    } catch (err) {
      setTasks([]);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách nhiệm vụ."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

 /* =======================================================
   LOAD CURRENT USER NAME
======================================================= */

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
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Không thể tải thông tin đại biểu:",
      profileError
    );

    setCurrentUserName("");
    return;
  }

  setCurrentUserName(
    data?.full_name ||
      user.user_metadata?.full_name ||
      "Đại biểu"
  );
}


/* =======================================================
   INITIAL LOAD
======================================================= */

useEffect(() => {
  loadTasks();
  loadCurrentUserName();
}, []);

  /* =======================================================
     SEARCH + FILTER DATA
  ======================================================= */

  const priorityOptions =
    useMemo(() => {
      const values = Array.from(
        new Set(
          tasks
            .map(
              (task) =>
                task.priority
            )
            .filter(Boolean) as string[]
        )
      );

      return [
        "Tất cả",
        ...values,
      ];
    }, [tasks]);

  const filteredTasks =
    useMemo(() => {
      const keyword =
        searchTerm
          .trim()
          .toLowerCase();

      return tasks.filter(
        (task) => {
          const matchesSearch =
            !keyword ||
            task.title
              .toLowerCase()
              .includes(keyword) ||
            (task.description || "")
              .toLowerCase()
              .includes(keyword) ||
            (task.department || "")
              .toLowerCase()
              .includes(keyword);

          const matchesStatus =
            statusFilter ===
              "Tất cả" ||
            task.status ===
              statusFilter;

          const matchesPriority =
            priorityFilter ===
              "Tất cả" ||
            task.priority ===
              priorityFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPriority
          );
        }
      );
    }, [
      tasks,
      searchTerm,
      statusFilter,
      priorityFilter,
    ]);

  /* =======================================================
     RESET PAGE WHEN FILTER CHANGES
  ======================================================= */

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    priorityFilter,
  ]);

  /* =======================================================
     TOTAL PAGES
  ======================================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredTasks.length /
          itemsPerPage
      )
    );

  /* =======================================================
     KEEP PAGE VALID
  ======================================================= */

  useEffect(() => {
    setCurrentPage((page) =>
      Math.min(
        page,
        totalPages
      )
    );
  }, [totalPages]);

  /* =======================================================
     PAGINATION DATA
  ======================================================= */

  const startIndex =
    (currentPage - 1) *
    itemsPerPage;

  const endIndex =
    Math.min(
      startIndex +
        itemsPerPage,
      filteredTasks.length
    );

  const paginatedTasks =
    filteredTasks.slice(
      startIndex,
      endIndex
    );

  /* =======================================================
     FORMAT DATE
  ======================================================= */

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

  /* =======================================================
     CHECK OVERDUE
  ======================================================= */

  function isOverdue(
    task: Task
  ) {
    if (
      !task.due_date ||
      task.status ===
        "Đã hoàn thành"
    ) {
      return false;
    }

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const dueDate =
      new Date(
        `${task.due_date}T00:00:00`
      );

    return dueDate < today;
  }

  /* =======================================================
     FILE CHANGE
  ======================================================= */

  function handleFileChange(
    taskId: number,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ||
      null;

    if (!file) {
      return;
    }

    /* -----------------------------------------------------
       GIỚI HẠN 20MB
    ----------------------------------------------------- */

    const maxSize =
      20 * 1024 * 1024;

    if (
      file.size >
      maxSize
    ) {
      setError(
        `File "${file.name}" vượt quá dung lượng 20MB.`
      );

      setCompletionFiles(
        (current) => ({
          ...current,
          [taskId]: null,
        })
      );

      event.target.value = "";

      return;
    }

    /* -----------------------------------------------------
       ĐỊNH DẠNG CHO PHÉP
    ----------------------------------------------------- */

    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
    ];

    const fileName =
      file.name.toLowerCase();

    const isAllowed =
      allowedExtensions.some(
        (extension) =>
          fileName.endsWith(
            extension
          )
      );

    if (!isAllowed) {
      setError(
        "Chỉ cho phép file PDF, Word, Excel hoặc PowerPoint."
      );

      setCompletionFiles(
        (current) => ({
          ...current,
          [taskId]: null,
        })
      );

      event.target.value = "";

      return;
    }

    setError("");

    setCompletionFiles(
      (current) => ({
        ...current,
        [taskId]: file,
      })
    );
  }

  /* =======================================================
     START TASK
  ======================================================= */

  async function startTask(
    task: Task
  ) {
    setProcessingTaskId(
      task.id
    );

    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Phiên đăng nhập không hợp lệ."
        );
      }

      /* -----------------------------------------------------
         CHỈ CHÍNH NGƯỜI ĐƯỢC GIAO
         MỚI ĐƯỢC CẬP NHẬT
      ----------------------------------------------------- */

      const {
        error: updateError,
      } = await supabase
        .from("meeting_tasks")
        .update({
          status:
            "Đang thực hiện",
        })
        .eq(
          "id",
          task.id
        )
        .eq(
          "assignee_id",
          user.id
        );

      if (updateError) {
        throw updateError;
      }

      setMessage(
        "Đã chuyển nhiệm vụ sang trạng thái Đang thực hiện."
      );

      await loadTasks();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật nhiệm vụ."
      );
    } finally {
      setProcessingTaskId(
        null
      );
    }
  }

  /* =======================================================
     COMPLETE TASK
  ======================================================= */

  async function completeTask(
    task: Task
  ) {
    const note =
      completionNotes[
        task.id
      ]?.trim() || "";

    const file =
      completionFiles[
        task.id
      ] || null;

    /* -----------------------------------------------------
       BẮT BUỘC NỘI DUNG
    ----------------------------------------------------- */

    if (!note) {
      setError(
        "Vui lòng nhập nội dung hoàn thành nhiệm vụ."
      );

      setExpandedTaskId(
        task.id
      );

      return;
    }

    /* -----------------------------------------------------
       BẮT BUỘC FILE
    ----------------------------------------------------- */

    if (!file) {
      setError(
        "Vui lòng tải lên file minh chứng hoàn thành."
      );

      setExpandedTaskId(
        task.id
      );

      return;
    }

    setProcessingTaskId(
      task.id
    );

    setError("");
    setMessage("");

    let uploadedFilePath:
      | string
      | null = null;

    try {
      /* -----------------------------------------------------
         LẤY USER
      ----------------------------------------------------- */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Phiên đăng nhập không hợp lệ."
        );
      }

      /* -----------------------------------------------------
         TÊN FILE AN TOÀN
      ----------------------------------------------------- */

      const safeName =
        file.name
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "-"
          );

      /* -----------------------------------------------------
         ĐƯỜNG DẪN FILE
      ----------------------------------------------------- */

      const filePath =
        `task/${task.id}/${Date.now()}-${safeName}`;

      /* -----------------------------------------------------
         UPLOAD MINH CHỨNG
      ----------------------------------------------------- */

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from(
            "task-proofs"
          )
          .upload(
            filePath,
            file,
            {
              cacheControl:
                "3600",
              upsert: false,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      uploadedFilePath =
        filePath;

      /* -----------------------------------------------------
         CẬP NHẬT NHIỆM VỤ
      ----------------------------------------------------- */

      const {
        error: updateError,
      } =
        await supabase
          .from(
            "meeting_tasks"
          )
          .update({
            status:
              "Đã hoàn thành",

            completed_at:
              new Date().toISOString(),

            completed_note:
              note,

            completion_file_path:
              filePath,

            completion_file_name:
              file.name,
          })
          .eq(
            "id",
            task.id
          )
          .eq(
            "assignee_id",
            user.id
          );

      if (updateError) {
        /* ---------------------------------------------------
           XÓA FILE NẾU UPDATE THẤT BẠI
        --------------------------------------------------- */

        await supabase.storage
          .from(
            "task-proofs"
          )
          .remove([
            filePath,
          ]);

        uploadedFilePath =
          null;

        throw updateError;
      }

      setMessage(
        "Đã hoàn thành nhiệm vụ và lưu minh chứng."
      );

      /* -----------------------------------------------------
         XÓA FORM
      ----------------------------------------------------- */

      setCompletionNotes(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            task.id
          ];

          return next;
        }
      );

      setCompletionFiles(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            task.id
          ];

          return next;
        }
      );

      setExpandedTaskId(
        null
      );

      await loadTasks();
    } catch (err) {
      if (
        uploadedFilePath
      ) {
        await supabase.storage
          .from(
            "task-proofs"
          )
          .remove([
            uploadedFilePath,
          ]);
      }

      setError(
        err instanceof Error
          ? err.message
          : "Không thể hoàn thành nhiệm vụ."
      );
    } finally {
      setProcessingTaskId(
        null
      );
    }
  }

  /* =======================================================
     OPEN COMPLETION FILE
  ======================================================= */

  async function openCompletionFile(
    filePath: string
  ) {
    setError("");

    try {
      const {
        data,
        error:
          signedUrlError,
      } =
        await supabase.storage
          .from(
            "task-proofs"
          )
          .createSignedUrl(
            filePath,
            60 * 10
          );

      if (signedUrlError) {
        throw signedUrlError;
      }

      if (
        !data?.signedUrl
      ) {
        throw new Error(
          "Không tạo được đường dẫn file."
        );
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể mở file minh chứng."
      );
    }
  }

  /* =======================================================
     STATISTICS
  ======================================================= */

  const total =
    tasks.length;

  const completed =
    tasks.filter(
      (task) =>
        task.status ===
        "Đã hoàn thành"
    ).length;

  const notCompleted =
    total - completed;

  const inProgress =
    tasks.filter(
      (task) =>
        task.status ===
        "Đang thực hiện"
    ).length;

  /* =======================================================
     CHANGE PAGE
  ======================================================= */

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

    setExpandedTaskId(
      null
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

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
  
  
          {/* BÊN PHẢI - TÀI KHOẢN ĐẠI BIỂU */}
  
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
  
  
      <div className="mx-auto max-w-7xl px-5 py-6">

        {/* =================================================
            TITLE
        ================================================= */}

        <div className="mb-5">

        <h1 className="flex items-center gap-2 text-xl font-bold text-emerald-900">
  <span className="text-amber-500">📋</span>
            Nhiệm vụ của tôi
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Danh sách nhiệm vụ được giao cho bạn.
          </p>

        </div>


        {/* =================================================
            THỐNG KÊ
        ================================================= */}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">

            <p className="text-xs font-medium text-slate-600">
              Tổng số nhiệm vụ
            </p>

            <p className="mt-1 text-2xl font-bold text-blue-700">
              {total}
            </p>

          </div>


          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">

            <p className="text-xs font-medium text-slate-600">
              Chưa hoàn thành
            </p>

            <p className="mt-1 text-2xl font-bold text-amber-700">
              {notCompleted}
            </p>

          </div>


          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">

            <p className="text-xs font-medium text-emerald-600">
              Đang thực hiện
            </p>

            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {inProgress}
            </p>

          </div>


          <div className="rounded-xl border border-slate-400 bg-slate-100 px-4 py-3">

            <p className="text-xs font-medium text-slate-600">
              Đã hoàn thành
            </p>

            <p className="mt-1 text-2xl font-bold text-sky-700">
              {completed}
            </p>

          </div>

        </div>


        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}


        {/* =================================================
            LIST SECTION
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* =================================================
              SECTION HEADER
          ================================================= */}

          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

              <div className="shrink-0">

                <h2 className="text-sm font-semibold text-slate-800">
                  Danh sách nhiệm vụ
                </h2>

              </div>


              {/* =================================================
                  SEARCH + FILTER
              ================================================= */}

              <div className="flex flex-1 flex-col gap-2 sm:flex-row xl:max-w-4xl">

                {/* SEARCH */}

                <div className="relative min-w-0 flex-1">

                  <input
                    type="text"
                    value={
                      searchTerm
                    }
                    onChange={(
                      event
                    ) =>
                      setSearchTerm(
                        event.target
                          .value
                      )
                    }
                    placeholder="Tìm theo nhiệm vụ, nội dung, đơn vị tham mưu..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearchTerm(
                          ""
                        )
                      }
                      className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  )}

                </div>


                {/* STATUS */}

                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusFilter(
                      event.target
                        .value
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500"
                >

                  <option>
                    Tất cả trạng thái
                  </option>

                  <option>
                    Chưa thực hiện
                  </option>

                  <option>
                    Đang thực hiện
                  </option>

                  <option>
                    Đã hoàn thành
                  </option>

                </select>


                {/* PRIORITY */}

                <select
                  value={
                    priorityFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setPriorityFilter(
                      event.target
                        .value
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500"
                >

                  <option>
                    Tất cả ưu tiên
                  </option>

                  {priorityOptions
                    .filter(
                      (priority) =>
                        priority !==
                        "Tất cả"
                    )
                    .map(
                      (
                        priority
                      ) => (
                        <option
                          key={
                            priority
                          }
                        >
                          {
                            priority
                          }
                        </option>
                      )
                    )}

                </select>


                {/* REFRESH */}

                <button
                  type="button"
                  onClick={
                    loadTasks
                  }
                  className="cursor-pointer shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  ↻ Làm mới
                </button>

              </div>

            </div>


            {/* RESULT COUNT */}

            <div className="mt-2 text-[11px] text-slate-400">

              Hiển thị{" "}

              <span className="font-semibold text-slate-600">
                {filteredTasks.length}
              </span>

              {" / "}

              <span className="font-semibold text-slate-600">
                {total}
              </span>

              {" nhiệm vụ"}

            </div>

          </div>


          {/* =================================================
              CONTENT
          ================================================= */}

          {loading ? (

            <div className="p-10 text-center text-sm text-slate-500">
              Đang tải danh sách nhiệm vụ...
            </div>

          ) : total === 0 ? (

            <div className="p-12 text-center">

              <p className="font-semibold text-slate-700">
                Bạn hiện không có nhiệm vụ
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Khi được giao nhiệm vụ,
                nhiệm vụ sẽ tự động xuất hiện
                tại đây.
              </p>

            </div>

          ) : filteredTasks.length === 0 ? (

            <div className="p-12 text-center">

              <p className="font-semibold text-slate-700">
                Không tìm thấy nhiệm vụ
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Không có nhiệm vụ phù hợp với
                điều kiện tìm kiếm hoặc bộ lọc.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter(
                    "Tất cả"
                  );
                  setPriorityFilter(
                    "Tất cả"
                  );
                }}
                className="cursor-pointer mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Xóa bộ lọc
              </button>

            </div>

          ) : (

            <>
              {/* =================================================
                  TABLE
              ================================================= */}

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] border-collapse">

                  <thead>

                    <tr className="border-b border-slate-200 bg-slate-50">

                      <th className="w-14 px-3 py-3 text-center text-xs font-semibold text-slate-600">
                        STT
                      </th>

                      <th className="min-w-[300px] px-4 py-3 text-left text-xs font-semibold text-slate-600">
                        Nhiệm vụ
                      </th>

                      <th className="w-44 px-4 py-3 text-left text-xs font-semibold text-slate-600">
                        Đơn vị tham mưu
                      </th>

                      <th className="w-36 px-4 py-3 text-left text-xs font-semibold text-slate-600">
                        Hạn hoàn thành
                      </th>

                      <th className="w-40 px-4 py-3 text-center text-xs font-semibold text-slate-600">
                        Trạng thái
                      </th>

                      <th className="w-52 px-4 py-3 text-center text-xs font-semibold text-slate-600">
                        Thao tác
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {paginatedTasks.map(
                      (
                        task,
                        index
                      ) => {

                        const completed =
                          task.status ===
                          "Đã hoàn thành";

                        const overdue =
                          isOverdue(
                            task
                          );

                        const globalIndex =
                          startIndex +
                          index +
                          1;

                        const expanded =
                          expandedTaskId ===
                          task.id;

                        return (
                          <TaskTableRows
                            key={
                              task.id
                            }
                            task={
                              task
                            }
                            completed={
                              completed
                            }
                            overdue={
                              overdue
                            }
                            globalIndex={
                              globalIndex
                            }
                            expanded={
                              expanded
                            }
                            processingTaskId={
                              processingTaskId
                            }
                            completionNote={
                              completionNotes[
                                task.id
                              ] || ""
                            }
                            completionFile={
                              completionFiles[
                                task.id
                              ] || null
                            }
                            onExpand={() => {
                              setError("");
                              setMessage("");

                              setExpandedTaskId(
                                expanded
                                  ? null
                                  : task.id
                              );
                            }}
                            onStart={() =>
                              startTask(
                                task
                              )
                            }
                            onComplete={() =>
                              completeTask(
                                task
                              )
                            }
                            onNoteChange={(
                              value
                            ) =>
                              setCompletionNotes(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  [task.id]:
                                    value,
                                })
                              )
                            }
                            onFileChange={(
                              event
                            ) =>
                              handleFileChange(
                                task.id,
                                event
                              )
                            }
                            onOpenFile={() =>
                              task.completion_file_path
                                ? openCompletionFile(
                                    task.completion_file_path
                                  )
                                : undefined
                            }
                          />
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>


              {/* =================================================
                  PAGINATION
              ================================================= */}

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-xs text-slate-500">

                  Hiển thị{" "}

                  <span className="font-semibold text-slate-700">
                    {filteredTasks.length === 0
                      ? 0
                      : startIndex + 1}
                  </span>

                  {" – "}

                  <span className="font-semibold text-slate-700">
                    {endIndex}
                  </span>

                  {" / "}

                  <span className="font-semibold text-slate-700">
                    {filteredTasks.length}
                  </span>

                  {" nhiệm vụ"}

                </p>


                <div className="flex items-center gap-1">

                  {/* TRANG TRƯỚC */}

                  <button
                    type="button"
                    onClick={() =>
                      changePage(
                        currentPage -
                          1
                      )
                    }
                    disabled={
                      currentPage ===
                      1
                    }
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ←
                  </button>


                  {/* PAGE NUMBERS */}

                  {Array.from(
                    {
                      length:
                        totalPages,
                    },
                    (
                      _,
                      index
                    ) =>
                      index + 1
                  ).map(
                    (
                      page
                    ) => (
                      <button
                        key={
                          page
                        }
                        type="button"
                        onClick={() =>
                          changePage(
                            page
                          )
                        }
                        className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                          page ===
                          currentPage
                            ? "border-emerald-700 bg-emerald-700 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {
                          page
                        }
                      </button>
                    )
                  )}


                  {/* TRANG SAU */}

                  <button
                    type="button"
                    onClick={() =>
                      changePage(
                        currentPage +
                          1
                      )
                    }
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    →
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
   TABLE ROW COMPONENT
========================================================= */

function TaskTableRows({
  task,
  completed,
  overdue,
  globalIndex,
  expanded,
  processingTaskId,
  completionNote,
  completionFile,
  onExpand,
  onStart,
  onComplete,
  onNoteChange,
  onFileChange,
  onOpenFile,
}: {
  task: Task;

  completed: boolean;
  overdue: boolean;

  globalIndex: number;

  expanded: boolean;

  processingTaskId: number | null;

  completionNote: string;
  completionFile: File | null;

  onExpand: () => void;

  onStart: () => void;

  onComplete: () => void;

  onNoteChange: (
    value: string
  ) => void;

  onFileChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;

  onOpenFile: () => void;
}) {
  const processing =
    processingTaskId ===
    task.id;

  return (
    <>
      {/* =====================================================
          MAIN ROW
      ===================================================== */}

      <tr
        className={`border-b border-slate-100 transition hover:bg-slate-50 ${
          completed
            ? "bg-emerald-50/20"
            : ""
        }`}
      >

        {/* STT */}

        <td className="px-3 py-3 text-center align-top text-xs text-slate-500">
          {globalIndex}
        </td>


        {/* NHIỆM VỤ */}

        <td className="px-4 py-3 align-top">

          <div className="min-w-0">

            <p
              className={`truncate text-sm font-semibold  ${
                completed
                  ? "text-slate-500"
                  : "text-slate-800"
              }`}
              title={
                task.title
              }
            >
              {
                task.title
              }
            </p>

            {task.description && (
              <p
                className="mt-1 line-clamp-1 text-xs text-slate-400"
                title={
                  task.description
                }
              >
                {
                  task.description
                }
              </p>
            )}

            {task.priority && (
              <span className="mt-1 inline-block text-[10px] text-slate-400">
                Mức độ:{" "}
                {
                  task.priority
                }
              </span>
            )}

          </div>

        </td>


        {/* ĐƠN VỊ THAM MƯU */}

        <td
          className="max-w-0 px-4 py-3 align-top text-xs text-slate-600"
        >
          <div
            className="truncate"
            title={
              task.department ||
              "Chưa xác định"
            }
          >
            {
              task.department ||
              "Chưa xác định"
            }
          </div>
        </td>


        {/* HẠN HOÀN THÀNH */}

        <td className="px-4 py-3 align-top">

          <span
            className={`text-xs font-medium ${
              overdue
                ? "text-red-600"
                : completed
                  ? "text-slate-400"
                  : "text-slate-600"
            }`}
          >
            {
              formatTaskDate(
                task.due_date
              )
            }
          </span>

          {overdue && (
            <span className="ml-1 text-[10px] font-semibold text-red-600">
              Quá hạn
            </span>
          )}

        </td>


        {/* TRẠNG THÁI */}

        <td className="px-4 py-3 text-center align-top">

          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getTaskStatusClass(
              task.status
            )}`}
          >
            {
              task.status ||
              "Chưa xác định"
            }
          </span>

        </td>


        {/* THAO TÁC */}

        <td className="px-4 py-3 align-top">

          <div className="flex items-center justify-center gap-2">

            {/* CHƯA THỰC HIỆN */}

            {task.status ===
              "Chưa thực hiện" && (

              <button
                type="button"
                onClick={
                  onStart
                }
                disabled={
                  processing
                }
                className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {
                  processing
                    ? "..."
                    : "Bắt đầu"
                }
              </button>

            )}


            {/* ĐANG THỰC HIỆN */}

            {task.status ===
              "Đang thực hiện" && (

              <button
                type="button"
                onClick={
                  onExpand
                }
                disabled={
                  processing
                }
                className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hoàn thành
              </button>

            )}


            {/* ĐÃ HOÀN THÀNH */}

            {completed && (
              <button
                type="button"
                onClick={
                  onExpand
                }
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Xem
              </button>
            )}

          </div>

        </td>

      </tr>


      {/* =====================================================
          EXPANDED ROW
      ===================================================== */}

      {expanded && (
        <tr className="border-b border-slate-200 bg-amber-50">

          <td
            colSpan={6}
            className="px-4 py-4"
          >

            <div className="rounded-xl border border-amber-200 bg-white p-4">

              {/* =================================================
                  ĐÃ HOÀN THÀNH
              ================================================= */}

              {completed ? (

                <div className="space-y-3">

                  <div>

                    <p className="text-xs font-semibold text-slate-600">
                      Nội dung hoàn thành
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {
                        task.completed_note ||
                        "Không có nội dung."
                      }
                    </p>

                  </div>


                  {task.completed_at && (
                    <div>

                      <p className="text-xs font-semibold text-slate-600">
                        Thời gian hoàn thành
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(
                          task.completed_at
                        ).toLocaleString(
                          "vi-VN"
                        )}
                      </p>

                    </div>
                  )}


                  {task.completion_file_name &&
                    task.completion_file_path && (

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="text-xs text-slate-500">
                        Minh chứng:
                      </span>

                      <button
                        type="button"
                        onClick={
                          onOpenFile
                        }
                        className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        {
                          task.completion_file_name
                        }
                      </button>

                    </div>

                  )}


                  {/* ĐÓNG */}

                  <div className="flex justify-end">

                    <button
                      type="button"
                      onClick={
                        onExpand
                      }
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Đóng
                    </button>

                  </div>

                </div>

              ) : (

                /* =================================================
                   FORM HOÀN THÀNH
                ================================================= */

                <div>

                  <p className="mb-3 text-sm font-semibold text-slate-800">
                    Hoàn thành nhiệm vụ
                  </p>


                  {/* NỘI DUNG */}

                  <div className="mb-3">

                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Nội dung hoàn thành
                      <span className="text-red-500">
                        {" "}*
                      </span>
                    </label>

                    <textarea
                      value={
                        completionNote
                      }
                      onChange={(
                        event
                      ) =>
                        onNoteChange(
                          event.target
                            .value
                        )
                      }
                      rows={3}
                      placeholder="Nhập nội dung, kết quả đã thực hiện..."
                      className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />

                  </div>


                  {/* FILE */}

                  <div className="mb-3">

                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      File minh chứng
                      <span className="text-red-500">
                        {" "}*
                      </span>
                    </label>

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      onChange={
                        onFileChange
                      }
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-600"
                    />

                    {completionFile && (
                      <p className="mt-1.5 text-xs text-emerald-600">
                        Đã chọn:{" "}
                        {
                          completionFile.name
                        }
                      </p>
                    )}

                    <p className="mt-1 text-[10px] text-slate-400">
                      PDF, Word, Excel,
                      PowerPoint · tối đa
                      20MB
                    </p>

                  </div>


                  {/* BUTTONS */}

                  <div className="flex items-center justify-end gap-2">

                    <button
                      type="button"
                      onClick={
                        onExpand
                      }
                      disabled={
                        processing
                      }
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Hủy
                    </button>

                    <button
                      type="button"
                      onClick={
                        onComplete
                      }
                      disabled={
                        processing
                      }
                      className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {
                        processing
                          ? "Đang lưu..."
                          : "Xác nhận hoàn thành"
                      }
                    </button>

                  </div>

                </div>

              )}

            </div>

          </td>

        </tr>
      )}

    </>
  );
}


/* =========================================================
   HELPERS
========================================================= */

function formatTaskDate(
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


function getTaskStatusClass(
  status: string | null
) {
  switch (status) {
    case "Đã hoàn thành":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "Đang thực hiện":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "Chưa thực hiện":
      return "bg-amber-50 text-amber-700 border-amber-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

