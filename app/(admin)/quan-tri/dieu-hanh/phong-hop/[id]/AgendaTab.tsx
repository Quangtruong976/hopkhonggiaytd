"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AgendaItem = {
  id: number;
  meeting_id: number;
  item_order: number;
  title: string;
  description: string | null;
  presenter: string | null;
  duration_minutes: number | null;
  status: string;
};

type AgendaTabProps = {
  meetingId: number;
};

export default function AgendaTab({
  meetingId,
}: AgendaTabProps) {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [programText, setProgramText] = useState("");

  // ID nội dung đang sửa
  const [editingId, setEditingId] = useState<number | null>(null);

  // Nội dung đang sửa
  const [editingText, setEditingText] = useState("");

  // =========================
  // TẢI CHƯƠNG TRÌNH
  // =========================

  async function loadAgenda() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("meeting_agenda")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("item_order", {
        ascending: true,
      });

    if (error) {
      console.error(error);

      setError(
        `Không thể tải chương trình: ${error.message}`
      );

      setItems([]);
    } else {
      setItems(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAgenda();
  }, [meetingId]);

  // =========================
  // LƯU CHƯƠNG TRÌNH MỚI
  // =========================

  async function saveProgram(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    // Tách từng dòng
    const lines = programText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setError(
        "Vui lòng nhập ít nhất một nội dung chương trình."
      );
      return;
    }

    setSaving(true);

    try {
      // =========================
      // XÁC ĐỊNH SỐ THỨ TỰ TIẾP THEO
      // =========================

      const maxOrder =
        items.length > 0
          ? Math.max(
              ...items.map(
                (item) => item.item_order || 0
              )
            )
          : 0;

      // =========================
      // TẠO CÁC DÒNG MỚI
      // KHÔNG XÓA DỮ LIỆU CŨ
      // =========================

      const rows = lines.map(
        (line, index) => ({
          meeting_id: meetingId,

          item_order:
            maxOrder + index + 1,

          title:
            removeNumberPrefix(line),

          description: null,

          presenter: null,

          duration_minutes: null,

          status: "Chưa thực hiện",
        })
      );

      const {
        error: insertError,
      } = await supabase
        .from("meeting_agenda")
        .insert(rows);

      if (insertError) {
        console.error(insertError);
        throw insertError;
      }

      // =========================
      // THÔNG BÁO
      // =========================

      setMessage(
        `Đã lưu ${lines.length} nội dung chương trình.`
      );

      // Xóa ô nhập sau khi lưu
      setProgramText("");

      // Tải lại danh sách
      await loadAgenda();

    } catch (err) {
      console.error(err);

      if (
        err &&
        typeof err === "object" &&
        "message" in err
      ) {
        setError(
          String(
            (
              err as {
                message?: string;
              }
            ).message
          )
        );
      } else {
        setError(
          "Không thể lưu chương trình cuộc họp."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // BẮT ĐẦU SỬA
  // =========================

  function startEdit(item: AgendaItem) {
    setError("");
    setMessage("");

    setEditingId(item.id);
    setEditingText(item.title);
  }

  // =========================
  // HỦY SỬA
  // =========================

  function cancelEdit() {
    setEditingId(null);
    setEditingText("");
  }

  // =========================
  // LƯU NỘI DUNG ĐANG SỬA
  // =========================

  async function saveEdit(
    id: number
  ) {
    const title =
      removeNumberPrefix(
        editingText.trim()
      );

    if (!title) {
      setError(
        "Vui lòng nhập nội dung chương trình."
      );
      return;
    }

    setError("");
    setMessage("");
    setSaving(true);

    const {
      error: updateError,
    } = await supabase
      .from("meeting_agenda")
      .update({
        title,
      })
      .eq("id", id);

    if (updateError) {
      console.error(
        "LỖI SỬA CHƯƠNG TRÌNH:",
        updateError
      );

      setError(
        `Không thể cập nhật nội dung: ${updateError.message}`
      );

      setSaving(false);
      return;
    }

    setMessage(
      "Đã cập nhật nội dung chương trình."
    );

    setEditingId(null);
    setEditingText("");

    await loadAgenda();

    setSaving(false);
  }

  // =========================
  // XÓA MỘT NỘI DUNG
  // =========================

  async function deleteItem(
    item: AgendaItem
  ) {
    const confirmed =
      window.confirm(
        "Bạn có chắc chắn muốn xóa nội dung chương trình này?"
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const {
      error: deleteError,
    } = await supabase
      .from("meeting_agenda")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      console.error(
        "LỖI XÓA CHƯƠNG TRÌNH:",
        deleteError
      );

      setError(
        `Không thể xóa nội dung: ${deleteError.message}`
      );

      return;
    }

    setMessage(
      "Đã xóa nội dung chương trình."
    );

    await loadAgenda();
  }

  return (
    <div className="space-y-5">

      {/* =========================
          TIÊU ĐỀ
      ========================= */}

      <div>
        <h2 className="text-base font-bold text-emerald-900">
        <span className="text-emerald-900">● </span>
          Chương trình cuộc họp
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Nhập toàn bộ chương trình, mỗi nội dung một dòng.
        </p>
      </div>


      {/* =========================
          THÔNG BÁO
      ========================= */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}


      {/* =========================
          NHẬP CHƯƠNG TRÌNH
      ========================= */}

      <form
        onSubmit={saveProgram}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >

        <div className="flex items-center justify-between gap-3">

          <div>

            <h3 className="text-sm font-bold text-slate-900">
              Nhập chương trình
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Mỗi dòng sẽ trở thành một nội dung trong chương trình.
            </p>

          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">

            {
              programText
                .split(/\r?\n/)
                .filter(
                  (line) =>
                    line.trim()
                ).length
            }{" "}
            dòng

          </div>

        </div>


        <textarea
          value={programText}
          onChange={(event) =>
            setProgramText(
              event.target.value
            )
          }
          rows={10}
          placeholder={`Ví dụ:

Tuyên bố lý do, giới thiệu đại biểu
Thông qua chương trình cuộc họp
Báo cáo tình hình thực hiện nhiệm vụ
Thảo luận các nội dung trọng tâm
Ý kiến của các đại biểu
Chủ trì kết luận cuộc họp
Thông qua các nội dung cần biểu quyết
Bế mạc cuộc họp`}
          className="mt-4 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />


        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs text-slate-400">
            Có thể nhập hoặc dán nhiều dòng cùng lúc.
          </p>

          <button
            type="submit"
            disabled={
              saving ||
              !programText.trim()
            }
            className="cursor-pointer rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Đang lưu..."
              : "Lưu chương trình"}
          </button>

        </div>

      </form>


      {/* =========================
          CHƯƠNG TRÌNH ĐÃ LƯU
      ========================= */}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">

          <div>

            <h3 className="text-sm font-bold text-slate-900">
              Chương trình đã lưu
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {loading
                ? "Đang tải..."
                : `${items.length} nội dung`}
            </p>

          </div>


          {items.length > 0 && (
            <div className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">
              {items.length} mục
            </div>
          )}

        </div>


        {loading ? (

          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Đang tải chương trình...
          </div>

        ) : items.length === 0 ? (

          <div className="px-5 py-10 text-center">

            <div className="text-2xl text-slate-300">
              ☰
            </div>

            <p className="mt-2 text-sm font-medium text-slate-600">
              Chưa có chương trình
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Nhập chương trình ở phía trên để bắt đầu.
            </p>

          </div>

        ) : (

          <div className="divide-y divide-slate-100">

            {items.map((item) => (

              <div
                key={item.id}
                className="px-5 py-3 transition hover:bg-slate-50"
              >

                <div className="flex items-center gap-3">

                  {/* =========================
                      SỐ THỨ TỰ
                  ========================= */}

                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-xs font-bold text-emerald-700">
                    {item.item_order}
                  </div>


                  {/* =========================
                      NỘI DUNG
                  ========================= */}

                  <div className="min-w-0 flex-1">

                    {editingId === item.id ? (

                      <input
                        type="text"
                        value={editingText}
                        onChange={(event) =>
                          setEditingText(
                            event.target.value
                          )
                        }
                        onKeyDown={(event) => {

                          if (
                            event.key ===
                            "Enter"
                          ) {
                            event.preventDefault();

                            saveEdit(
                              item.id
                            );
                          }

                          if (
                            event.key ===
                            "Escape"
                          ) {
                            cancelEdit();
                          }

                        }}
                        autoFocus
                        className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />

                    ) : (

                      <div className="text-sm text-slate-800">
                        {item.title}
                      </div>

                    )}

                  </div>


                  {/* =========================
                      TRẠNG THÁI
                  ========================= */}

                  <div className="hidden shrink-0 sm:block">

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                      Đã lưu
                    </span>

                  </div>


                  {/* =========================
                      THAO TÁC
                  ========================= */}

                  <div className="flex shrink-0 items-center gap-1.5">

                    {editingId === item.id ? (

                      <>

                        {/* LƯU SỬA */}

                        <button
                          type="button"
                          onClick={() =>
                            saveEdit(
                              item.id
                            )
                          }
                          disabled={saving}
                          className="cursor-pointer rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] font-normal text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Lưu
                        </button>


                        {/* HỦY */}

                        <button
                          type="button"
                          onClick={
                            cancelEdit
                          }
                          disabled={saving}
                          className="cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-normal text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Hủy
                        </button>

                      </>

                    ) : (

                      <>

                        {/* =====================
                            SỬA
                        ===================== */}

                        <button
                          type="button"
                          onClick={() =>
                            startEdit(
                              item
                            )
                          }
                          className="cursor-pointer rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-normal text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
                        >
                          ✎ Sửa
                        </button>


                        {/* =====================
                            XÓA
                        ===================== */}

                        <button
                          type="button"
                          onClick={() =>
                            deleteItem(
                              item
                            )
                          }
                          className="cursor-pointer rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-normal text-red-600 transition hover:border-red-300 hover:bg-red-100"
                        >
                          🗑 Xóa
                        </button>

                      </>

                    )}

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>


      {/* =========================
          GHI CHÚ
      ========================= */}

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
        <strong>Lưu ý:</strong> Chương trình được trình bày theo
        thứ tự từ trên xuống dưới. Mỗi dòng tương ứng với một
        nội dung để đại biểu dễ theo dõi diễn biến cuộc họp.
      </div>

    </div>
  );
}


// =========================
// LOẠI BỎ SỐ THỨ TỰ NẾU NGƯỜI DÙNG TỰ NHẬP
// =========================

function removeNumberPrefix(
  text: string
) {
  return text
    .replace(
      /^\s*(?:\d+[\.\):\-]|[a-zA-Z][\.\):\-])\s*/,
      ""
    )
    .trim();
}

