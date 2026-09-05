"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   PAGE
========================================================= */

export default function TaoMoiXinYKienPage() {
  /* =======================================================
     THÔNG TIN PHIẾU
  ======================================================= */

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [deadline, setDeadline] = useState("");

  /* =======================================================
     TÀI LIỆU
  ======================================================= */

  const [selectedFiles, setSelectedFiles] = useState<File[]>(
    []
  );

  /* =======================================================
     NHÓM THÀNH PHẦN
  ======================================================= */

  const [groups, setGroups] = useState<MemberGroup[]>([]);

  const [selectedGroupIds, setSelectedGroupIds] = useState<
    number[]
  >([]);

  /* =======================================================
     THÀNH VIÊN NHÓM
  ======================================================= */

  const [groupMembers, setGroupMembers] = useState<
    GroupMember[]
  >([]);

  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [selectedUserIds, setSelectedUserIds] = useState<
    string[]
  >([]);

  /* =======================================================
     NGƯỜI ĐANG ĐĂNG NHẬP
  ======================================================= */

  const [currentUserName, setCurrentUserName] =
    useState("");

  /* =======================================================
     UI
  ======================================================= */

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const messageRef =
    useRef<HTMLDivElement | null>(null);

  /* =========================================================
     LOAD CURRENT USER
  ========================================================= */

  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
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
      console.error(profileError);
      setCurrentUserName("");
      return;
    }

    setCurrentUserName(
      data?.full_name || ""
    );
  }

  /* =========================================================
     LOAD DATA
  ========================================================= */

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    setError("");

    const [
      groupsResult,
      groupMembersResult,
    ] = await Promise.all([
      supabase
        .from("member_groups")
        .select("id,name")
        .order("id", {
          ascending: true,
        }),

      supabase
        .from("group_members")
        .select("id,group_id,user_id")
        .order("id", {
          ascending: true,
        }),
    ]);

    if (groupsResult.error) {
      setError(
        `Không thể tải nhóm thành phần: ${groupsResult.error.message}`
      );

      setLoading(false);
      return;
    }

    if (groupMembersResult.error) {
      setError(
        `Không thể tải thành viên nhóm: ${groupMembersResult.error.message}`
      );

      setLoading(false);
      return;
    }

    const loadedGroups =
      (groupsResult.data || []) as MemberGroup[];

    const loadedGroupMembers =
      (groupMembersResult.data || []) as GroupMember[];

    setGroups(loadedGroups);
    setGroupMembers(loadedGroupMembers);

    /* -------------------------------------------------------
       LẤY PROFILE CỦA CÁC USER TRONG NHÓM
    ------------------------------------------------------- */

    const userIds = Array.from(
      new Set(
        loadedGroupMembers.map(
          (member) => member.user_id
        )
      )
    );

    if (userIds.length === 0) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id,full_name,position,organization"
      )
      .in("id", userIds)
      .order("full_name", {
        ascending: true,
      });

    if (profileError) {
      setError(
        `Không thể tải danh sách đại biểu: ${profileError.message}`
      );

      setLoading(false);
      return;
    }

    setProfiles(
      (profileData || []) as Profile[]
    );

    setLoading(false);
  }

  /* =========================================================
     TỰ ĐỘNG CUỘN ĐẾN THÔNG BÁO
  ========================================================= */

  useEffect(() => {
    if (!error && !message) {
      return;
    }

    requestAnimationFrame(() => {
      messageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [error, message]);

  /* =========================================================
     ĐẠI BIỂU THUỘC CÁC NHÓM ĐANG CHỌN
  ========================================================= */

  const availableMembers = useMemo(() => {
    if (selectedGroupIds.length === 0) {
      return [];
    }

    const selectedMembers =
      groupMembers.filter((member) =>
        selectedGroupIds.includes(
          member.group_id
        )
      );

    const uniqueUserIds = Array.from(
      new Set(
        selectedMembers.map(
          (member) => member.user_id
        )
      )
    );

    return profiles.filter((profile) =>
      uniqueUserIds.includes(profile.id)
    );
  }, [
    selectedGroupIds,
    groupMembers,
    profiles,
  ]);

  /* =========================================================
     ĐẠI BIỂU ĐÃ CHỌN
  ========================================================= */

  const selectedProfiles = useMemo(() => {
    return profiles.filter((profile) =>
      selectedUserIds.includes(profile.id)
    );
  }, [
    profiles,
    selectedUserIds,
  ]);

  /* =========================================================
     CHỌN / BỎ NHÓM
  ========================================================= */

  function toggleGroup(
    groupId: number
  ) {
    setError("");
    setMessage("");

    setSelectedGroupIds((current) => {
      if (current.includes(groupId)) {
        return current.filter(
          (id) => id !== groupId
        );
      }

      return [
        ...current,
        groupId,
      ];
    });
  }

  /* =========================================================
     CHỌN / BỎ ĐẠI BIỂU
  ========================================================= */

  function toggleUser(
    userId: string
  ) {
    setError("");
    setMessage("");

    setSelectedUserIds((current) => {
      if (current.includes(userId)) {
        return current.filter(
          (id) => id !== userId
        );
      }

      return [
        ...current,
        userId,
      ];
    });
  }

  /* =========================================================
     CHỌN TẤT CẢ
  ========================================================= */

  function selectAllAvailable() {
    const ids =
      availableMembers.map(
        (profile) => profile.id
      );

    setSelectedUserIds((current) =>
      Array.from(
        new Set([
          ...current,
          ...ids,
        ])
      )
    );
  }

  /* =========================================================
     BỎ CHỌN TẤT CẢ
  ========================================================= */

  function clearAvailable() {
    const availableIds =
      availableMembers.map(
        (profile) => profile.id
      );

    setSelectedUserIds((current) =>
      current.filter(
        (id) =>
          !availableIds.includes(id)
      )
    );
  }

  /* =========================================================
     FILE SELECT
  ========================================================= */

  function handleFilesChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setError("");
    setMessage("");

    const files = Array.from(
      event.target.files || []
    );

    if (files.length === 0) {
      return;
    }

    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
    ];

    const maxSize =
      20 * 1024 * 1024;

    for (const file of files) {
      const lowerName =
        file.name.toLowerCase();

      const validExtension =
        allowedExtensions.some(
          (extension) =>
            lowerName.endsWith(
              extension
            )
        );

      if (!validExtension) {
        setError(
          `File "${file.name}" không đúng định dạng. Chỉ cho phép PDF, Word, Excel, PowerPoint.`
        );

        event.target.value = "";
        return;
      }

      if (file.size > maxSize) {
        setError(
          `File "${file.name}" vượt quá 20 MB.`
        );

        event.target.value = "";
        return;
      }
    }

    setSelectedFiles(files);
  }

  /* =========================================================
     XÓA FILE ĐANG CHỜ TẢI
  ========================================================= */

  function removeSelectedFile(
    index: number
  ) {
    setSelectedFiles((current) =>
      current.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );
  }

  /* =========================================================
     FORMAT FILE SIZE
  ========================================================= */

  function formatFileSize(
    size: number
  ) {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(
        size / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      size /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  /* =========================================================
     TẠO PHIẾU
  ========================================================= */

  async function createRequest(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    /* -------------------------------------------------------
       KIỂM TRA
    ------------------------------------------------------- */

    if (!title.trim()) {
      setError(
        "Vui lòng nhập tiêu đề phiếu xin ý kiến."
      );
      return;
    }

    if (!content.trim()) {
      setError(
        "Vui lòng nhập nội dung xin ý kiến."
      );
      return;
    }

    if (!deadline) {
      setError(
        "Vui lòng chọn hạn trả lời."
      );
      return;
    }

    if (selectedGroupIds.length === 0) {
      setError(
        "Vui lòng chọn ít nhất một nhóm thành phần."
      );
      return;
    }

    if (selectedUserIds.length === 0) {
      setError(
        "Vui lòng chọn ít nhất một đại biểu được lấy ý kiến."
      );
      return;
    }

    if (selectedFiles.length === 0) {
      setError(
        "Vui lòng chọn ít nhất một văn bản gửi kèm."
      );
      return;
    }

    setSaving(true);

    /* -------------------------------------------------------
       1. TẠO PHIẾU
    ------------------------------------------------------- */

    const {
      data: requestData,
      error: requestError,
    } = await supabase
      .from("opinion_requests")
      .insert({
        title: title.trim(),
        content: content.trim(),
        deadline,
        status: "Đang lấy ý kiến",
      })
      .select(
        "id,title,content,deadline,status,created_at"
      )
      .single();

    if (
      requestError ||
      !requestData
    ) {
      setError(
        `Không thể tạo phiếu: ${
          requestError?.message ||
          "Không xác định được phiếu vừa tạo."
        }`
      );

      setSaving(false);
      return;
    }

    const requestId =
      requestData.id as number;

    /* -------------------------------------------------------
       2. LƯU ĐẠI BIỂU ĐƯỢC LẤY Ý KIẾN
    ------------------------------------------------------- */

    const selectedParticipants =
      selectedProfiles.map(
        (profile) => ({
          opinion_request_id:
            requestId,

          full_name:
            profile.full_name,

          position:
            profile.position ||
            null,

          organization:
            profile.organization ||
            null,
        })
      );

    const {
      error: participantError,
    } = await supabase
      .from("opinion_participants")
      .insert(
        selectedParticipants
      );

    if (participantError) {
      await supabase
        .from("opinion_requests")
        .delete()
        .eq(
          "id",
          requestId
        );

      setError(
        `Không thể lưu đại biểu được lấy ý kiến: ${participantError.message}`
      );

      setSaving(false);
      return;
    }

    /* -------------------------------------------------------
       3. UPLOAD TÀI LIỆU
    ------------------------------------------------------- */

    const uploadedPaths: string[] =
      [];

    for (
      let index = 0;
      index < selectedFiles.length;
      index++
    ) {
      const file =
        selectedFiles[index];

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
        `opinion/${requestId}/${Date.now()}-${index + 1}-${safeName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("opinion-documents")
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
        if (
          uploadedPaths.length >
          0
        ) {
          await supabase.storage
            .from(
              "opinion-documents"
            )
            .remove(
              uploadedPaths
            );
        }

        await supabase
          .from(
            "opinion_requests"
          )
          .delete()
          .eq(
            "id",
            requestId
          );

        setError(
          `Không thể tải văn bản "${file.name}" lên Supabase: ${uploadError.message}`
        );

        setSaving(false);
        return;
      }

      uploadedPaths.push(
        filePath
      );

      /* -----------------------------------------------------
         4. LƯU THÔNG TIN FILE
      ----------------------------------------------------- */

      const {
        error: documentError,
      } = await supabase
        .from(
          "opinion_documents"
        )
        .insert({
          opinion_request_id:
            requestId,

          file_name:
            file.name,

          file_path:
            filePath,
        });

      if (documentError) {
        await supabase.storage
          .from(
            "opinion-documents"
          )
          .remove([
            filePath,
          ]);

        const previousPaths =
          uploadedPaths.filter(
            (path) =>
              path !== filePath
          );

        if (
          previousPaths.length >
          0
        ) {
          await supabase.storage
            .from(
              "opinion-documents"
            )
            .remove(
              previousPaths
            );
        }

        await supabase
          .from(
            "opinion_requests"
          )
          .delete()
          .eq(
            "id",
            requestId
          );

        setError(
          `Đã tải văn bản "${file.name}" lên nhưng không lưu được thông tin văn bản: ${documentError.message}`
        );

        setSaving(false);
        return;
      }
    }

    /* =======================================================
       THÀNH CÔNG
    ======================================================= */

    setTitle("");
    setContent("");
    setDeadline("");

    setSelectedFiles([]);

    setSelectedGroupIds([]);
    setSelectedUserIds([]);

    const fileInput =
      document.getElementById(
        "opinion-files"
      ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }

    setMessage(
      `Đã tạo phiếu xin ý kiến thành công cho ${selectedProfiles.length} đại biểu và tải ${selectedFiles.length} văn bản.`
    );

    setSaving(false);
  }

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


      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="mx-auto max-w-6xl px-5 py-6">

        {/* ===================================================
            TITLE
        =================================================== */}

        <div className="mb-5 flex items-center justify-between gap-4">

          <div>

          <h2 className="text-lg font-bold text-emerald-900">
          <span className="text-amber-500">📝 </span>
              Tạo phiếu xin ý kiến
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tạo nội dung, chọn đại biểu được lấy ý kiến và gửi tài liệu kèm theo.
            </p>

          </div>

          <Link
            href="/quan-tri/dieu-hanh/xin-y-kien"
            className="shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Quay lại
          </Link>

        </div>


        {/* ===================================================
            THÔNG BÁO
        =================================================== */}

        <div ref={messageRef}>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

        </div>


        {/* ===================================================
            LOADING
        =================================================== */}

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            Đang tải danh sách nhóm và đại biểu...
          </div>

        ) : (

          <form
            onSubmit={createRequest}
            className="space-y-5"
          >

            {/* =================================================
                1. THÔNG TIN PHIẾU
            ================================================= */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="mb-5">

                <h3 className="text-base font-bold text-slate-900">
                  1. Thông tin phiếu
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Nhập nội dung cần xin ý kiến.
                </p>

              </div>


              {/* TIÊU ĐỀ */}

              <div className="mb-4">

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Tiêu đề phiếu
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Xin ý kiến về dự thảo chương trình công tác..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>


              {/* NỘI DUNG */}

              <div className="mb-4">

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nội dung xin ý kiến
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <textarea
                  value={content}
                  onChange={(event) =>
                    setContent(
                      event.target.value
                    )
                  }
                  rows={7}
                  placeholder="Nhập nội dung, vấn đề hoặc yêu cầu cần đại biểu cho ý kiến..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>


              {/* HẠN TRẢ LỜI */}

              <div className="max-w-sm">

                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Hạn trả lời
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(event) =>
                    setDeadline(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

              </div>

            </section>


            {/* =================================================
                2. CHỌN NHÓM
            ================================================= */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="mb-5">

                <h3 className="text-base font-bold text-slate-900">
                  2. Chọn nhóm thành phần
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Chọn một hoặc nhiều nhóm để hiển thị các đại biểu thuộc nhóm.
                </p>

              </div>


              {groups.length === 0 ? (

                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Chưa có nhóm thành phần.
                </div>

              ) : (

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                  {groups.map((group) => {

                    const checked =
                      selectedGroupIds.includes(
                        group.id
                      );

                    const count =
                      groupMembers.filter(
                        (member) =>
                          member.group_id ===
                          group.id
                      ).length;

                    return (
                      <label
                        key={group.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                          checked
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >

                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleGroup(
                              group.id
                            )
                          }
                          className="h-4 w-4 cursor-pointer accent-emerald-600"
                        />

                        <div className="min-w-0 flex-1">

                          <p className="text-sm font-semibold text-slate-800">
                            {group.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {count} thành viên
                          </p>

                        </div>

                      </label>
                    );
                  })}

                </div>

              )}

            </section>


            {/* =================================================
                3. CHỌN ĐẠI BIỂU
            ================================================= */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                <div>

                  <h3 className="text-base font-bold text-slate-900">
                    3. Đại biểu được lấy ý kiến
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Tích chọn những đại biểu thực sự nhận phiếu xin ý kiến.
                  </p>

                </div>

                <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  Đã chọn {selectedUserIds.length} đại biểu
                </div>

              </div>


              {selectedGroupIds.length === 0 ? (

                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

                  <p className="font-semibold text-slate-600">
                    Chưa chọn nhóm thành phần
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Hãy chọn nhóm ở phần trên để hiển thị danh sách đại biểu.
                  </p>

                </div>

              ) : availableMembers.length === 0 ? (

                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

                  <p className="font-semibold text-slate-600">
                    Không có đại biểu
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Các nhóm đã chọn hiện chưa có thành viên.
                  </p>

                </div>

              ) : (

                <>

                  <div className="mb-3 flex flex-wrap gap-2">

                    <button
                      type="button"
                      onClick={
                        selectAllAvailable
                      }
                      className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      ✓ Chọn tất cả
                    </button>

                    <button
                      type="button"
                      onClick={
                        clearAvailable
                      }
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Bỏ chọn
                    </button>

                  </div>


                  <div className="overflow-hidden rounded-xl border border-slate-200">

                    <div className="overflow-x-auto">

                      <table className="w-full min-w-[700px] text-sm">

                        <thead className="bg-slate-50">

                          <tr>

                            <th className="w-12 px-4 py-3 text-center text-xs font-semibold text-slate-500">
                              Chọn
                            </th>

                            <th className="w-16 px-4 py-3 text-center text-xs font-semibold text-slate-500">
                              STT
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                              Họ và tên
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                              Chức vụ
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                              Đơn vị
                            </th>

                          </tr>

                        </thead>


                        <tbody className="divide-y divide-slate-100">

                          {availableMembers.map(
                            (
                              profile,
                              index
                            ) => {

                              const checked =
                                selectedUserIds.includes(
                                  profile.id
                                );

                              return (
                                <tr
                                  key={
                                    profile.id
                                  }
                                  className={`transition ${
                                    checked
                                      ? "bg-emerald-50/60"
                                      : "hover:bg-slate-50"
                                  }`}
                                >

                                  <td className="px-4 py-3 text-center">

                                    <input
                                      type="checkbox"
                                      checked={
                                        checked
                                      }
                                      onChange={() =>
                                        toggleUser(
                                          profile.id
                                        )
                                      }
                                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                                    />

                                  </td>


                                  <td className="px-4 py-3 text-center text-xs text-slate-400">
                                    {index + 1}
                                  </td>


                                  <td className="px-4 py-3 font-medium text-slate-800">
                                    {profile.full_name}
                                  </td>


                                  <td className="px-4 py-3 text-slate-600">
                                    {profile.position ||
                                      "Chưa xác định"}
                                  </td>


                                  <td className="px-4 py-3 text-slate-600">
                                    {profile.organization ||
                                      "Chưa xác định"}
                                  </td>

                                </tr>
                              );
                            }
                          )}

                        </tbody>

                      </table>

                    </div>

                  </div>

                </>

              )}

            </section>


            {/* =================================================
                4. TÀI LIỆU
            ================================================= */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="mb-5">

                <h3 className="text-base font-bold text-slate-900">
                  4. Văn bản gửi kèm
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Tải các văn bản để đại biểu đọc và cho ý kiến.
                </p>

              </div>


              <label
                htmlFor="opinion-files"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-emerald-300 hover:bg-emerald-50/40"
              >

                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-6 w-6"
                  >

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16.5V4.5m0 0L7.5 9M12 4.5 16.5 9M5.25 19.5h13.5A1.75 1.75 0 0 0 20.5 17.75v-1.5A1.75 1.75 0 0 0 18.75 14.5h-2.5M5.25 19.5A1.75 1.75 0 0 1 3.5 17.75v-1.5A1.75 1.75 0 0 1 5.25 14.5h2.5"
                    />

                  </svg>

                </div>

                <p className="text-sm font-semibold text-slate-700">
                  Chọn văn bản để tải lên
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  PDF, Word, Excel, PowerPoint — tối đa 20 MB/file
                </p>

                <input
                  id="opinion-files"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={
                    handleFilesChange
                  }
                  className="hidden"
                />

              </label>


              {selectedFiles.length > 0 && (

                <div className="mt-4 space-y-2">

                  {selectedFiles.map(
                    (
                      file,
                      index
                    ) => (

                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">
                          {file.name
                            .split(".")
                            .pop()
                            ?.toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="truncate text-sm font-medium text-slate-700">
                            {file.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {formatFileSize(
                              file.size
                            )}
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeSelectedFile(
                              index
                            )
                          }
                          className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                        >
                          Xóa
                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>


            {/* =================================================
                5. TỔNG KẾT
            ================================================= */}

            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">

              <h3 className="text-base font-bold text-emerald-900">
                Thông tin trước khi tạo phiếu
              </h3>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">

                <SummaryItem
                  label="Nhóm thành phần"
                  value={`${selectedGroupIds.length} nhóm`}
                />

                <SummaryItem
                  label="Đại biểu được lấy ý kiến"
                  value={`${selectedUserIds.length} đại biểu`}
                />

                <SummaryItem
                  label="Văn bản gửi kèm"
                  value={`${selectedFiles.length} văn bản`}
                />

              </div>

            </section>


            {/* =================================================
                BUTTONS
            ================================================= */}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <Link
                href="/quan-tri/dieu-hanh/xin-y-kien"
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </Link>


              <button
                type="submit"
                disabled={saving}
                className="min-w-[160px] cursor-pointer rounded-xl bg-emerald-700 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Đang tạo phiếu..."
                  : "✓ Tạo phiếu"}
              </button>

            </div>

          </form>

        )}

      </div>

    </main>
  );
}


/* =========================================================
   SUMMARY ITEM
========================================================= */

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-base font-bold text-emerald-700">
        {value}
      </p>

    </div>
  );
}

