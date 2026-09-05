"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Minute = {
  id: number;
  meeting_id: number;
  title: string;
  content: string | null;
  recorder: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

type MinutesTabProps = {
  meetingId: number;
};

export default function MinutesTab({
  meetingId,
}: MinutesTabProps) {
  const [minute, setMinute] =
    useState<Minute | null>(null);

  const [title, setTitle] =
    useState("Biên bản cuộc họp");

  const [content, setContent] =
    useState("");

  const [recorder, setRecorder] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function loadMinute() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("meeting_minutes")
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
        `Không thể tải biên bản: ${error.message}`
      );
    } else if (data) {
      setMinute(data);
      setTitle(data.title || "Biên bản cuộc họp");
      setContent(data.content || "");
      setRecorder(data.recorder || "");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMinute();
  }, [meetingId]);

  async function saveDraft() {
    if (!content.trim()) {
      setError("Vui lòng nhập nội dung biên bản.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    if (minute) {
      const { error } = await supabase
        .from("meeting_minutes")
        .update({
          title: title.trim() || "Biên bản cuộc họp",
          content: content.trim(),
          recorder: recorder.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", minute.id);

      if (error) {
        console.error(error);

        setError(
          `Không thể lưu biên bản: ${error.message}`
        );

        setSaving(false);
        return;
      }

      setMessage("Đã lưu biên bản.");

    } else {
      const { data, error } = await supabase
        .from("meeting_minutes")
        .insert({
          meeting_id: meetingId,
          title:
            title.trim() || "Biên bản cuộc họp",
          content: content.trim(),
          recorder:
            recorder.trim() || null,
          status: "Bản nháp",
        })
        .select()
        .single();

      if (error) {
        console.error(error);

        setError(
          `Không thể tạo biên bản: ${error.message}`
        );

        setSaving(false);
        return;
      }

      setMinute(data);
      setMessage("Đã tạo và lưu biên bản.");
    }

    await loadMinute();

    setSaving(false);
  }

  async function submitForApproval() {
    if (!minute) {
      setError(
        "Vui lòng lưu biên bản trước khi trình duyệt."
      );
      return;
    }

    if (!content.trim()) {
      setError("Nội dung biên bản không được để trống.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("meeting_minutes")
      .update({
        title:
          title.trim() || "Biên bản cuộc họp",
        content: content.trim(),
        recorder:
          recorder.trim() || null,
        status: "Chờ duyệt",
        updated_at: new Date().toISOString(),
      })
      .eq("id", minute.id);

    if (error) {
      console.error(error);

      setError(
        `Không thể trình duyệt: ${error.message}`
      );

      setSaving(false);
      return;
    }

    setMessage(
      "Đã chuyển biên bản sang trạng thái chờ duyệt."
    );

    await loadMinute();

    setSaving(false);
  }

  async function approveMinute() {
    if (!minute) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("meeting_minutes")
      .update({
        status: "Đã duyệt",
        approved_by: "Quản trị viên",
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", minute.id)
      .eq("status", "Chờ duyệt");

    if (error) {
      console.error(error);

      setError(
        `Không thể duyệt biên bản: ${error.message}`
      );

      setSaving(false);
      return;
    }

    setMessage("Đã duyệt biên bản thành công.");

    await loadMinute();

    setSaving(false);
  }
  function downloadMinute() {
    if (!content.trim()) {
      setError("Chưa có nội dung biên bản để tải.");
      return;
    }
  
    const html = `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="UTF-8">
  <style>
  body {
    font-family: "Times New Roman", serif;
    font-size: 13pt;
    line-height: 1.6;
    margin: 2.5cm;
  }
  .title {
    text-align: center;
    font-size: 16pt;
    font-weight: bold;
    margin-bottom: 20px;
  }
  .info {
    margin-bottom: 20px;
  }
  .content {
    white-space: pre-wrap;
    text-align: justify;
  }
  </style>
  </head>
  
  <body>
  
  <div class="title">
  ${escapeHtml(title || "BIÊN BẢN CUỘC HỌP")}
  </div>
  
  <div class="info">
  <strong>Người ghi biên bản:</strong>
  ${escapeHtml(recorder || "Chưa xác định")}
  </div>
  
  <div class="content">
  ${escapeHtml(content)}
  </div>
  
  </body>
  </html>
  `;
  
    const blob = new Blob(
      ["\ufeff", html],
      {
        type: "application/msword",
      }
    );
  
    const url = URL.createObjectURL(blob);
  
    const link = document.createElement("a");
  
    link.href = url;
    link.download = `${title || "Bien-ban-cuoc-hop"}.doc`;
  
    document.body.appendChild(link);
  
    link.click();
  
    document.body.removeChild(link);
  
    URL.revokeObjectURL(url);
  }
  
  function escapeHtml(text: string) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function statusStyle(status: string) {
    switch (status) {
      case "Đã duyệt":
        return "bg-emerald-50 text-emerald-700";

      case "Chờ duyệt":
        return "bg-blue-50 text-blue-700";

      default:
        return "bg-amber-50 text-amber-700";
    }
  }

  function formatDateTime(
    date: string | null
  ) {
    if (!date) return "";

    return new Date(date).toLocaleString(
      "vi-VN"
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Đang tải biên bản...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* TIÊU ĐỀ */}

      <div>
      <h2 className="text-base font-bold text-emerald-900">
      <span className="text-emerald-900">● </span>
          Biên bản cuộc họp
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Soạn thảo, lưu và duyệt biên bản chính thức của cuộc họp.
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

      {/* TRẠNG THÁI */}

      {minute && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <span className="text-sm font-semibold text-slate-700">
            Trạng thái:
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
              minute.status
            )}`}
          >
            {minute.status}
          </span>

          {minute.approved_at && (
            <span className="text-xs text-slate-500">
              Đã duyệt bởi{" "}
              <strong>
                {minute.approved_by}
              </strong>{" "}
              lúc{" "}
              {formatDateTime(
                minute.approved_at
              )}
            </span>
          )}

        </div>
      )}

      {/* SOẠN BIÊN BẢN */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <h3 className="text-lg font-bold text-slate-900">
          Nội dung biên bản
        </h3>

        <div className="mt-5">

          <label className="text-sm font-semibold text-slate-700">
            Tên biên bản
          </label>

          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            disabled={
              minute?.status === "Đã duyệt"
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
          />

        </div>

        <div className="mt-5">

          <label className="text-sm font-semibold text-slate-700">
            Người ghi biên bản
          </label>

          <input
            value={recorder}
            onChange={(e) =>
              setRecorder(e.target.value)
            }
            disabled={
              minute?.status === "Đã duyệt"
            }
            placeholder="Họ và tên"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
          />

        </div>

        <div className="mt-5">

          <label className="text-sm font-semibold text-slate-700">
            Nội dung
          </label>

          <textarea
            value={content}
            onChange={(e) =>
              setContent(e.target.value)
            }
            disabled={
              minute?.status === "Đã duyệt"
            }
            rows={18}
            placeholder="Nhập nội dung biên bản cuộc họp..."
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-emerald-500 disabled:bg-slate-50"
          />

        </div>

        {/* NÚT */}

        {minute?.status !== "Đã duyệt" && (
          <div className="mt-6 flex flex-wrap gap-3">

            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving
                ? "Đang lưu..."
                : "Lưu bản nháp"}
            </button>

            {minute?.status === "Bản nháp" && (
              <button
                type="button"
                onClick={submitForApproval}
                disabled={saving}
                className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                Trình duyệt
              </button>
            )}

            {minute?.status === "Chờ duyệt" && (
              <button
                type="button"
                onClick={approveMinute}
                disabled={saving}
                className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                ✓ Duyệt biên bản
              </button>
            )}

          </div>
        )}
{minute && (
  <div className="mt-4">
  <button
  type="button"
  onClick={downloadMinute}
  className="rounded-xl px-5 py-3 text-sm font-semibold text-white"
  style={{ backgroundColor: "rgb(5, 121, 84)" }}
>
  ⬇ Tải biên bản
</button>
  </div>
)}
      </div>

      {/* THÔNG TIN */}

      {minute && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

          <div className="text-sm text-slate-600">
            Biên bản được tạo ngày{" "}
            <strong>
              {formatDateTime(
                minute.created_at
              )}
            </strong>
          </div>

          <div className="mt-1 text-sm text-slate-600">
            Cập nhật lần cuối{" "}
            <strong>
              {formatDateTime(
                minute.updated_at
              )}
            </strong>
          </div>

        </div>
      )}

    </div>
  );
}