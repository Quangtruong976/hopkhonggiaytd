"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

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
  status: string | null;
  created_at: string;
  updated_at: string;
};

type ConclusionTabProps = {
  meetingId: number;
};

/* =========================================================
   PAGE
========================================================= */

export default function ConclusionTab({
  meetingId,
}: ConclusionTabProps) {
  const router = useRouter();

  /* =======================================================
     DATA
  ======================================================= */

  const [conclusions, setConclusions] =
    useState<Conclusion[]>([]);

  /* =======================================================
     FORM
  ======================================================= */

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [number, setNumber] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [content, setContent] =
    useState("");

  const [issuedBy, setIssuedBy] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  /* =======================================================
     DETAIL
  ======================================================= */

  const [viewingConclusion, setViewingConclusion] =
    useState<Conclusion | null>(null);

  /* =======================================================
     STATE
  ======================================================= */

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [issuingId, setIssuingId] =
    useState<number | null>(null);

  const [openingFileId, setOpeningFileId] =
    useState<number | null>(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /* =========================================================
     LOAD
  ========================================================= */

  async function loadConclusions() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("meeting_conclusions")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      setError(
        `Không thể tải danh sách kết luận: ${error.message}`
      );

      setConclusions([]);
    } else {
      setConclusions(
        (data || []) as Conclusion[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadConclusions();
  }, [meetingId]);

  /* =========================================================
     RESET FORM
  ========================================================= */

  function resetForm() {
    setEditingId(null);
    setNumber("");
    setTitle("");
    setContent("");
    setIssuedBy("");
    setSelectedFile(null);
  }

  /* =========================================================
     START EDIT
  ========================================================= */

  function editConclusion(
    conclusion: Conclusion
  ) {
    setEditingId(conclusion.id);

    setNumber(
      conclusion.conclusion_number || ""
    );

    setTitle(conclusion.title || "");

    setContent(
      conclusion.content || ""
    );

    setIssuedBy(
      conclusion.issued_by || ""
    );

    setSelectedFile(null);

    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =========================================================
     SAVE
  ========================================================= */

  async function saveConclusion() {
    setError("");
    setMessage("");

    if (!title.trim()) {
      setError(
        "Vui lòng nhập tên kết luận."
      );
      return;
    }

    if (!content.trim()) {
      setError(
        "Vui lòng nhập nội dung kết luận."
      );
      return;
    }

    setSaving(true);

    let conclusionId = editingId;

    /* =======================================================
       CREATE / UPDATE DATA
    ======================================================= */

    if (editingId !== null) {
      const { data, error } =
        await supabase
          .from("meeting_conclusions")
          .update({
            conclusion_number:
              number.trim() || null,

            title: title.trim(),

            content: content.trim(),

            issued_by:
              issuedBy.trim() || null,

            updated_at:
              new Date().toISOString(),
          })
          .eq("id", editingId)
          .eq("meeting_id", meetingId)
          .select()
          .single();

      if (error) {
        console.error(error);

        setError(
          `Không thể cập nhật kết luận: ${error.message}`
        );

        setSaving(false);
        return;
      }

      conclusionId = data.id;

      /*
       * Nếu kết luận đã ban hành thì giữ nguyên trạng thái.
       */

      setMessage(
        "Đã cập nhật kết luận."
      );
    } else {
      const { data, error } =
        await supabase
          .from("meeting_conclusions")
          .insert({
            meeting_id: meetingId,

            conclusion_number:
              number.trim() || null,

            title: title.trim(),

            content: content.trim(),

            issued_by:
              issuedBy.trim() || null,

            status: "Dự thảo",
          })
          .select()
          .single();

      if (error) {
        console.error(error);

        setError(
          `Không thể tạo kết luận: ${error.message}`
        );

        setSaving(false);
        return;
      }

      conclusionId = data.id;

      setMessage(
        "Đã lưu kết luận mới."
      );
    }

    /* =======================================================
       UPLOAD FILE
    ======================================================= */

    if (selectedFile && conclusionId) {
      const safeName =
        selectedFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

      const filePath =
        `conclusions/${meetingId}/${conclusionId}/${Date.now()}-${safeName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("meeting-documents")
          .upload(
            filePath,
            selectedFile,
            {
              upsert: true,
            }
          );

      if (uploadError) {
        console.error(uploadError);

        setError(
          `Đã lưu kết luận nhưng không thể tải file: ${uploadError.message}`
        );

        await loadConclusions();

        resetForm();
        setSaving(false);

        return;
      }

      const { error: fileUpdateError } =
        await supabase
          .from("meeting_conclusions")
          .update({
            file_name:
              selectedFile.name,

            file_path:
              filePath,

            updated_at:
              new Date().toISOString(),
          })
          .eq("id", conclusionId)
          .eq("meeting_id", meetingId);

      if (fileUpdateError) {
        console.error(fileUpdateError);

        setError(
          `Đã tải file nhưng không thể cập nhật thông tin file: ${fileUpdateError.message}`
        );

        await loadConclusions();

        resetForm();
        setSaving(false);

        return;
      }

      setMessage(
        "Đã lưu kết luận và file đính kèm."
      );
    }

    await loadConclusions();

    resetForm();

    setSaving(false);
  }

  /* =========================================================
     ISSUE
  ========================================================= */

  async function issueConclusion(
    conclusion: Conclusion
  ) {
    if (
      conclusion.status ===
      "Đã ban hành"
    ) {
      return;
    }

    setIssuingId(conclusion.id);
    setError("");
    setMessage("");

    const { data, error } =
      await supabase
        .from("meeting_conclusions")
        .update({
          status: "Đã ban hành",

          issued_at:
            new Date().toISOString(),

          issued_by:
            conclusion.issued_by ||
            issuedBy.trim() ||
            "Quản trị viên",

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", conclusion.id)
        .eq("meeting_id", meetingId)
        .select()
        .single();

    if (error) {
      console.error(error);

      setError(
        `Không thể ban hành kết luận: ${error.message}`
      );

      setIssuingId(null);
      return;
    }

    setConclusions((current) =>
      current.map((item) =>
        item.id === data.id
          ? data
          : item
      )
    );

    setMessage(
      "Đã ban hành kết luận."
    );

    setIssuingId(null);
  }

  /* =========================================================
     DELETE
  ========================================================= */

  async function deleteConclusion(
    conclusion: Conclusion
  ) {
    const confirmed =
      window.confirm(
        `Bạn có chắc chắn muốn xóa kết luận "${conclusion.title}" không?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(conclusion.id);
    setError("");
    setMessage("");

    /*
     * Không tự động xóa nhiệm vụ liên kết.
     * Nếu đã có nhiệm vụ tham chiếu đến kết luận,
     * database sẽ bảo vệ quan hệ dữ liệu.
     */

    const { error } =
      await supabase
        .from("meeting_conclusions")
        .delete()
        .eq("id", conclusion.id)
        .eq("meeting_id", meetingId);

    if (error) {
      console.error(error);

      setError(
        `Không thể xóa kết luận: ${error.message}`
      );

      setDeletingId(null);
      return;
    }

    setMessage(
      "Đã xóa kết luận."
    );

    await loadConclusions();

    if (
      viewingConclusion?.id ===
      conclusion.id
    ) {
      setViewingConclusion(null);
    }

    setDeletingId(null);
  }

  /* =========================================================
     OPEN FILE
  ========================================================= */

  async function openFile(
    conclusion: Conclusion
  ) {
    if (!conclusion.file_path) {
      return;
    }

    setOpeningFileId(conclusion.id);
    setError("");

    const { data, error } =
      await supabase.storage
        .from("meeting-documents")
        .createSignedUrl(
          conclusion.file_path,
          300
        );

    if (error) {
      console.error(error);

      setError(
        `Không thể mở file: ${error.message}`
      );

      setOpeningFileId(null);
      return;
    }

    window.open(
      data.signedUrl,
      "_blank",
      "noopener,noreferrer"
    );

    setOpeningFileId(null);
  }

  /* =========================================================
     STATUS
  ========================================================= */

  function getStatusStyle(
    status: string | null
  ) {
    if (status === "Đã ban hành") {
      return "bg-blue-50 text-blue-700";
    }

    if (status === "Đã thu hồi") {
      return "bg-red-50 text-red-700";
    }

    return "bg-amber-50 text-amber-700";
  }

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
      date
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
     RENDER
  ========================================================= */

  return (
    <div className="space-y-5">

      {/* =====================================================
          TITLE
      ===================================================== */}

      <div>
        <h2 className="text-base font-bold text-emerald-900">
          <span className="text-emerald-900">
            ●{" "}
          </span>
          Kết luận cuộc họp
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Quản lý các kết luận được ban hành sau cuộc họp.
        </p>
      </div>


      {/* =====================================================
          MESSAGE
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
          FORM
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex items-center justify-between gap-3">

          <div>
            <h3 className="text-base font-bold text-slate-900">
              {editingId !== null
                ? "Sửa kết luận"
                : "Thêm kết luận"}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {editingId !== null
                ? "Cập nhật nội dung kết luận."
                : "Tạo kết luận mới cho cuộc họp."}
            </p>
          </div>

          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy sửa
            </button>
          )}

        </div>


        <div className="mt-5 grid gap-4 md:grid-cols-2">

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


        <div className="mt-4">
          <label className="text-sm font-semibold text-slate-700">
            Nội dung / tên kết luận
          </label>

          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="Ví dụ: Kết luận cuộc họp Ban Thường vụ Tỉnh đoàn tháng 9/2026"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>


        <div className="mt-4">
          <label className="text-sm font-semibold text-slate-700">
            Nội dung kết luận
          </label>

          <textarea
            value={content}
            onChange={(e) =>
              setContent(e.target.value)
            }
            rows={8}
            placeholder="Nhập nội dung kết luận của cuộc họp..."
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-500"
          />
        </div>


        <div className="mt-4">
          <label className="text-sm font-semibold text-slate-700">
            File kết luận
          </label>

          <input
            type="file"
            onChange={(e) =>
              setSelectedFile(
                e.target.files?.[0] ||
                  null
              )
            }
            className="mt-2 block w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          />

          {selectedFile && (
            <p className="mt-2 text-xs text-slate-500">
              File mới:{" "}
              {selectedFile.name}
            </p>
          )}
        </div>


        <div className="mt-5 flex flex-wrap gap-3">

          <button
            type="button"
            onClick={saveConclusion}
            disabled={saving}
            className="cursor-pointer rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Đang lưu..."
              : editingId !== null
                ? "Lưu thay đổi"
                : "Lưu kết luận"}
          </button>

          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="cursor-pointer rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
          )}

        </div>

      </div>


      {/* =====================================================
          DANH SÁCH KẾT LUẬN
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

          <div>
            <h3 className="text-base font-bold text-slate-900">
              Danh sách kết luận
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {conclusions.length} kết luận
            </p>
          </div>

        </div>


        {loading ? (

          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Đang tải danh sách kết luận...
          </div>

        ) : conclusions.length === 0 ? (

          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Chưa có kết luận nào.
          </div>

        ) : (

          <div className="w-full overflow-hidden">

<table className="w-full table-fixed border-collapse">

<thead className="bg-slate-50">
  <tr className="border-b border-slate-200">
    <th className="w-[42%] px-3 py-2 text-left text-[11px] font-semibold text-slate-600">
      Nội dung kết luận
    </th>

    <th className="w-[12%] px-2 py-2 text-center text-[11px] font-semibold text-slate-600">
      Trạng thái
    </th>

    <th className="w-[14%] px-2 py-2 text-left text-[11px] font-semibold text-slate-600">
      Người ban hành
    </th>

    <th className="w-[12%] px-2 py-2 text-center text-[11px] font-semibold text-slate-600">
      Ngày ban hành
    </th>

    <th className="w-[20%] px-2 py-2 text-center text-[11px] font-semibold text-slate-600">
      Thao tác
    </th>
  </tr>
</thead>

              <tbody className="divide-y divide-slate-100">

                {conclusions.map(
                  (conclusion) => (

                    <tr
                      key={conclusion.id}
                      className="align-top transition hover:bg-slate-50"
                    >

                      {/* NỘI DUNG */}

                      <td className="px-4 py-4">

                        <div className="font-semibold text-slate-800">
                          {conclusion.conclusion_number && (
                            <span className="mr-2 text-slate-500">
                              {conclusion.conclusion_number}
                            </span>
                          )}

                          {conclusion.title}
                        </div>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {conclusion.content}
                        </p>

                        {conclusion.file_name && (
                          <div className="mt-2 text-xs text-blue-600">
                            📎{" "}
                            {conclusion.file_name}
                          </div>
                        )}

                      </td>


                      {/* TRẠNG THÁI */}

                      <td className="px-4 py-4">

                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ${getStatusStyle(
                            conclusion.status
                          )}`}
                        >
                          {conclusion.status ||
                            "Dự thảo"}
                        </span>

                      </td>


                      {/* NGƯỜI BAN HÀNH */}

                      <td className="px-4 py-4 text-xs text-slate-600">

                        {conclusion.issued_by ||
                          "—"}

                      </td>


                      {/* NGÀY */}

                      <td className="px-4 py-4 text-xs text-slate-600">

                        {formatDate(
                          conclusion.issued_at
                        )}

                      </td>


                      {/* THAO TÁC */}

                      <td className="px-4 py-4">

                        <div className="flex flex-wrap justify-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              setViewingConclusion(
                                conclusion
                              )
                            }
                            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Xem
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              editConclusion(
                                conclusion
                              )
                            }
                            className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Sửa
                          </button>


                          {conclusion.status !==
                            "Đã ban hành" && (
                            <button
                              type="button"
                              onClick={() =>
                                issueConclusion(
                                  conclusion
                                )
                              }
                              disabled={
                                issuingId ===
                                conclusion.id
                              }
                              className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {issuingId ===
                              conclusion.id
                                ? "..."
                                : "Ban hành"}
                            </button>
                          )}


                          {conclusion.file_path && (
                            <button
                              type="button"
                              onClick={() =>
                                openFile(
                                  conclusion
                                )
                              }
                              disabled={
                                openingFileId ===
                                conclusion.id
                              }
                              className="cursor-pointer rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {openingFileId ===
                              conclusion.id
                                ? "..."
                                : "File"}
                            </button>
                          )}


                          <button
                            type="button"
                            onClick={() => {
                              /*
                               * Chuyển sang khu vực Nhiệm vụ
                               * và truyền kết luận đang chọn.
                               *
                               * TasksTab sẽ đọc
                               * conclusion_id từ URL.
                               */
                              router.push(
                                `/quan-tri/dieu-hanh/phong-hop/${meetingId}?tab=tasks&conclusion_id=${conclusion.id}`
                              );
                            }}
                            className="cursor-pointer rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                          >
                            Tạo nhiệm vụ
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              deleteConclusion(
                                conclusion
                              )
                            }
                            disabled={
                              deletingId ===
                              conclusion.id
                            }
                            className="cursor-pointer rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId ===
                            conclusion.id
                              ? "..."
                              : "Xóa"}
                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      {viewingConclusion && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">

            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div className="min-w-0">

                <h3 className="truncate text-base font-bold text-slate-900">
                  {viewingConclusion.title}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {viewingConclusion.conclusion_number ||
                    "Kết luận cuộc họp"}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setViewingConclusion(null)
                }
                className="cursor-pointer rounded-lg px-3 py-2 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>

            </div>


            <div className="space-y-5 p-5">

              <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">

                <div>
                  <div className="text-xs text-slate-400">
                    Trạng thái
                  </div>

                  <div className="mt-1">
                    <span
                      className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ${getStatusStyle(
                        viewingConclusion.status
                      )}`}
                    >
                      {viewingConclusion.status ||
                        "Dự thảo"}
                    </span>
                  </div>
                </div>


                <div>
                  <div className="text-xs text-slate-400">
                    Người ban hành
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    {viewingConclusion.issued_by ||
                      "—"}
                  </div>
                </div>


                <div>
                  <div className="text-xs text-slate-400">
                    Ngày ban hành
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    {formatDate(
                      viewingConclusion.issued_at
                    )}
                  </div>
                </div>

              </div>


              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Nội dung kết luận
                </h4>

                <div className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
                  {viewingConclusion.content}
                </div>
              </div>


              {viewingConclusion.file_name && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

                  <div className="text-xs text-blue-600">
                    File kết luận
                  </div>

                  <div className="mt-1 flex flex-wrap items-center justify-between gap-3">

                    <span className="text-sm font-semibold text-blue-800">
                      {viewingConclusion.file_name}
                    </span>

                    {viewingConclusion.file_path && (
                      <button
                        type="button"
                        onClick={() =>
                          openFile(
                            viewingConclusion
                          )
                        }
                        className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Mở file
                      </button>
                    )}

                  </div>

                </div>
              )}


              <div className="flex flex-wrap justify-end gap-2">

                <button
                  type="button"
                  onClick={() => {
                    setViewingConclusion(null);

                    router.push(
                      `/dieu-hanh/phong-hop/${meetingId}?tab=nhiem-vu&conclusion_id=${viewingConclusion.id}`
                    );
                  }}
                  className="cursor-pointer rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Tạo nhiệm vụ từ kết luận
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewingConclusion(null)
                  }
                  className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

