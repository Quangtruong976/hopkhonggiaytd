"use client";

import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPE
========================================================= */

type DocumentItem = {
  id: number;
  meeting_id: number;
  name: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  status: string | null;
  uploaded_by: string | null;
  created_at: string;
  published_at: string | null;
  published_by: string | null;
};

type DocumentsTabProps = {
  meetingId: number;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function DocumentsTab({
  meetingId,
}: DocumentsTabProps) {
  const [file, setFile] =
    useState<File | null>(null);

  const [documents, setDocuments] =
    useState<DocumentItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /* =======================================================
     SỬA TÊN
  ======================================================= */

  const [editingDocumentId, setEditingDocumentId] =
    useState<number | null>(null);

  const [editingName, setEditingName] =
    useState("");

  const [savingName, setSavingName] =
    useState(false);

  /* =======================================================
     TẢI DANH SÁCH TÀI LIỆU
     
     Tài liệu tải lên trước đứng trước.
     Tài liệu tải lên sau đứng sau.
  ======================================================= */

  async function loadDocuments() {
    setLoading(true);
    setError("");

    const { data, error } =
      await supabase
        .from("meeting_documents")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", {
          ascending: true,
        });

    if (error) {
      console.error(
        "LỖI TẢI TÀI LIỆU:",
        error
      );

      setError(
        `Không thể tải danh sách tài liệu: ${error.message}`
      );

      setDocuments([]);
    } else {
      setDocuments(
        (data || []) as DocumentItem[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDocuments();
  }, [meetingId]);

  /* =======================================================
     CHỌN FILE
  ======================================================= */

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setFile(selectedFile);
    setMessage("");
    setError("");

    if (!selectedFile) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    if (
      !allowedTypes.includes(
        selectedFile.type
      )
    ) {
      setError(
        "Chỉ cho phép tải lên PDF, Word, Excel hoặc PowerPoint."
      );

      setFile(null);

      return;
    }

    const maxSize =
      20 * 1024 * 1024;

    if (
      selectedFile.size >
      maxSize
    ) {
      setError(
        "Dung lượng file tối đa là 20 MB."
      );

      setFile(null);
    }
  }

  /* =======================================================
     TẢI FILE LÊN
  ======================================================= */

  async function handleUpload() {
    if (!file) {
      setError(
        "Vui lòng chọn tài liệu."
      );

      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      /* =================================================
         LÀM SẠCH TÊN FILE
      ================================================= */

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

      const filePath =
        `${meetingId}/${Date.now()}-${safeName}`;

      /* =================================================
         UPLOAD STORAGE
      ================================================= */

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from(
            "meeting-documents"
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
        console.error(
          "LỖI UPLOAD:",
          uploadError
        );

        throw new Error(
          `Không thể tải file lên: ${uploadError.message}`
        );
      }

      /* =================================================
         LƯU DATABASE
      ================================================= */

      const {
        error: databaseError,
      } =
        await supabase
          .from(
            "meeting_documents"
          )
          .insert({
            meeting_id:
              meetingId,

            name:
              file.name,

            file_name:
              file.name,

            file_path:
              filePath,

            file_type:
              file.type,

            file_size:
              file.size,

            status:
              "Chưa phát hành",

            uploaded_by:
              "Quản trị viên",
          });

      /* =================================================
         NẾU DATABASE LỖI
         → XÓA FILE STORAGE
      ================================================= */

      if (databaseError) {
        console.error(
          "LỖI DATABASE:",
          databaseError
        );

        await supabase.storage
          .from(
            "meeting-documents"
          )
          .remove([
            filePath,
          ]);

        throw new Error(
          `Không thể lưu thông tin tài liệu: ${databaseError.message}`
        );
      }

      /* =================================================
         THÀNH CÔNG
      ================================================= */

      setMessage(
        "Đã tải tài liệu lên."
      );

      setFile(null);

      await loadDocuments();

    } catch (err) {
      console.error(err);

      if (
        err &&
        typeof err ===
          "object" &&
        "message" in err
      ) {
        setError(
          String(
            (
              err as {
                message?: string;
              }
            ).message ||
              "Không thể tải tài liệu lên."
          )
        );
      } else {
        setError(
          "Không thể tải tài liệu lên."
        );
      }

    } finally {
      setUploading(false);
    }
  }

  /* =======================================================
     XEM TÀI LIỆU
  ======================================================= */

  async function openDocument(
    filePath: string
  ) {
    setError("");

    const {
      data,
      error,
    } =
      await supabase.storage
        .from(
          "meeting-documents"
        )
        .createSignedUrl(
          filePath,
          60 * 10
        );

    if (error) {
      console.error(error);

      setError(
        `Không thể mở tài liệu: ${error.message}`
      );

      return;
    }

    window.open(
      data.signedUrl,
      "_blank"
    );
  }

  /* =======================================================
     PHÁT HÀNH
  ======================================================= */

  async function publishDocument(
    documentId: number
  ) {
    setError("");
    setMessage("");

    const {
      error,
    } =
      await supabase
        .from(
          "meeting_documents"
        )
        .update({
          status:
            "Đã phát hành",

          published_by:
            "Quản trị viên",

          published_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          documentId
        );

    if (error) {
      console.error(
        "LỖI PHÁT HÀNH:",
        error
      );

      setError(
        `Không thể phát hành tài liệu: ${error.message}`
      );

      return;
    }

    setMessage(
      "Đã phát hành tài liệu thành công."
    );

    await loadDocuments();
  }

  /* =======================================================
     BẮT ĐẦU SỬA TÊN
  ======================================================= */

  function startEditName(
    document: DocumentItem
  ) {
    setEditingDocumentId(
      document.id
    );

    setEditingName(
      document.name
    );

    setError("");
    setMessage("");
  }

  /* =======================================================
     HỦY SỬA TÊN
  ======================================================= */

  function cancelEditName() {
    setEditingDocumentId(
      null
    );

    setEditingName("");
  }

  /* =======================================================
     LƯU TÊN MỚI
  ======================================================= */

  async function saveDocumentName(
    documentId: number
  ) {
    const newName =
      editingName.trim();

    if (!newName) {
      setError(
        "Tên tài liệu không được để trống."
      );

      return;
    }

    setSavingName(true);
    setError("");
    setMessage("");

    const {
      error,
    } =
      await supabase
        .from(
          "meeting_documents"
        )
        .update({
          name:
            newName,
        })
        .eq(
          "id",
          documentId
        );

    if (error) {
      console.error(
        "LỖI SỬA TÊN:",
        error
      );

      setError(
        `Không thể sửa tên tài liệu: ${error.message}`
      );

      setSavingName(false);

      return;
    }

    setMessage(
      "Đã cập nhật tên tài liệu."
    );

    setEditingDocumentId(
      null
    );

    setEditingName("");

    await loadDocuments();

    setSavingName(false);
  }

  /* =======================================================
     XÓA TÀI LIỆU
  ======================================================= */

  async function deleteDocument(
    document: DocumentItem
  ) {
    const confirmed =
      window.confirm(
        `Bạn có chắc chắn muốn xóa tài liệu này không?\n\n"${document.name}"\n\nTài liệu và dữ liệu liên quan sẽ bị xóa và không thể hoàn tác.`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    /* =================================================
       XÓA DATABASE
    ================================================= */

    const {
      error: databaseError,
    } =
      await supabase
        .from(
          "meeting_documents"
        )
        .delete()
        .eq(
          "id",
          document.id
        );

    if (databaseError) {
      console.error(
        "LỖI XÓA DATABASE:",
        databaseError
      );

      setError(
        `Không thể xóa tài liệu: ${databaseError.message}`
      );

      return;
    }

    /* =================================================
       XÓA FILE STORAGE
    ================================================= */

    const {
      error: storageError,
    } =
      await supabase.storage
        .from(
          "meeting-documents"
        )
        .remove([
          document.file_path,
        ]);

    if (storageError) {
      console.error(
        "LỖI XÓA FILE STORAGE:",
        storageError
      );

      setError(
        `Đã xóa thông tin tài liệu nhưng không thể xóa file lưu trữ: ${storageError.message}`
      );

      await loadDocuments();

      return;
    }

    setMessage(
      "Đã xóa tài liệu."
    );

    await loadDocuments();
  }

  /* =======================================================
     FORMAT DUNG LƯỢNG
  ======================================================= */

  function formatSize(
    size: number | null
  ) {
    if (!size) {
      return "";
    }

    if (
      size <
      1024 * 1024
    ) {
      return `${(
        size / 1024
      ).toFixed(0)} KB`;
    }

    return `${(
      size /
      1024 /
      1024
    ).toFixed(2)} MB`;
  }

  /* =======================================================
     FORMAT NGÀY
  ======================================================= */

  function formatDate(
    date: string
  ) {
    return new Date(
      date
    ).toLocaleDateString(
      "vi-VN"
    );
  }

  /* =======================================================
     TRẠNG THÁI
  ======================================================= */

  function statusStyle(
    status: string | null
  ) {
    if (
      status ===
      "Đã phát hành"
    ) {
      return "bg-emerald-100 text-emerald-700";
    }

    return "bg-amber-50 text-amber-700";
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-5">

      {/* =================================================
          TIÊU ĐỀ
      ================================================= */}

      <div>
      <h2 className="text-base font-bold text-emerald-900">
      <span className="text-emerald-900">● </span>
          Tài liệu cuộc họp
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Quản lý và phát hành tài liệu phục vụ cuộc họp.
        </p>
      </div>


      {/* =================================================
          THÔNG BÁO
      ================================================= */}

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


      {/* =================================================
          UPLOAD
      ================================================= */}

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5">

        <label className="block cursor-pointer">

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center transition hover:bg-slate-100">

            <div className="text-3xl">
              📄
            </div>

            <div className="mt-2 text-sm font-semibold text-slate-900">
              Chọn tài liệu
            </div>

            <div className="mt-1 text-xs text-slate-500">
              PDF, Word, Excel, PowerPoint — tối đa 20 MB
            </div>

          </div>

          <input
            type="file"
            className="hidden"
            onChange={
              handleFileChange
            }
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          />

        </label>


        {/* FILE ĐÃ CHỌN */}

        {file && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">

            <div className="min-w-0">

              <p className="truncate text-sm font-semibold text-emerald-900">
                {file.name}
              </p>

              <p className="mt-0.5 text-xs text-emerald-700">
                {(
                  file.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setFile(null)
              }
              className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700"
            >
              Bỏ chọn
            </button>

          </div>
        )}


        {/* NÚT UPLOAD */}

        <button
          type="button"
          onClick={
            handleUpload
          }
          disabled={
            !file ||
            uploading
          }
          className="mt-3 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading
            ? "Đang tải lên..."
            : "Tải tài liệu lên"}
        </button>

      </div>


      {/* =================================================
          DANH SÁCH TÀI LIỆU
      ================================================= */}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">

          <div>

            <h3 className="text-sm font-bold text-slate-900">
              Danh sách tài liệu
            </h3>

            <p className="mt-0.5 text-[11px] text-slate-500">
              {loading
                ? "Đang tải..."
                : `${documents.length} tài liệu`}
            </p>

          </div>

          {documents.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
              {documents.length} mục
            </span>
          )}

        </div>


        {/* LOADING */}

        {loading ? (

          <div className="px-4 py-8 text-center text-xs text-slate-500">
            Đang tải tài liệu...
          </div>

        ) : documents.length === 0 ? (

          <div className="px-4 py-8 text-center">

            <div className="text-2xl text-slate-300">
              📄
            </div>

            <p className="mt-2 text-xs font-medium text-slate-600">
              Chưa có tài liệu nào.
            </p>

          </div>

        ) : (

          /* =================================================
             DANH SÁCH GỌN
          ================================================= */

          <div className="divide-y divide-slate-100">

            {documents.map(
              (document, index) => {

                const isPublished =
                  document.status ===
                  "Đã phát hành";

                const isEditing =
                  editingDocumentId ===
                  document.id;

                /*
                 * SỐ THỨ TỰ
                 *
                 * index = 0 → Tài liệu số 1
                 * index = 1 → Tài liệu số 2
                 * index = 2 → Tài liệu số 3
                 *
                 * Vì loadDocuments() đang sắp xếp
                 * created_at tăng dần nên:
                 * tải trước = số nhỏ
                 * tải sau = số lớn
                 */

                const documentNumber =
                  index + 1;

                return (
                  <div
                    key={
                      document.id
                    }
                    className={`px-4 py-2.5 transition ${
                      isPublished
                        ? "bg-emerald-50/60"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >

                    <div className="flex items-center gap-3">

                      {/* =================================================
                          SỐ THỨ TỰ
                      ================================================= */}

                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">
                        {documentNumber}
                      </div>


                      {/* =================================================
                          ICON
                      ================================================= */}

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-base">
                        📄
                      </div>


                      {/* =================================================
                          TÊN + THÔNG TIN
                      ================================================= */}

                      <div className="min-w-0 flex-1">

                        {isEditing ? (

                          <div className="flex items-center gap-2">

                            <input
                              autoFocus
                              value={
                                editingName
                              }
                              onChange={(
                                event
                              ) =>
                                setEditingName(
                                  event
                                    .target
                                    .value
                                )
                              }
                              onKeyDown={(
                                event
                              ) => {

                                if (
                                  event.key ===
                                  "Enter"
                                ) {
                                  saveDocumentName(
                                    document.id
                                  );
                                }

                                if (
                                  event.key ===
                                  "Escape"
                                ) {
                                  cancelEditName();
                                }

                              }}
                              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100"
                            />

                            <button
                              type="button"
                              disabled={
                                savingName
                              }
                              onClick={() =>
                                saveDocumentName(
                                  document.id
                                )
                              }
                              className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                              {savingName
                                ? "Lưu..."
                                : "Lưu"}
                            </button>

                            <button
                              type="button"
                              onClick={
                                cancelEditName
                              }
                              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50"
                            >
                              Hủy
                            </button>

                          </div>

                        ) : (

                          <>
                            <p
                              className={`truncate text-xs font-medium ${
                                isPublished
                                  ? "text-emerald-900"
                                  : "text-slate-800"
                              }`}
                              title={
                                document.name
                              }
                            >
                              {document.name}
                            </p>

                            <p className="mt-0.5 truncate text-[10px] text-slate-400">

                              {formatSize(
                                document.file_size
                              )}

                              {" • "}

                              {formatDate(
                                document.created_at
                              )}

                              {" • "}

                              {document.uploaded_by ||
                                "Quản trị viên"}

                            </p>

                          </>

                        )}

                      </div>


                      {/* =================================================
                          TRẠNG THÁI
                      ================================================= */}

                      {!isEditing && (
                        <span
                          className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline-flex ${statusStyle(
                            document.status
                          )}`}
                        >
                          {isPublished
                            ? "Đã phát hành"
                            : "Chưa phát hành"}
                        </span>
                      )}


                      {/* =================================================
                          CÁC NÚT
                      ================================================= */}

                      {!isEditing && (

                        <div className="flex shrink-0 items-center gap-1">

                         {/* XEM */}

<button
  type="button"
  onClick={() =>
    openDocument(
      document.file_path
    )
  }
  className="cursor-pointer rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
>
  Xem
</button>


{/* SỬA */}

<button
  type="button"
  onClick={() =>
    startEditName(
      document
    )
  }
  className="cursor-pointer rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 transition hover:bg-amber-100"
>
  Sửa
</button>


{/* XÓA */}

<button
  type="button"
  onClick={() =>
    deleteDocument(
      document
    )
  }
  className="cursor-pointer rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-600 transition hover:bg-red-100"
>
  Xóa
</button>


{/* PHÁT HÀNH */}

{!isPublished && (
  <button
    type="button"
    onClick={() =>
      publishDocument(
        document.id
      )
    }
    className="cursor-pointer rounded-md bg-emerald-700 px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-emerald-800"
  >
    Phát hành
  </button>
)}



                        </div>

                      )}

                    </div>

                  </div>
                );
              }
            )}

          </div>

        )}

      </section>


      {/* =================================================
          GHI CHÚ
      ================================================= */}

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">

        <strong>Lưu ý:</strong>{" "}

        Tài liệu sau khi tải lên sẽ ở trạng thái
        <strong> Chưa phát hành</strong>.

        {" "}Điều hành viên có thể xem, sửa tên,
        xóa hoặc phát hành tài liệu.

        {" "}Khi nhấn
        <strong> Phát hành</strong>, tài liệu sẽ
        chuyển sang trạng thái
        <strong> Đã phát hành</strong>.

      </div>

    </div>
  );
}

