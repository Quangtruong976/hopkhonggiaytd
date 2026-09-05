"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Conclusion = {
  id: number;
  meeting_id: number;
  conclusion_number: string | null;
  title: string;
  content: string;
  issued_by: string | null;
  issued_at: string | null;
  file_name: string | null;
  file_path: string | null;
  status: string;
};

type ConclusionTabProps = {
  meetingId: number;
};

export default function ConclusionTab({
  meetingId,
}: ConclusionTabProps) {
  const [conclusion, setConclusion] =
    useState<Conclusion | null>(null);

  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [issuedBy, setIssuedBy] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);

const [taskTitle, setTaskTitle] = useState("");
const [taskDescription, setTaskDescription] = useState("");
const [taskAssignee, setTaskAssignee] = useState("");
const [taskDepartment, setTaskDepartment] = useState("");
const [taskPriority, setTaskPriority] =
  useState("Bình thường");
const [taskDueDate, setTaskDueDate] = useState("");

const [creatingTask, setCreatingTask] = useState(false);

  async function loadConclusion() {
    setLoading(true);

    const { data, error } = await supabase
      .from("meeting_conclusions")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(error);
      setError(
        `Không thể tải kết luận: ${error.message}`
      );
    } else if (data) {
      setConclusion(data);
      setNumber(data.conclusion_number || "");
      setTitle(data.title || "");
      setContent(data.content || "");
      setIssuedBy(data.issued_by || "");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadConclusion();
  }, [meetingId]);

  async function saveConclusion() {
    if (!title.trim()) {
      setError("Vui lòng nhập tên kết luận.");
      return;
    }

    if (!content.trim()) {
      setError("Vui lòng nhập nội dung kết luận.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      meeting_id: meetingId,
      conclusion_number: number.trim() || null,
      title: title.trim(),
      content: content.trim(),
      issued_by: issuedBy.trim() || null,
      status: "Dự thảo",
      updated_at: new Date().toISOString(),
    };

    let result;

    if (conclusion) {
      result = await supabase
        .from("meeting_conclusions")
        .update(payload)
        .eq("id", conclusion.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("meeting_conclusions")
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      console.error(result.error);

      setError(
        `Không thể lưu kết luận: ${result.error.message}`
      );

      setSaving(false);
      return;
    }

    setConclusion(result.data);

    setMessage(
      "Đã lưu kết luận cuộc họp."
    );

    setSaving(false);
  }

  async function issueConclusion() {
    if (!conclusion) {
      setError(
        "Vui lòng lưu kết luận trước khi ban hành."
      );
      return;
    }

    setError("");
    setMessage("");

    const { data, error } = await supabase
      .from("meeting_conclusions")
      .update({
        status: "Đã ban hành",
        issued_at: new Date().toISOString(),
        issued_by:
          issuedBy.trim() ||
          "Quản trị viên",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conclusion.id)
      .select()
      .single();

    if (error) {
      console.error(error);

      setError(
        `Không thể ban hành kết luận: ${error.message}`
      );

      return;
    }

    setConclusion(data);

    setMessage(
      "Đã ban hành kết luận cuộc họp."
    );
  }
  async function createTaskFromConclusion() {
    if (!conclusion) {
      setError(
        "Vui lòng lưu kết luận trước khi tạo nhiệm vụ."
      );
      return;
    }
  
    if (!taskTitle.trim()) {
      setError("Vui lòng nhập nội dung nhiệm vụ.");
      return;
    }
  
    if (!taskAssignee.trim()) {
      setError("Vui lòng nhập người phụ trách.");
      return;
    }
  
    if (!taskDepartment.trim()) {
      setError("Vui lòng nhập đơn vị phụ trách.");
      return;
    }
  
    if (!taskDueDate) {
      setError("Vui lòng chọn hạn hoàn thành.");
      return;
    }
  
    setCreatingTask(true);
    setError("");
    setMessage("");
  
    const { error } = await supabase
      .from("meeting_tasks")
      .insert({
        meeting_id: meetingId,
        conclusion_id: conclusion.id,
        title: taskTitle.trim(),
        description:
          taskDescription.trim() || null,
        assignee: taskAssignee.trim(),
        department: taskDepartment.trim(),
        priority: taskPriority,
        due_date: taskDueDate,
        status: "Chưa thực hiện",
      });
  
    if (error) {
      console.error(error);
  
      setError(
        `Không thể tạo nhiệm vụ: ${error.message}`
      );
  
      setCreatingTask(false);
      return;
    }
  
    setMessage(
      "Đã tạo nhiệm vụ từ kết luận thành công."
    );
  
    setTaskTitle("");
    setTaskDescription("");
    setTaskAssignee("");
    setTaskDepartment("");
    setTaskPriority("Bình thường");
    setTaskDueDate("");
    setShowTaskForm(false);
  
    setCreatingTask(false);
  }
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Đang tải kết luận...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* TIÊU ĐỀ */}

      <div>
      <h2 className="text-base font-bold text-emerald-900">
      <span className="text-emerald-900">● </span>
          Kết luận cuộc họp
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Soạn thảo, lưu và ban hành kết luận sau cuộc họp.
        </p>
      </div>

      {/* THÔNG BÁO */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* FORM */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="grid gap-5 md:grid-cols-2">

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Số kết luận
            </label>

            <input
              value={number}
              onChange={(e) =>
                setNumber(e.target.value)
              }
              placeholder="Ví dụ: 15-KL/TĐTN"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Người ban hành
            </label>

            <input
              value={issuedBy}
              onChange={(e) =>
                setIssuedBy(e.target.value)
              }
              placeholder="Ví dụ: Bí thư Tỉnh đoàn"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold text-slate-700">
            Tên kết luận
          </label>

          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="Ví dụ: Kết luận cuộc họp Ban Thường vụ Tỉnh đoàn tháng 8/2026"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold text-slate-700">
            Nội dung kết luận
          </label>

          <textarea
            value={content}
            onChange={(e) =>
              setContent(e.target.value)
            }
            rows={12}
            placeholder="Nhập nội dung kết luận của cuộc họp..."
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">

          <button
            type="button"
            onClick={saveConclusion}
            disabled={saving}
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {saving
              ? "Đang lưu..."
              : "Lưu kết luận"}
          </button>

          {conclusion &&
            conclusion.status !== "Đã ban hành" && (
              <button
                type="button"
                onClick={issueConclusion}
                className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Ban hành kết luận
              </button>
            )}

        </div>

      </div>
{/* NHIỆM VỤ TỪ KẾT LUẬN */}

{conclusion && (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Nhiệm vụ từ kết luận
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Tạo nhiệm vụ trực tiếp từ kết luận này.
          Nhiệm vụ sẽ được liên kết tự động với kết luận.
        </p>
      </div>

      {!showTaskForm && (
        <button
          type="button"
          onClick={() => {
            setShowTaskForm(true);
            setError("");
            setMessage("");
          }}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Tạo nhiệm vụ
        </button>
      )}

    </div>

    {showTaskForm && (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">

        <h4 className="font-bold text-emerald-900">
          Tạo nhiệm vụ từ kết luận
        </h4>

        <div className="mt-5">

          <label className="text-sm font-semibold text-slate-700">
            Nội dung nhiệm vụ
          </label>

          <input
            value={taskTitle}
            onChange={(e) =>
              setTaskTitle(e.target.value)
            }
            placeholder="Ví dụ: Hoàn thiện kế hoạch theo kết luận"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />

        </div>

        <div className="mt-5">

          <label className="text-sm font-semibold text-slate-700">
            Nội dung chi tiết
          </label>

          <textarea
            value={taskDescription}
            onChange={(e) =>
              setTaskDescription(e.target.value)
            }
            rows={4}
            placeholder="Mô tả yêu cầu thực hiện..."
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />

        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">

          <div>

            <label className="text-sm font-semibold text-slate-700">
              Người phụ trách
            </label>

            <input
              value={taskAssignee}
              onChange={(e) =>
                setTaskAssignee(e.target.value)
              }
              placeholder="Ví dụ: Nguyễn Văn A"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />

          </div>

          <div>

            <label className="text-sm font-semibold text-slate-700">
              Đơn vị phụ trách
            </label>

            <input
              value={taskDepartment}
              onChange={(e) =>
                setTaskDepartment(e.target.value)
              }
              placeholder="Ví dụ: Ban Phong trào"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />

          </div>

        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">

          <div>

            <label className="text-sm font-semibold text-slate-700">
              Mức độ ưu tiên
            </label>

            <select
              value={taskPriority}
              onChange={(e) =>
                setTaskPriority(e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
            >
              <option>Bình thường</option>
              <option>Cao</option>
              <option>Khẩn cấp</option>
            </select>

          </div>

          <div>

            <label className="text-sm font-semibold text-slate-700">
              Hạn hoàn thành
            </label>

            <input
              type="date"
              value={taskDueDate}
              onChange={(e) =>
                setTaskDueDate(e.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />

          </div>

        </div>

        <div className="mt-5 flex flex-wrap gap-3">

          <button
            type="button"
            onClick={createTaskFromConclusion}
            disabled={creatingTask}
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {creatingTask
              ? "Đang tạo..."
              : "Lưu nhiệm vụ"}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowTaskForm(false);
              setError("");
            }}
            disabled={creatingTask}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Hủy
          </button>

        </div>

      </div>
    )}

  </div>
)}
      {/* TRẠNG THÁI */}

      {conclusion && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <div className="text-sm text-slate-500">
                Trạng thái
              </div>

              <div className="mt-2">
                <span
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    conclusion.status === "Đã ban hành"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {conclusion.status}
                </span>
              </div>
            </div>

            {conclusion.issued_at && (
              <div className="text-sm text-slate-500">
                Ban hành ngày{" "}
                {new Date(
                  conclusion.issued_at
                ).toLocaleDateString("vi-VN")}
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}