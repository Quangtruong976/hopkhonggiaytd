"use client";

import { useEffect, useMemo, useState } from "react";
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
  assignee_id: string | null;
  department: string | null;
  priority: string;
  due_date: string | null;
  status: string;
  completed_at: string | null;
  completed_note: string | null;
  created_at: string;
  updated_at: string;
};

type MemberGroup = {
  id: number;
  name: string;
};

type GroupMember = {
  id: number;
  group_id: number;
  user_id: string;
};

type Profile = {
  id: string;
  full_name: string;
  position: string | null;
  organization: string | null;
};

type TasksTabProps = {
  meetingId: number;
};

/* =========================================================
   PAGE
========================================================= */

export default function TasksTab({
  meetingId,
}: TasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);

  /* =======================================================
     NHÓM + NGƯỜI PHỤ TRÁCH
  ======================================================= */

  const [groups, setGroups] = useState<MemberGroup[]>([]);
  const [groupMembers, setGroupMembers] =
    useState<GroupMember[]>([]);
  const [profiles, setProfiles] =
    useState<Profile[]>([]);

  const [selectedGroupId, setSelectedGroupId] =
    useState("");

  const [selectedAssigneeId, setSelectedAssigneeId] =
    useState("");

  /* =======================================================
     FORM
  ======================================================= */

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [department, setDepartment] = useState("");
  const [priority, setPriority] =
    useState("Bình thường");
  const [dueDate, setDueDate] = useState("");

  /* =======================================================
     EDIT
  ======================================================= */

  const [editingTaskId, setEditingTaskId] =
    useState<number | null>(null);

  /* =======================================================
     STATE
  ======================================================= */

  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] =
    useState(true);
  const [loadingProfiles, setLoadingProfiles] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingTaskId, setDeletingTaskId] =
    useState<number | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* =========================================================
     LOAD TASKS
  ========================================================= */

  async function loadTasks() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("meeting_tasks")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      setError(
        `Không thể tải nhiệm vụ: ${error.message}`
      );

      setTasks([]);
    } else {
      setTasks((data || []) as Task[]);
    }

    setLoading(false);
  }

  /* =========================================================
     LOAD NHÓM THÀNH PHẦN
  ========================================================= */

  async function loadGroups() {
    setLoadingGroups(true);

    const { data, error } = await supabase
      .from("member_groups")
      .select("id, name")
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error(error);

      setError(
        `Không thể tải nhóm thành phần: ${error.message}`
      );

      setGroups([]);
    } else {
      setGroups((data || []) as MemberGroup[]);
    }

    setLoadingGroups(false);
  }

  /* =========================================================
     LOAD GROUP MEMBERS
  ========================================================= */

  async function loadGroupMembers() {
    const { data, error } = await supabase
      .from("group_members")
      .select("id, group_id, user_id");

    if (error) {
      console.error(error);

      setError(
        `Không thể tải thành phần nhóm: ${error.message}`
      );

      setGroupMembers([]);
    } else {
      setGroupMembers(
        (data || []) as GroupMember[]
      );
    }
  }

  /* =========================================================
     LOAD PROFILES
  ========================================================= */

  async function loadProfiles() {
    setLoadingProfiles(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        position,
        organization
      `)
      .eq("role", "delegate")
      .eq("is_active", true)
      .order("full_name", {
        ascending: true,
      });

    if (error) {
      console.error(error);

      setError(
        `Không thể tải danh sách tài khoản: ${error.message}`
      );

      setProfiles([]);
    } else {
      setProfiles((data || []) as Profile[]);
    }

    setLoadingProfiles(false);
  }

  /* =========================================================
     LOAD DATA
  ========================================================= */

  useEffect(() => {
    loadTasks();
    loadGroups();
    loadGroupMembers();
    loadProfiles();
  }, [meetingId]);

  /* =========================================================
     DANH SÁCH NGƯỜI THEO NHÓM
  ========================================================= */

  const filteredProfiles = useMemo(() => {
    if (!selectedGroupId) {
      return [];
    }

    const groupId = Number(selectedGroupId);

    return profiles.filter((profile) =>
      groupMembers.some(
        (member) =>
          member.group_id === groupId &&
          member.user_id === profile.id
      )
    );
  }, [
    selectedGroupId,
    profiles,
    groupMembers,
  ]);

  /* =========================================================
     CHỌN NHÓM
  ========================================================= */

  function handleGroupChange(
    groupId: string
  ) {
    setSelectedGroupId(groupId);

    setSelectedAssigneeId("");
    setAssignee("");
    setDepartment("");
  }

  /* =========================================================
     CHỌN NGƯỜI PHỤ TRÁCH
  ========================================================= */

  function handleAssigneeChange(
    assigneeId: string
  ) {
    setSelectedAssigneeId(assigneeId);

    const selectedProfile = profiles.find(
      (profile) =>
        profile.id === assigneeId
    );

    if (!selectedProfile) {
      setAssignee("");
      setDepartment("");
      return;
    }

    setAssignee(
      selectedProfile.full_name
    );

    setDepartment(
      selectedProfile.organization || ""
    );
  }

  /* =========================================================
     RESET FORM
  ========================================================= */

  function resetForm() {
    setEditingTaskId(null);

    setTitle("");
    setDescription("");
    setSelectedGroupId("");
    setSelectedAssigneeId("");
    setAssignee("");
    setDepartment("");
    setPriority("Bình thường");
    setDueDate("");
  }

  /* =========================================================
     CREATE / UPDATE TASK
  ========================================================= */

  async function saveTask() {
    setError("");
    setMessage("");

    if (!title.trim()) {
      setError(
        "Vui lòng nhập nội dung nhiệm vụ."
      );
      return;
    }

    if (!selectedGroupId) {
      setError(
        "Vui lòng chọn nhóm thành phần."
      );
      return;
    }

    if (!selectedAssigneeId) {
      setError(
        "Vui lòng chọn người phụ trách."
      );
      return;
    }

    if (!dueDate) {
      setError(
        "Vui lòng chọn hạn hoàn thành."
      );
      return;
    }

    const selectedProfile = profiles.find(
      (profile) =>
        profile.id === selectedAssigneeId
    );

    if (!selectedProfile) {
      setError(
        "Không tìm thấy tài khoản người phụ trách."
      );
      return;
    }

    setSaving(true);

    const taskData = {
      title: title.trim(),

      description:
        description.trim() || null,

      assignee_id:
        selectedProfile.id,

      assignee:
        selectedProfile.full_name,

      department:
        selectedProfile.organization || null,

      priority,

      due_date: dueDate,
    };

    /* =======================================================
       SỬA NHIỆM VỤ
    ======================================================= */

    if (editingTaskId !== null) {
      const currentTask = tasks.find(
        (task) =>
          task.id === editingTaskId
      );

      /*
       * Không cho sửa nhiệm vụ đã hoàn thành.
       * Đây là lớp bảo vệ phía giao diện.
       */

      if (
        currentTask?.status ===
        "Đã hoàn thành"
      ) {
        setError(
          "Nhiệm vụ đã hoàn thành không thể sửa."
        );

        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("meeting_tasks")
        .update(taskData)
        .eq("id", editingTaskId)
        .eq("meeting_id", meetingId);

      if (error) {
        console.error(error);

        setError(
          `Không thể cập nhật nhiệm vụ: ${error.message}`
        );

        setSaving(false);
        return;
      }

      setMessage(
        "Đã cập nhật nhiệm vụ."
      );
    }

    /* =======================================================
       TẠO NHIỆM VỤ
    ======================================================= */

    else {
      const { error } = await supabase
        .from("meeting_tasks")
        .insert({
          meeting_id: meetingId,

          ...taskData,

          /*
           * Nhiệm vụ được ghi nhận là
           * đang thực hiện ngay khi giao.
           */
          status: "Chưa thực hiện",
        });

      if (error) {
        console.error(error);

        setError(
          `Không thể tạo nhiệm vụ: ${error.message}`
        );

        setSaving(false);
        return;
      }

      setMessage(
        "Đã tạo nhiệm vụ và giao cho tài khoản được chọn."
      );
    }

    resetForm();

    await loadTasks();

    setSaving(false);
  }

  /* =========================================================
     BẮT ĐẦU SỬA NHIỆM VỤ
  ========================================================= */

  function editTask(task: Task) {
    /*
     * Không cho sửa nhiệm vụ đã hoàn thành.
     */

    if (
      task.status ===
      "Đã hoàn thành"
    ) {
      setError(
        "Nhiệm vụ đã hoàn thành không thể sửa."
      );
      return;
    }

    setError("");
    setMessage("");

    setEditingTaskId(task.id);

    setTitle(task.title);

    setDescription(
      task.description || ""
    );

    setPriority(
      task.priority || "Bình thường"
    );

    setDueDate(
      task.due_date || ""
    );

    /*
     * Tìm nhóm hiện tại của người được giao.
     */

    if (task.assignee_id) {
      const member = groupMembers.find(
        (item) =>
          item.user_id ===
          task.assignee_id
      );

      if (member) {
        setSelectedGroupId(
          String(member.group_id)
        );
      } else {
        setSelectedGroupId("");
      }

      setSelectedAssigneeId(
        task.assignee_id
      );

      setAssignee(
        task.assignee || ""
      );

      setDepartment(
        task.department || ""
      );
    } else {
      setSelectedGroupId("");
      setSelectedAssigneeId("");

      setAssignee(
        task.assignee || ""
      );

      setDepartment(
        task.department || ""
      );
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =========================================================
     XÓA NHIỆM VỤ
  ========================================================= */

  async function deleteTask(task: Task) {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa nhiệm vụ "${task.title}" không?`
    );
  
    if (!confirmed) {
      return;
    }
  
    setDeletingTaskId(task.id);
    setError("");
    setMessage("");
  
    const { error } = await supabase
      .from("meeting_tasks")
      .delete()
      .eq("id", task.id)
      .eq("meeting_id", meetingId);
  
    if (error) {
      console.error(error);
  
      setError(
        `Không thể xóa nhiệm vụ: ${error.message}`
      );
  
      setDeletingTaskId(null);
      return;
    }
  
    if (editingTaskId === task.id) {
      resetForm();
    }
  
    setMessage("Đã xóa nhiệm vụ.");
  
    await loadTasks();
  
    setDeletingTaskId(null);
  }

  /* =========================================================
     STATUS STYLE
  ========================================================= */

  function getStatusStyle(
    status: string
  ) {
    switch (status) {
      case "Đã hoàn thành":
        return "bg-emerald-50 text-emerald-700";

      case "Đang thực hiện":
        return "bg-blue-50 text-blue-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  }

  /* =========================================================
     PRIORITY STYLE
  ========================================================= */

  function getPriorityStyle(
    priority: string
  ) {
    switch (priority) {
      case "Cao":
        return "bg-orange-50 text-orange-700";

      case "Khẩn cấp":
        return "bg-red-50 text-red-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  }

  /* =========================================================
     CHECK OVERDUE
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
     FORMAT DATE
  ========================================================= */

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "—";
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "vi-VN"
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-6">

      {/* =====================================================
          TIÊU ĐỀ
      ===================================================== */}

      <div>
      <h2 className="text-base font-bold text-emerald-900">
      <span className="text-emerald-900">● </span>
          Nhiệm vụ cuộc họp
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Giao và theo dõi các nhiệm vụ sau cuộc họp.
        </p>
      </div>


      {/* =====================================================
          THÔNG BÁO
      ===================================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}


      {/* =====================================================
          FORM TẠO / SỬA
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex items-center justify-between gap-3">

          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {editingTaskId !== null
                ? "Sửa nhiệm vụ"
                : "Giao nhiệm vụ"}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {editingTaskId !== null
                ? "Cập nhật thông tin nhiệm vụ đang thực hiện."
                : "Nhiệm vụ sẽ được ghi nhận là đang thực hiện ngay khi giao."}
            </p>
          </div>

          {editingTaskId !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Hủy sửa
            </button>
          )}

        </div>


        {/* ===================================================
            NỘI DUNG
        =================================================== */}

        <div className="mt-5">

          <label className="text-sm font-semibold text-slate-700">
            Nội dung nhiệm vụ
          </label>

          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="Ví dụ: Hoàn thiện Kế hoạch Mùa hè số"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />

        </div>


        {/* ===================================================
            CHI TIẾT
        =================================================== */}

        <div className="mt-5">

          <label className="text-sm font-semibold text-slate-700">
            Nội dung chi tiết
          </label>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            rows={3}
            placeholder="Mô tả yêu cầu thực hiện..."
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />

        </div>


        {/* ===================================================
            NHÓM + NGƯỜI
        =================================================== */}

        <div className="mt-5 grid gap-5 md:grid-cols-2">

          {/* NHÓM */}

          <div>

            <label className="text-sm font-semibold text-slate-700">
              Nhóm thành phần
            </label>

            <select
              value={selectedGroupId}
              onChange={(e) =>
                handleGroupChange(
                  e.target.value
                )
              }
              disabled={loadingGroups}
              className="mt-2 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            >

              <option value="">
                {loadingGroups
                  ? "Đang tải nhóm..."
                  : "Chọn nhóm thành phần"}
              </option>

              {groups.map(
                (group) => (
                  <option
                    key={group.id}
                    value={group.id}
                  >
                    {group.name}
                  </option>
                )
              )}

            </select>

          </div>


          {/* NGƯỜI */}

          <div>

            <label className="text-sm font-semibold text-slate-700">
              Người phụ trách
            </label>

            <select
              value={selectedAssigneeId}
              onChange={(e) =>
                handleAssigneeChange(
                  e.target.value
                )
              }
              disabled={
                !selectedGroupId ||
                loadingProfiles
              }
              className="mt-2 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            >

              <option value="">
                {!selectedGroupId
                  ? "Vui lòng chọn nhóm trước"
                  : loadingProfiles
                    ? "Đang tải danh sách..."
                    : filteredProfiles.length === 0
                      ? "Nhóm chưa có thành viên"
                      : "Chọn người phụ trách"}
              </option>

              {filteredProfiles.map(
                (profile) => (
                  <option
                    key={profile.id}
                    value={profile.id}
                  >
                    {profile.full_name}
                    {profile.position
                      ? ` — ${profile.position}`
                      : ""}
                  </option>
                )
              )}

            </select>

          </div>

        </div>


        {/* ===================================================
            ĐƠN VỊ
        =================================================== */}

        <div className="mt-5">

          <label className="text-sm font-semibold text-slate-700">
            Đơn vị phụ trách
          </label>

          <input
            value={department}
            readOnly
            placeholder="Tự động lấy từ hồ sơ người phụ trách"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
          />

        </div>


        {/* ===================================================
            ƯU TIÊN + HẠN
        =================================================== */}

        <div className="mt-5 grid gap-5 md:grid-cols-2">

          <div>

            <label className="text-sm font-semibold text-slate-700">
              Mức độ ưu tiên
            </label>

            <select
              value={priority}
              onChange={(e) =>
                setPriority(
                  e.target.value
                )
              }
              className="mt-2 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
            >
              <option>
                Bình thường
              </option>

              <option>
                Cao
              </option>

              <option>
                Khẩn cấp
              </option>
            </select>

          </div>


          <div>

            <label className="text-sm font-semibold text-slate-700">
              Hạn hoàn thành
            </label>

            <input
              type="date"
              value={dueDate}
              onChange={(e) =>
                setDueDate(
                  e.target.value
                )
              }
              className="mt-2 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
            />

          </div>

        </div>


        {/* ===================================================
            NÚT LƯU
        =================================================== */}

        <div className="mt-6 flex flex-wrap gap-3">

          <button
            type="button"
            onClick={saveTask}
            disabled={
              saving ||
              loadingGroups ||
              loadingProfiles
            }
            className="cursor-pointer rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? editingTaskId !== null
                ? "Đang lưu..."
                : "Đang tạo..."
              : editingTaskId !== null
                ? "Lưu thay đổi"
                : "Tạo nhiệm vụ"}
          </button>

          {editingTaskId !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="cursor-pointer rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Hủy
            </button>
          )}

        </div>

      </div>


      {/* =====================================================
          DANH SÁCH
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">

          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Danh sách nhiệm vụ
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {tasks.length} nhiệm vụ
            </p>
          </div>

        </div>


        {/* LOADING */}

        {loading ? (

          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Đang tải nhiệm vụ...
          </div>

        ) : tasks.length === 0 ? (

          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Chưa có nhiệm vụ nào.
          </div>

        ) : (

          <div className="divide-y divide-slate-100">

            {tasks.map(
              (task, index) => {

                const overdue =
                  isOverdue(task);

                const completed =
                  task.status ===
                  "Đã hoàn thành";

                return (
                  <div
                    key={task.id}
                    className="px-6 py-4 transition hover:bg-slate-50"
                  >

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

                      {/* STT */}

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                        {index + 1}
                      </div>


                      {/* NỘI DUNG */}

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <h4
                            className={`text-sm font-semibold ${
                              completed
                                ? "text-slate-500"
                                : "text-slate-800"
                            }`}
                          >
                            {task.title}
                          </h4>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPriorityStyle(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>

                        </div>


                        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">

                          <span>
                            <span className="text-slate-400">
                              Phụ trách:
                            </span>{" "}
                            <span className="font-medium text-slate-700">
                              {task.assignee ||
                                "Chưa xác định"}
                            </span>
                          </span>

                          <span>
                            <span className="text-slate-400">
                              Đơn vị:
                            </span>{" "}
                            {task.department ||
                              "Chưa xác định"}
                          </span>

                          <span>
                            <span className="text-slate-400">
                              Hạn:
                            </span>{" "}
                            <span
                              className={
                                overdue
                                  ? "font-semibold text-red-600"
                                  : ""
                              }
                            >
                              {formatDate(
                                task.due_date
                              )}
                            </span>
                          </span>

                        </div>

                      </div>


                      {/* TRẠNG THÁI */}

                      <div className="flex shrink-0 items-center">

                        <span
                          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                            overdue
                              ? "bg-red-50 text-red-700"
                              : getStatusStyle(
                                  task.status
                                )
                          }`}
                        >
                          {overdue
                            ? "Quá hạn"
                            : task.status}
                        </span>

                      </div>


                    {/* THAO TÁC */}

<div className="flex shrink-0 items-center gap-2">

{/* CHỈ NHIỆM VỤ CHƯA HOÀN THÀNH MỚI ĐƯỢC SỬA */}

{!completed && (
  <button
    type="button"
    onClick={() => editTask(task)}
    disabled={deletingTaskId === task.id}
    className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
  >
    Sửa
  </button>
)}

{/* NHIỆM VỤ NÀO CŨNG ĐƯỢC XÓA */}

<button
  type="button"
  onClick={() => deleteTask(task)}
  disabled={deletingTaskId === task.id}
  className="cursor-pointer rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
>
  {deletingTaskId === task.id
    ? "Đang xóa..."
    : "Xóa"}
</button>

</div>

                    </div>


                    {/* MÔ TẢ */}

                    {task.description && (
                      <div className="mt-3 ml-0 rounded-lg bg-slate-50 px-4 py-2.5 text-xs leading-5 text-slate-500 lg:ml-12">
                        {task.description}
                      </div>
                    )}


                    {/* HOÀN THÀNH */}

                    {task.completed_at && (
                      <div className="mt-2 ml-0 text-xs text-emerald-600 lg:ml-12">
                        ✓ Đã hoàn thành ngày{" "}
                        {new Date(
                          task.completed_at
                        ).toLocaleDateString(
                          "vi-VN"
                        )}

                        {task.completed_note && (
                          <span className="ml-2 text-slate-400">
                            — Có ghi nhận kết quả
                          </span>
                        )}
                      </div>
                    )}

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>

    </div>
  );
}

