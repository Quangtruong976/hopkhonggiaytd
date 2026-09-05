"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type Task = {
  id: number;
  meeting_id: number;
  conclusion_id: number | null;
  title: string;
  description: string | null;
  assignee: string | null;
  department: string | null;
  priority: string;
  due_date: string | null;
  status: string;
  completed_at: string | null;
  completed_note: string | null;
  created_at: string;
  updated_at: string;
};

type Meeting = {
  id: number;
  title: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 5;

const STATUS_OPTIONS = [
  "Tất cả",
  "Chưa thực hiện",
  "Đang thực hiện",
  "Đã hoàn thành",
  "Quá hạn",
];

const PRIORITY_OPTIONS = [
  "Tất cả",
  "Bình thường",
  "Cao",
  "Khẩn cấp",
];

/* =========================================================
   PAGE
========================================================= */

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const [meetings, setMeetings] =
    useState<Record<number, string>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("Tất cả");

  const [priorityFilter, setPriorityFilter] =
    useState("Tất cả");

  const [search, setSearch] = useState("");

  const [currentUserName, setCurrentUserName] =
    useState("");

  /* =======================================================
     PAGINATION
  ======================================================= */

  const [currentPage, setCurrentPage] =
    useState(1);

  /* =======================================================
     EXPAND
  ======================================================= */

  const [expandedTaskId, setExpandedTaskId] =
    useState<number | null>(null);

  const [savingTaskId, setSavingTaskId] =
    useState<number | null>(null);

  /* =======================================================
     EDIT
  ======================================================= */

  const [editingTaskId, setEditingTaskId] =
    useState<number | null>(null);

  const [editTitle, setEditTitle] =
    useState("");

  const [editDescription, setEditDescription] =
    useState("");

  const [editAssignee, setEditAssignee] =
    useState("");

  const [editDepartment, setEditDepartment] =
    useState("");

  const [editPriority, setEditPriority] =
    useState("Bình thường");

  const [editDueDate, setEditDueDate] =
    useState("");

  const [completionNote, setCompletionNote] =
    useState("");

  /* =======================================================
     DELETE CONFIRMATION
  ======================================================= */

  const [deleteTask, setDeleteTask] =
    useState<Task | null>(null);

  const [deletingTaskId, setDeletingTaskId] =
    useState<number | null>(null);

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

    const { data, error } = await supabase
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
     LOAD TASKS
  ========================================================= */

  async function loadTasks() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("meeting_tasks")
      .select("*")
      .order("due_date", {
        ascending: true,
        nullsFirst: false,
      });

    if (error) {
      console.error(error);

      setError(
        `Không thể tải danh sách nhiệm vụ: ${error.message}`
      );

      setTasks([]);
      setLoading(false);
      return;
    }

    const loadedTasks =
      (data || []) as Task[];

    setTasks(loadedTasks);

    /* -----------------------------------------------------
       LOAD MEETINGS
    ----------------------------------------------------- */

    const meetingIds = [
      ...new Set(
        loadedTasks.map(
          (task) => task.meeting_id
        )
      ),
    ];

    if (meetingIds.length > 0) {
      const {
        data: meetingData,
        error: meetingError,
      } = await supabase
        .from("meetings")
        .select("id, title")
        .in("id", meetingIds);

      if (meetingError) {
        console.error(
          "Không thể tải thông tin cuộc họp:",
          meetingError
        );
      }

      const meetingMap: Record<
        number,
        string
      > = {};

      (meetingData || []).forEach(
        (meeting: Meeting) => {
          meetingMap[meeting.id] =
            meeting.title;
        }
      );

      setMeetings(meetingMap);
    } else {
      setMeetings({});
    }

    setLoading(false);
  }

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadTasks();
    loadCurrentUserName();
  }, []);

  /* =========================================================
     DATE
  ========================================================= */

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "—";
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatDateTime(
    date: string | null
  ) {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleString(
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
     OVERDUE
  ========================================================= */

  function isOverdue(task: Task) {
    if (
      task.status ===
        "Đã hoàn thành" ||
      !task.due_date
    ) {
      return false;
    }

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    return task.due_date < today;
  }

  /* =========================================================
     STYLE
  ========================================================= */

  function priorityStyle(
    priority: string
  ) {
    switch (priority) {
      case "Khẩn cấp":
        return "bg-red-100 text-red-800";

      case "Cao":
        return "bg-orange-50 text-orange-700";

      case "Bình thường":
        return "bg-slate-100 text-slate-600";

      default:
        return "bg-slate-100 text-slate-600";
    }
  }

  function statusStyle(
    status: string,
    overdue: boolean
  ) {
    if (overdue) {
      return "bg-red-50 text-red-700";
    }

    switch (status) {
      case "Đã hoàn thành":
        return "bg-emerald-50 text-emerald-700";

      case "Đang thực hiện":
        return "bg-blue-50 text-blue-700";

      case "Chưa thực hiện":
        return "bg-amber-50 text-amber-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  }

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredTasks = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return tasks.filter((task) => {
      const overdue =
        isOverdue(task);

      const actualStatus =
        overdue
          ? "Quá hạn"
          : task.status;

      const matchStatus =
        statusFilter === "Tất cả" ||
        actualStatus === statusFilter;

      const matchPriority =
        priorityFilter === "Tất cả" ||
        task.priority === priorityFilter;

      const meetingTitle =
        meetings[task.meeting_id] || "";

      const matchSearch =
        !keyword ||
        task.title
          .toLowerCase()
          .includes(keyword) ||
        (task.description || "")
          .toLowerCase()
          .includes(keyword) ||
        (task.assignee || "")
          .toLowerCase()
          .includes(keyword) ||
        (task.department || "")
          .toLowerCase()
          .includes(keyword) ||
        meetingTitle
          .toLowerCase()
          .includes(keyword);

      return (
        matchStatus &&
        matchPriority &&
        matchSearch
      );
    });
  }, [
    tasks,
    meetings,
    search,
    statusFilter,
    priorityFilter,
  ]);

  /* =========================================================
     PAGINATION
  ========================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredTasks.length /
        PAGE_SIZE
    )
  );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );

  const paginatedTasks =
    filteredTasks.slice(
      (safeCurrentPage - 1) *
        PAGE_SIZE,
      safeCurrentPage *
        PAGE_SIZE
    );

  const paginationStart =
    filteredTasks.length === 0
      ? 0
      : (safeCurrentPage - 1) *
          PAGE_SIZE +
        1;

  const paginationEnd =
    Math.min(
      safeCurrentPage *
        PAGE_SIZE,
      filteredTasks.length
    );

  /* =========================================================
     RESET PAGINATION
  ========================================================= */

  useEffect(() => {
    setCurrentPage(1);
    setExpandedTaskId(null);
    setEditingTaskId(null);
    setCompletionNote("");
  }, [
    search,
    statusFilter,
    priorityFilter,
  ]);

  /* =========================================================
     KEEP PAGE VALID
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
     STATISTICS
  ========================================================= */

  const total = tasks.length;

  const pending = tasks.filter(
    (task) =>
      task.status ===
      "Chưa thực hiện"
  ).length;

  const inProgress =
    tasks.filter(
      (task) =>
        task.status ===
        "Đang thực hiện"
    ).length;

  const completed =
    tasks.filter(
      (task) =>
        task.status ===
        "Đã hoàn thành"
    ).length;

  const overdue =
    tasks.filter(
      (task) => isOverdue(task)
    ).length;

  /* =========================================================
     OPEN TASK
  ========================================================= */

  function openTask(task: Task) {
    if (
      expandedTaskId ===
      task.id
    ) {
      setExpandedTaskId(null);
      setEditingTaskId(null);
      setCompletionNote("");
      return;
    }

    setExpandedTaskId(
      task.id
    );

    setEditingTaskId(null);

    setCompletionNote(
      task.completed_note || ""
    );
  }

  /* =========================================================
     START EDIT
  ========================================================= */

  function startEdit(task: Task) {
    setExpandedTaskId(task.id);
    setEditingTaskId(task.id);

    setEditTitle(task.title);
    setEditDescription(
      task.description || ""
    );
    setEditAssignee(
      task.assignee || ""
    );
    setEditDepartment(
      task.department || ""
    );
    setEditPriority(
      task.priority || "Bình thường"
    );
    setEditDueDate(
      task.due_date || ""
    );

    setCompletionNote(
      task.completed_note || ""
    );

    setError("");
    setMessage("");
  }

  /* =========================================================
     CANCEL EDIT
  ========================================================= */

  function cancelEdit() {
    setEditingTaskId(null);
  }

  /* =========================================================
     SAVE EDIT
  ========================================================= */

  async function saveEdit(task: Task) {
    if (!editTitle.trim()) {
      setError(
        "Vui lòng nhập tên nhiệm vụ."
      );
      return;
    }

    setSavingTaskId(task.id);
    setError("");
    setMessage("");

    const { error } =
      await supabase
        .from("meeting_tasks")
        .update({
          title: editTitle.trim(),
          description:
            editDescription.trim() ||
            null,
          assignee:
            editAssignee.trim() ||
            null,
          department:
            editDepartment.trim() ||
            null,
          priority:
            editPriority ||
            "Bình thường",
          due_date:
            editDueDate ||
            null,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", task.id);

    if (error) {
      console.error(error);

      setError(
        `Không thể sửa nhiệm vụ: ${error.message}`
      );

      setSavingTaskId(null);
      return;
    }

    setMessage(
      "Đã cập nhật nhiệm vụ."
    );

    setEditingTaskId(null);

    await loadTasks();

    setSavingTaskId(null);
  }

  /* =========================================================
     UPDATE STATUS
  ========================================================= */

  async function updateStatus(
    task: Task,
    status: string
  ) {
    setSavingTaskId(task.id);
    setError("");
    setMessage("");

    const updateData: {
      status: string;
      completed_at?: string | null;
      completed_note?: string | null;
    } = {
      status,
    };

    if (
      status ===
      "Đã hoàn thành"
    ) {
      updateData.completed_at =
        task.completed_at ||
        new Date().toISOString();

      updateData.completed_note =
        completionNote.trim() ||
        null;
    } else {
      updateData.completed_at =
        null;

      updateData.completed_note =
        null;
    }

    const { error } =
      await supabase
        .from("meeting_tasks")
        .update(updateData)
        .eq("id", task.id);

    if (error) {
      console.error(error);

      setError(
        `Không thể cập nhật nhiệm vụ: ${error.message}`
      );

      setSavingTaskId(null);
      return;
    }

    setMessage(
      "Đã cập nhật nhiệm vụ."
    );

    await loadTasks();

    setSavingTaskId(null);
    setExpandedTaskId(null);
    setEditingTaskId(null);
    setCompletionNote("");
  }

  /* =========================================================
     OPEN DELETE CONFIRMATION
  ========================================================= */

  function requestDeleteTask(
    task: Task
  ) {
    setDeleteTask(task);
    setError("");
    setMessage("");
  }

  /* =========================================================
     DELETE TASK
  ========================================================= */

  async function confirmDeleteTask() {
    if (!deleteTask) {
      return;
    }

    setDeletingTaskId(
      deleteTask.id
    );

    setError("");
    setMessage("");

    const { error } =
      await supabase
        .from("meeting_tasks")
        .delete()
        .eq("id", deleteTask.id);

    if (error) {
      console.error(error);

      setError(
        `Không thể xóa nhiệm vụ: ${error.message}`
      );

      setDeletingTaskId(null);
      return;
    }

    if (
      expandedTaskId ===
      deleteTask.id
    ) {
      setExpandedTaskId(null);
      setEditingTaskId(null);
      setCompletionNote("");
    }

    setMessage(
      "Đã xóa nhiệm vụ khỏi hệ thống."
    );

    setDeleteTask(null);

    await loadTasks();

    setDeletingTaskId(null);
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

      <div className="mx-auto max-w-7xl px-5 py-6">

        {/* ===================================================
            TITLE
        =================================================== */}

        <div className="mb-5">

        <h2 className="text-lg font-bold text-emerald-900">
        <span className="text-amber-500">📌 </span>
            Nhiệm vụ
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Theo dõi các nhiệm vụ được giao từ cuộc họp và kết luận chỉ đạo.
          </p>

        </div>


        {/* ===================================================
            STATISTICS
        =================================================== */}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">

            <span className="font-semibold text-slate-700">
              Tổng: {total}
            </span>

            <span className="text-amber-700">
              Chưa thực hiện:{" "}
              {pending}
            </span>

            <span className="text-blue-700">
              Đang thực hiện:{" "}
              {inProgress}
            </span>

            <span className="text-red-700">
              Quá hạn: {overdue}
            </span>

            <span className="text-emerald-700">
              Hoàn thành:{" "}
              {completed}
            </span>

          </div>

        </div>


        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}


        {/* ===================================================
            MESSAGE
        =================================================== */}

        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}


        {/* ===================================================
            MAIN LIST
        =================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">

          {/* =================================================
              SECTION HEADER
          ================================================= */}

          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">

            <div className="shrink-0">

              <h3 className="text-base font-bold text-slate-800">
                Danh sách nhiệm vụ
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                Quản lý và theo dõi tiến độ thực hiện nhiệm vụ.
              </p>

            </div>


            {/* =================================================
                SEARCH / FILTER
            ================================================= */}

            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">

              <div className="relative w-full sm:w-72">

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Tìm theo tên nhiệm vụ..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-700"
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

                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}

              </select>


              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value
                  )
                }
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500"
              >

                {PRIORITY_OPTIONS.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}

              </select>


              <button
                type="button"
                onClick={loadTasks}
                disabled={loading}
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ↻ Làm mới
              </button>

            </div>

          </div>


          {/* =================================================
              LIST
          ================================================= */}

          {loading ? (

            <div className="p-12 text-center text-sm text-slate-500">
              Đang tải danh sách nhiệm vụ...
            </div>

          ) : filteredTasks.length ===
            0 ? (

            <div className="p-12 text-center">

              <p className="font-semibold text-slate-700">
                {tasks.length === 0
                  ? "Chưa có nhiệm vụ"
                  : "Không tìm thấy nhiệm vụ phù hợp"}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {tasks.length === 0
                  ? "Chưa có nhiệm vụ nào được giao."
                  : "Hãy thay đổi từ khóa hoặc điều kiện lọc."}
              </p>

              {tasks.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter(
                      "Tất cả"
                    );
                    setPriorityFilter(
                      "Tất cả"
                    );
                  }}
                  className="mt-5 cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-normal text-slate-700 transition hover:bg-slate-50"
                >
                  Xóa bộ lọc
                </button>
              )}

            </div>

          ) : (

            <>

              {/* =================================================
                  TABLE
              ================================================= */}

              <div className="overflow-x-auto">

                <table className="w-full table-fixed border-collapse text-sm">

                  <colgroup>
                    <col className="w-[4%]" />
                    <col className="w-[24%]" />
                    <col className="w-[16%]" />
                    <col className="w-[12%]" />
                    <col className="w-[9%]" />
                    <col className="w-[9%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                  </colgroup>


                  <thead>

                    <tr className="bg-white text-xs font-semibold text-slate-600">

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        STT
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-left">
                        Nhiệm vụ
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-left">
                        Cuộc họp
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-left">
                        Người phụ trách
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        Hạn
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        Ưu tiên
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        Trạng thái
                      </th>

                      <th className="border-b border-slate-200 px-2 py-3 text-center">
                        Thao tác
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {paginatedTasks.map(
                      (task, index) => {

                        const overdue =
                          isOverdue(task);

                        const expanded =
                          expandedTaskId ===
                          task.id;

                        const globalIndex =
                          (safeCurrentPage -
                            1) *
                            PAGE_SIZE +
                          index;

                        return (
                          <TaskRows
                            key={task.id}
                            task={task}
                            index={
                              globalIndex
                            }
                            expanded={
                              expanded
                            }
                            overdue={
                              overdue
                            }
                            meetings={
                              meetings
                            }
                            completionNote={
                              completionNote
                            }
                            setCompletionNote={
                              setCompletionNote
                            }
                            saving={
                              savingTaskId ===
                              task.id
                            }
                            editing={
                              editingTaskId ===
                              task.id
                            }
                            editTitle={
                              editTitle
                            }
                            setEditTitle={
                              setEditTitle
                            }
                            editDescription={
                              editDescription
                            }
                            setEditDescription={
                              setEditDescription
                            }
                            editAssignee={
                              editAssignee
                            }
                            setEditAssignee={
                              setEditAssignee
                            }
                            editDepartment={
                              editDepartment
                            }
                            setEditDepartment={
                              setEditDepartment
                            }
                            editPriority={
                              editPriority
                            }
                            setEditPriority={
                              setEditPriority
                            }
                            editDueDate={
                              editDueDate
                            }
                            setEditDueDate={
                              setEditDueDate
                            }
                            openTask={
                              openTask
                            }
                            startEdit={
                              startEdit
                            }
                            cancelEdit={
                              cancelEdit
                            }
                            saveEdit={
                              saveEdit
                            }
                            updateStatus={
                              updateStatus
                            }
                            requestDeleteTask={
                              requestDeleteTask
                            }
                            formatDate={
                              formatDate
                            }
                            formatDateTime={
                              formatDateTime
                            }
                            priorityStyle={
                              priorityStyle
                            }
                            statusStyle={
                              statusStyle
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

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-xs text-slate-500">

                  Hiển thị{" "}

                  <span className="font-semibold text-slate-700">
                    {paginationStart}
                  </span>

                  –

                  <span className="font-semibold text-slate-700">
                    {paginationEnd}
                  </span>

                  {" / "}

                  <span className="font-semibold text-slate-700">
                    {filteredTasks.length}
                  </span>

                  {" "}nhiệm vụ

                </p>


                <div className="flex items-center justify-end gap-1">

                  <button
                    type="button"
                    disabled={
                      safeCurrentPage ===
                      1
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
                        safeCurrentPage ===
                        page
                          ? "border-emerald-600 bg-emerald-700 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
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


      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ===================================================== */}

      {deleteTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">

          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">

            {/* HEADER */}

            <div className="border-b border-slate-200 px-5 py-4">

              <h3 className="text-base font-semibold text-slate-800">
                Xác nhận xóa nhiệm vụ
              </h3>

            </div>


            {/* CONTENT */}

            <div className="px-5 py-5">

              <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                <p className="text-sm font-semibold text-red-700">
                  ⚠ Lưu ý
                </p>

                <p className="mt-2 text-sm leading-6 text-red-700">
                  Nhiệm vụ này thuộc hồ sơ cuộc họp.
                  Nếu xóa tại đây, nhiệm vụ cũng sẽ
                  được xóa khỏi phần Nhiệm vụ của cuộc họp.
                </p>

              </div>


              <div className="mt-4">

                <p className="text-sm text-slate-700">
                  <span className="font-semibold">
                    Nhiệm vụ:
                  </span>{" "}
                  {deleteTask.title}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  <span className="font-semibold">
                    Cuộc họp:
                  </span>{" "}
                  {meetings[
                    deleteTask.meeting_id
                  ] ||
                    `Cuộc họp #${deleteTask.meeting_id}`}
                </p>

              </div>


              <p className="mt-4 text-xs leading-5 text-slate-500">
                Nếu không chắc chắn, bạn nên vào hồ sơ
                cuộc họp để kiểm tra nhiệm vụ trước khi
                thực hiện xóa.
              </p>

            </div>


            {/* ACTION */}

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">

              <button
                type="button"
                onClick={() =>
                  setDeleteTask(null)
                }
                disabled={
                  deletingTaskId !== null
                }
                className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-normal text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hủy
              </button>


              <button
                type="button"
                onClick={
                  confirmDeleteTask
                }
                disabled={
                  deletingTaskId !== null
                }
                className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-sm font-normal text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingTaskId !== null
                  ? "Đang xóa..."
                  : "Vẫn xóa nhiệm vụ"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}


/* =========================================================
   TASK ROWS
========================================================= */

function TaskRows({
  task,
  index,
  expanded,
  overdue,
  meetings,
  completionNote,
  setCompletionNote,
  saving,
  editing,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editAssignee,
  setEditAssignee,
  editDepartment,
  setEditDepartment,
  editPriority,
  setEditPriority,
  editDueDate,
  setEditDueDate,
  openTask,
  startEdit,
  cancelEdit,
  saveEdit,
  updateStatus,
  requestDeleteTask,
  formatDate,
  formatDateTime,
  priorityStyle,
  statusStyle,
}: {
  task: Task;
  index: number;
  expanded: boolean;
  overdue: boolean;
  meetings: Record<number, string>;
  completionNote: string;
  setCompletionNote: (
    value: string
  ) => void;
  saving: boolean;
  editing: boolean;
  editTitle: string;
  setEditTitle: (
    value: string
  ) => void;
  editDescription: string;
  setEditDescription: (
    value: string
  ) => void;
  editAssignee: string;
  setEditAssignee: (
    value: string
  ) => void;
  editDepartment: string;
  setEditDepartment: (
    value: string
  ) => void;
  editPriority: string;
  setEditPriority: (
    value: string
  ) => void;
  editDueDate: string;
  setEditDueDate: (
    value: string
  ) => void;
  openTask: (task: Task) => void;
  startEdit: (task: Task) => void;
  cancelEdit: () => void;
  saveEdit: (task: Task) => void;
  updateStatus: (
    task: Task,
    status: string
  ) => void;
  requestDeleteTask: (
    task: Task
  ) => void;
  formatDate: (
    date: string | null
  ) => string;
  formatDateTime: (
    date: string | null
  ) => string;
  priorityStyle: (
    priority: string
  ) => string;
  statusStyle: (
    status: string,
    overdue: boolean
  ) => string;
}) {
  return (
    <>
      {/* =====================================================
          MAIN ROW
      ===================================================== */}

      <tr
        className={`cursor-pointer transition ${
          expanded
            ? "bg-amber-50"
            : "hover:bg-emerald-50"
        }`}
        onClick={() =>
          openTask(task)
        }
      >

        {/* STT */}

        <td className="border-b border-slate-200 px-2 py-3 text-center text-xs text-slate-500">
          {index + 1}
        </td>


        {/* NHIỆM VỤ */}

        <td className="border-b border-slate-200 px-2 py-3 align-top">

          <p className="truncate text-sm font-medium text-slate-800">
            {task.title}
          </p>

          {task.description && (
            <p className="mt-1 truncate text-xs text-slate-400">
              {task.description}
            </p>
          )}

        </td>


        {/* CUỘC HỌP */}

        <td className="border-b border-slate-200 px-2 py-3 align-top">

          <p className="line-clamp-2 text-xs leading-5 text-slate-600">
            {meetings[
              task.meeting_id
            ] ||
              `Cuộc họp #${task.meeting_id}`}
          </p>

        </td>


        {/* NGƯỜI PHỤ TRÁCH */}

        <td className="border-b border-slate-200 px-2 py-3 align-top">

          <p className="truncate text-xs text-slate-700">
            {task.assignee ||
              "Chưa xác định"}
          </p>

          {task.department && (
            <p className="mt-1 truncate text-[11px] text-slate-400">
              {task.department}
            </p>
          )}

        </td>


        {/* HẠN */}

        <td className="border-b border-slate-200 px-2 py-3 text-center align-top">

          <span
            className={`text-xs ${
              overdue
                ? "font-semibold text-red-700"
                : "text-slate-600"
            }`}
          >
            {formatDate(
              task.due_date
            )}
          </span>

        </td>


        {/* ƯU TIÊN */}

        <td className="border-b border-slate-200 px-2 py-3 text-center align-top">

          <span
            className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold ${priorityStyle(
              task.priority
            )}`}
          >
            {task.priority}
          </span>

        </td>


        {/* TRẠNG THÁI */}

        <td className="border-b border-slate-200 px-2 py-3 text-center align-top">

          <div className="flex items-center justify-center gap-2">

            <span
              className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle(
                task.status,
                overdue
              )}`}
            >
              {overdue
                ? "Quá hạn"
                : task.status}
            </span>

            <span className="text-xs text-slate-400">
              {expanded
                ? "⌃"
                : "⌄"}
            </span>

          </div>

        </td>


        {/* =================================================
            THAO TÁC
        ================================================= */}

        <td
          className="border-b border-slate-200 px-2 py-3 text-center align-top"
          onClick={(event) =>
            event.stopPropagation()
          }
        >

          <div className="flex items-center justify-center gap-1.5">

            <button
              type="button"
              onClick={() =>
                startEdit(task)
              }
              disabled={saving}
              className="cursor-pointer rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-normal text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              title="Sửa nhiệm vụ"
            >
              ✎ Sửa
            </button>


            <button
              type="button"
              onClick={() =>
                requestDeleteTask(
                  task
                )
              }
              disabled={saving}
              className="cursor-pointer rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-normal text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              title="Xóa nhiệm vụ"
            >
              🗑 Xóa
            </button>

          </div>

        </td>

      </tr>


      {/* =====================================================
          DETAIL
      ===================================================== */}

      {expanded && (

        <tr>

          <td
            colSpan={8}
            className="border-b border-slate-200 bg-amber-50 px-5 py-5"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="space-y-5">

              {/* =================================================
                  DETAIL HEADER
              ================================================= */}

              <div className="flex items-start justify-between gap-4">

                <div>

                  <h3 className="text-base font-semibold text-slate-800">
                    {editing
                      ? "Sửa nhiệm vụ"
                      : task.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {editing
                      ? "Cập nhật thông tin nhiệm vụ."
                      : "Chi tiết và cập nhật tiến độ nhiệm vụ."}
                  </p>

                </div>

              </div>


              {/* =================================================
                  EDIT FORM
              ================================================= */}

              {editing ? (

                <div className="rounded-xl border border-amber-200 bg-white p-4">

                  <div className="grid gap-4 lg:grid-cols-2">

                    {/* TÊN */}

                    <div className="lg:col-span-2">

                      <label className="text-xs font-semibold text-slate-600">
                        Tên nhiệm vụ
                      </label>

                      <input
                        value={editTitle}
                        onChange={(event) =>
                          setEditTitle(
                            event.target.value
                          )
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />

                    </div>


                    {/* NỘI DUNG */}

                    <div className="lg:col-span-2">

                      <label className="text-xs font-semibold text-slate-600">
                        Nội dung nhiệm vụ
                      </label>

                      <textarea
                        value={
                          editDescription
                        }
                        onChange={(event) =>
                          setEditDescription(
                            event.target.value
                          )
                        }
                        rows={4}
                        className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-6 text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />

                    </div>


                    {/* NGƯỜI PHỤ TRÁCH */}

                    <div>

                      <label className="text-xs font-semibold text-slate-600">
                        Người phụ trách
                      </label>

                      <input
                        value={
                          editAssignee
                        }
                        onChange={(event) =>
                          setEditAssignee(
                            event.target.value
                          )
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />

                    </div>


                    {/* ĐƠN VỊ */}

                    <div>

                      <label className="text-xs font-semibold text-slate-600">
                        Đơn vị tham mưu
                      </label>

                      <input
                        value={
                          editDepartment
                        }
                        onChange={(event) =>
                          setEditDepartment(
                            event.target.value
                          )
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />

                    </div>


                    {/* ƯU TIÊN */}

                    <div>

                      <label className="text-xs font-semibold text-slate-600">
                        Mức độ ưu tiên
                      </label>

                      <select
                        value={
                          editPriority
                        }
                        onChange={(event) =>
                          setEditPriority(
                            event.target.value
                          )
                        }
                        className="mt-1.5 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500"
                      >

                        {PRIORITY_OPTIONS.filter(
                          (option) =>
                            option !==
                            "Tất cả"
                        ).map(
                          (option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>
                          )
                        )}

                      </select>

                    </div>


                    {/* HẠN */}

                    <div>

                      <label className="text-xs font-semibold text-slate-600">
                        Hạn hoàn thành
                      </label>

                      <input
                        type="date"
                        value={
                          editDueDate
                        }
                        onChange={(event) =>
                          setEditDueDate(
                            event.target.value
                          )
                        }
                        className="mt-1.5 w-full cursor-pointer rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />

                    </div>

                  </div>


                  {/* EDIT ACTION */}

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">

                    <button
                      type="button"
                      onClick={
                        cancelEdit
                      }
                      disabled={saving}
                      className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-normal text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Hủy
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        saveEdit(task)
                      }
                      disabled={saving}
                      className="cursor-pointer rounded-xl bg-emerald-700 px-4 py-2 text-sm font-normal text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving
                        ? "Đang lưu..."
                        : "Lưu thay đổi"}
                    </button>

                  </div>

                </div>

              ) : (

                <>
                  {/* =================================================
                      INFO
                  ================================================= */}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                    <InfoItem
                      label="Cuộc họp"
                      value={
                        meetings[
                          task.meeting_id
                        ] ||
                        `Cuộc họp #${task.meeting_id}`
                      }
                    />

                    <InfoItem
                      label="Người phụ trách"
                      value={
                        task.assignee ||
                        "Chưa xác định"
                      }
                    />

                    <InfoItem
                      label="Đơn vị tham mưu"
                      value={
                        task.department ||
                        "Chưa xác định"
                      }
                    />

                    <InfoItem
                      label="Hạn hoàn thành"
                      value={formatDate(
                        task.due_date
                      )}
                    />

                    <InfoItem
                      label="Mức độ ưu tiên"
                      value={
                        task.priority
                      }
                    />

                    <InfoItem
                      label="Trạng thái"
                      value={
                        overdue
                          ? "Quá hạn"
                          : task.status
                      }
                    />

                  </div>


                  {/* =================================================
                      DESCRIPTION
                  ================================================= */}

                  {task.description && (
                    <div className="rounded-xl border border-amber-200 bg-white p-4">

                      <p className="text-xs font-semibold text-slate-500">
                        Nội dung nhiệm vụ
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {task.description}
                      </p>

                    </div>
                  )}


                  {/* =================================================
                      COMPLETION
                  ================================================= */}

                  {task.status ===
                    "Đã hoàn thành" ? (

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                      <p className="text-sm font-semibold text-emerald-700">
                        ✓ Đã hoàn thành
                      </p>

                      <p className="mt-1 text-xs text-emerald-600">
                        Thời điểm:{" "}
                        {formatDateTime(
                          task.completed_at
                        )}
                      </p>

                      {task.completed_note && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-700">
                          {task.completed_note}
                        </p>
                      )}

                    </div>

                  ) : (

                    <div className="rounded-xl border border-slate-200 bg-white p-4">

                      <label className="text-xs font-semibold text-slate-600">
                        Ghi chú hoàn thành
                      </label>

                      <textarea
                        value={
                          completionNote
                        }
                        onChange={(event) =>
                          setCompletionNote(
                            event.target.value
                          )
                        }
                        placeholder="Nhập ghi chú khi hoàn thành nhiệm vụ..."
                        rows={4}
                        className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />

                    </div>

                  )}


                  {/* =================================================
                      ACTION
                  ================================================= */}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200 pt-4">

                    <div className="text-xs text-slate-400">

                      Cập nhật:{" "}
                      {formatDateTime(
                        task.updated_at
                      )}

                    </div>


                    <div className="flex flex-wrap items-center justify-end gap-2">

                      {/* SỬA */}

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          startEdit(task)
                        }
                        className="cursor-pointer rounded-xl bg-amber-50 px-4 py-2 text-sm font-normal text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ✎ Sửa
                      </button>


                      {/* XÓA */}

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          requestDeleteTask(
                            task
                          )
                        }
                        className="cursor-pointer rounded-xl bg-red-50 px-4 py-2 text-sm font-normal text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        🗑 Xóa
                      </button>


                      {/* LƯU CẬP NHẬT */}

                      {task.status !==
                        "Đã hoàn thành" && (

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            updateStatus(
                              task,
                              task.status
                            )
                          }
                          className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-normal text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving
                            ? "Đang lưu..."
                            : "Lưu cập nhật"}
                        </button>

                      )}


                      {/* BẮT ĐẦU */}

                      {task.status !==
                        "Đang thực hiện" &&
                        task.status !==
                          "Đã hoàn thành" && (

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            updateStatus(
                              task,
                              "Đang thực hiện"
                            )
                          }
                          className="cursor-pointer rounded-xl bg-amber-500 px-4 py-2 text-sm font-normal text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Bắt đầu thực hiện
                        </button>

                      )}


                      {/* HOÀN THÀNH */}

                      {task.status !==
                        "Đã hoàn thành" && (

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            updateStatus(
                              task,
                              "Đã hoàn thành"
                            )
                          }
                          className="cursor-pointer rounded-xl bg-emerald-700 px-4 py-2 text-sm font-normal text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ✓ Xác nhận hoàn thành
                        </button>

                      )}

                    </div>

                  </div>

                </>

              )}


              {/* =================================================
                  COLLAPSE
              ================================================= */}

              <div className="flex justify-end">

                <button
                  type="button"
                  onClick={() =>
                    openTask(task)
                  }
                  className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-normal text-slate-600 transition hover:bg-slate-50"
                >
                  Thu gọn ↑
                </button>

              </div>

            </div>

          </td>

        </tr>

      )}

    </>
  );
}


/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">

      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm text-slate-700">
        {value}
      </p>

    </div>
  );
}

