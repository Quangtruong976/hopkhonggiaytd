"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Organization = {
  id: number;
  name: string;
  parent_id: number | null;
  organization_type: string | null;
  is_active: boolean;
};

const ITEMS_PER_PAGE = 10;

export default function ToChucPage() {
  const [organizations, setOrganizations] = useState<
    Organization[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);

  const [
    editingOrganization,
    setEditingOrganization,
  ] = useState<Organization | null>(null);

  const [name, setName] = useState("");
  const [organizationType, setOrganizationType] =
    useState("");
  const [parentId, setParentId] = useState("");

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<
    number | null
  >(null);

  const [
    changingStatusId,
    setChangingStatusId,
  ] = useState<number | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // TẢI DANH SÁCH ĐƠN VỊ
  // =====================================================

  async function loadOrganizations() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("organizations")
      .select(
        "id, name, parent_id, organization_type, is_active"
      )
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Không thể tải cơ cấu tổ chức:",
        error
      );

      setError(
        `Không thể tải cơ cấu tổ chức: ${error.message}`
      );

      setOrganizations([]);
    } else {
      setOrganizations(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOrganizations();
  }, []);

  // =====================================================
  // TÌM KIẾM
  // =====================================================

  const filteredOrganizations = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return organizations;
    }

    return organizations.filter(
      (organization) => {
        const parent =
          organizations.find(
            (item) =>
              item.id ===
              organization.parent_id
          );

        return (
          organization.name
            .toLowerCase()
            .includes(keyword) ||
          (
            organization.organization_type ||
            ""
          )
            .toLowerCase()
            .includes(keyword) ||
          (parent?.name || "")
            .toLowerCase()
            .includes(keyword)
        );
      }
    );
  }, [organizations, search]);

  // =====================================================
  // TỰ VỀ TRANG 1 KHI TÌM KIẾM
  // =====================================================

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // =====================================================
  // PHÂN TRANG
  // =====================================================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredOrganizations.length /
        ITEMS_PER_PAGE
    )
  );

  const paginatedOrganizations =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) *
        ITEMS_PER_PAGE;

      return filteredOrganizations.slice(
        startIndex,
        startIndex + ITEMS_PER_PAGE
      );
    }, [
      filteredOrganizations,
      currentPage,
    ]);

  // =====================================================
  // ĐẢM BẢO TRANG HIỆN TẠI KHÔNG VƯỢT QUÁ TỔNG SỐ TRANG
  // =====================================================

  useEffect(() => {
    if (
      currentPage > totalPages
    ) {
      setCurrentPage(totalPages);
    }
  }, [
    currentPage,
    totalPages,
  ]);

  // =====================================================
  // LẤY TÊN ĐƠN VỊ CẤP TRÊN
  // =====================================================

  function getParentName(
    parentId: number | null
  ) {
    if (!parentId) {
      return "Đơn vị cấp cao nhất";
    }

    return (
      organizations.find(
        (item) =>
          item.id === parentId
      )?.name ||
      "Không xác định"
    );
  }

  // =====================================================
  // MỞ FORM THÊM
  // =====================================================

  function openAddForm() {
    setEditingOrganization(null);

    setName("");
    setOrganizationType("");
    setParentId("");

    setMessage("");
    setError("");

    setShowForm(true);
  }

  // =====================================================
  // MỞ FORM SỬA
  // =====================================================

  function openEditForm(
    organization: Organization
  ) {
    setEditingOrganization(
      organization
    );

    setName(organization.name);

    setOrganizationType(
      organization.organization_type ||
        ""
    );

    setParentId(
      organization.parent_id
        ? String(
            organization.parent_id
          )
        : ""
    );

    setMessage("");
    setError("");

    setShowForm(true);
  }

  // =====================================================
  // ĐÓNG FORM
  // =====================================================

  function closeForm() {
    if (saving) return;

    setShowForm(false);

    setEditingOrganization(null);

    setName("");
    setOrganizationType("");
    setParentId("");

    setError("");
  }

  // =====================================================
  // THÊM / SỬA ĐƠN VỊ
  // =====================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const trimmedName =
      name.trim();

    const trimmedType =
      organizationType.trim();

    // -------------------------
    // KIỂM TRA TÊN
    // -------------------------

    if (!trimmedName) {
      setError(
        "Vui lòng nhập tên đơn vị."
      );

      return;
    }

    // -------------------------
    // KHÔNG CHO CHỌN CHÍNH MÌNH
    // -------------------------

    if (
      editingOrganization &&
      parentId &&
      Number(parentId) ===
        editingOrganization.id
    ) {
      setError(
        "Đơn vị không thể chọn chính nó làm đơn vị cấp trên."
      );

      return;
    }

    // -------------------------
    // KIỂM TRA TRÙNG TÊN
    // -------------------------

    const duplicate =
      organizations.some(
        (organization) =>
          organization.name
            .trim()
            .toLowerCase() ===
            trimmedName.toLowerCase() &&
          organization.id !==
            editingOrganization?.id
      );

    if (duplicate) {
      setError(
        "Tên đơn vị này đã tồn tại."
      );

      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: trimmedName,

        organization_type:
          trimmedType || null,

        parent_id: parentId
          ? Number(parentId)
          : null,
      };

      // =================================================
      // SỬA
      // =================================================

      if (editingOrganization) {
        const {
          error: updateError,
        } = await supabase
          .from("organizations")
          .update(payload)
          .eq(
            "id",
            editingOrganization.id
          );

        if (updateError) {
          console.error(
            "LỖI CẬP NHẬT:",
            updateError
          );

          setError(
            `Không thể cập nhật đơn vị: ${updateError.message}`
          );

          return;
        }

        setMessage(
          `Đã cập nhật đơn vị "${trimmedName}".`
        );
      }

      // =================================================
      // THÊM
      // =================================================

      else {
        const {
          error: insertError,
        } = await supabase
          .from("organizations")
          .insert({
            ...payload,
            is_active: true,
          });

        if (insertError) {
          console.error(
            "LỖI THÊM ĐƠN VỊ:",
            insertError
          );

          setError(
            `Không thể thêm đơn vị: ${insertError.message}`
          );

          return;
        }

        setMessage(
          `Đã thêm đơn vị "${trimmedName}".`
        );

        setCurrentPage(1);
      }

      // Đóng form
      setShowForm(false);

      setEditingOrganization(null);

      setName("");
      setOrganizationType("");
      setParentId("");

      // Tải lại dữ liệu
      await loadOrganizations();
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // KHÓA / MỞ ĐƠN VỊ
  // =====================================================

  async function toggleStatus(
    organization: Organization
  ) {
    setChangingStatusId(
      organization.id
    );

    setError("");
    setMessage("");

    try {
      const {
        error: updateError,
      } = await supabase
        .from("organizations")
        .update({
          is_active:
            !organization.is_active,
        })
        .eq(
          "id",
          organization.id
        );

      if (updateError) {
        console.error(
          "LỖI THAY ĐỔI TRẠNG THÁI:",
          updateError
        );

        setError(
          `Không thể thay đổi trạng thái: ${updateError.message}`
        );

        return;
      }

      if (organization.is_active) {
        setMessage(
          `Đã khóa đơn vị "${organization.name}".`
        );
      } else {
        setMessage(
          `Đã kích hoạt đơn vị "${organization.name}".`
        );
      }

      await loadOrganizations();
    } finally {
      setChangingStatusId(null);
    }
  }

  // =====================================================
  // XÓA ĐƠN VỊ
  // =====================================================

  async function handleDelete(
    organization: Organization
  ) {
    // Kiểm tra đơn vị trực thuộc
    const childOrganizations =
      organizations.filter(
        (item) =>
          item.parent_id ===
          organization.id
      );

    if (
      childOrganizations.length >
      0
    ) {
      setError(
        `Không thể xóa "${organization.name}" vì đang có ${childOrganizations.length} đơn vị trực thuộc.`
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Bạn có chắc chắn muốn xóa đơn vị "${organization.name}" không?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      organization.id
    );

    setError("");
    setMessage("");

    try {
      const {
        error: deleteError,
      } = await supabase
        .from("organizations")
        .delete()
        .eq(
          "id",
          organization.id
        );

      if (deleteError) {
        console.error(
          "LỖI XÓA:",
          deleteError
        );

        setError(
          `Không thể xóa đơn vị "${organization.name}": ${deleteError.message}`
        );

        return;
      }

      setMessage(
        `Đã xóa đơn vị "${organization.name}".`
      );

      await loadOrganizations();
    } finally {
      setDeletingId(null);
    }
  }

  // =====================================================
  // THỐNG KÊ
  // =====================================================

  const activeCount =
    organizations.filter(
      (organization) =>
        organization.is_active
    ).length;

  const inactiveCount =
    organizations.filter(
      (organization) =>
        !organization.is_active
    ).length;

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="border-b border-slate-300 bg-white">

        <div className="mx-auto max-w-6xl px-6 py-3.5">

          <div className="flex items-center justify-between gap-4">

            {/* TIÊU ĐỀ */}

            <div>

              <h1 className="mt-0.5 text-2xl font-bold text-emerald-900">
                Hệ thống tổ chức Đoàn tỉnh Lâm Đồng
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Quản lý các đơn vị, tổ chức và quan hệ cấp trên – trực thuộc.
              </p>

            </div>

            {/* KHU VỰC QUẢN TRỊ VIÊN */}

            <Link
              href="/quan-tri/tai-khoan"
              className="hidden cursor-pointer items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 transition hover:bg-emerald-100 sm:flex"
            >

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                👤
              </div>

              <div className="text-right">

                <div className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
                  Khu vực
                </div>

                <div className="mt-0.5 text-sm font-semibold text-emerald-900">
                  Quản trị viên
                </div>

              </div>

            </Link>

          </div>

        </div>

      </header>

      {/* =================================================
          NỘI DUNG
      ================================================= */}

      <div className="mx-auto max-w-6xl px-6 py-6">

        {/* =================================================
            THỐNG KÊ
        ================================================= */}

        <section className="grid gap-3 sm:grid-cols-3">

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">

            <div className="text-xs font-medium text-slate-500">
              Tổng số đơn vị
            </div>

            <div className="mt-1 text-2xl font-bold text-slate-900">
              {loading
                ? "—"
                : organizations.length}
            </div>

          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-5 py-4">

            <div className="text-xs font-medium text-emerald-700">
              Đang hoạt động
            </div>

            <div className="mt-1 text-2xl font-bold text-emerald-700">
              {loading
                ? "—"
                : activeCount}
            </div>

          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">

            <div className="text-xs font-medium text-slate-500">
              Đang khóa
            </div>

            <div className="mt-1 text-2xl font-bold text-slate-700">
              {loading
                ? "—"
                : inactiveCount}
            </div>

          </div>

        </section>

        {/* =================================================
            THÔNG BÁO
        ================================================= */}

        {message && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =================================================
            TÌM KIẾM + THÊM ĐƠN VỊ
        ================================================= */}

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">

          <div className="flex items-center justify-between gap-4">

            {/* Ô TÌM KIẾM */}

            <div className="max-w-md flex-1">

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Tìm tên đơn vị, loại đơn vị..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />

            </div>

            {/* THÊM ĐƠN VỊ */}

            <button
              type="button"
              onClick={openAddForm}
              className="shrink-0 cursor-pointer rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              + Thêm đơn vị
            </button>

          </div>

        </section>

        {/* =================================================
            DANH SÁCH
        ================================================= */}

        <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">

          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">

            <h2 className="text-sm font-bold text-slate-800">
              Danh sách đơn vị
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {loading
                ? "Đang tải dữ liệu..."
                : filteredOrganizations.length ===
                  organizations.length
                ? `${organizations.length} đơn vị`
                : `${filteredOrganizations.length} đơn vị phù hợp`}
            </p>

          </div>

          {/* ĐANG TẢI */}

          {loading ? (

            <div className="px-5 py-14 text-center text-sm text-slate-500">
              Đang tải cơ cấu tổ chức...
            </div>

          ) : filteredOrganizations.length ===
            0 ? (

            <div className="px-5 py-14 text-center">

              <p className="text-sm font-semibold text-slate-700">
                Không tìm thấy đơn vị
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Thử thay đổi từ khóa tìm kiếm.
              </p>

            </div>

          ) : (

            <>

              {/* =================================================
                  BẢNG
              ================================================= */}

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-sm">

                  <thead className="border-b border-slate-200 bg-slate-50">

                    <tr className="text-left text-xs font-semibold text-slate-500">

                      <th className="w-16 px-5 py-3 text-center">
                        STT
                      </th>

                      <th className="px-4 py-3">
                        Tên đơn vị
                      </th>

                      <th className="px-4 py-3">
                        Loại đơn vị
                      </th>

                      <th className="px-4 py-3">
                        Đơn vị cấp trên
                      </th>

                      <th className="px-4 py-3">
                        Trạng thái
                      </th>

                      <th className="px-4 py-3 text-right">
                        Thao tác
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {paginatedOrganizations.map(
                      (
                        organization,
                        index
                      ) => {

                        const globalIndex =
                          (currentPage - 1) *
                            ITEMS_PER_PAGE +
                          index +
                          1;

                        return (

                          <tr
                            key={
                              organization.id
                            }
                            className="transition hover:bg-slate-50"
                          >

                            {/* STT */}

                            <td className="px-5 py-5 text-center text-xs font-medium text-slate-400">
                              {globalIndex}
                            </td>

                            {/* TÊN */}

                            <td className="px-4 py-5">

                              <div className="font-semibold text-slate-800">
                                {
                                  organization.name
                                }
                              </div>

                              <div className="mt-1 text-xs text-slate-400">
                                Mã đơn vị:{" "}
                                {
                                  organization.id
                                }
                              </div>

                            </td>

                            {/* LOẠI */}

                            <td className="px-4 py-5 text-slate-600">

                              {
                                organization.organization_type ||
                                "—"
                              }

                            </td>

                            {/* CẤP TRÊN */}

                            <td className="px-4 py-5 text-slate-600">

                              {getParentName(
                                organization.parent_id
                              )}

                            </td>

                            {/* TRẠNG THÁI */}

                            <td className="px-4 py-5">

                              {organization.is_active ? (

                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">

                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                                  Hoạt động

                                </span>

                              ) : (

                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">

                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />

                                  Đang khóa

                                </span>

                              )}

                            </td>

                            {/* THAO TÁC */}

                            <td className="px-4 py-5">

                              <div className="flex justify-end gap-1">

                                {/* SỬA */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditForm(
                                      organization
                                    )
                                  }
                                  className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                                >
                                  Sửa
                                </button>

                                {/* KHÓA / MỞ */}

                                <button
                                  type="button"
                                  disabled={
                                    changingStatusId ===
                                    organization.id
                                  }
                                  onClick={() =>
                                    toggleStatus(
                                      organization
                                    )
                                  }
                                  className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-amber-600 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {changingStatusId ===
                                  organization.id
                                    ? "..."
                                    : organization.is_active
                                    ? "Khóa"
                                    : "Mở"}
                                </button>

                                {/* XÓA */}

                                <button
                                  type="button"
                                  disabled={
                                    deletingId ===
                                    organization.id
                                  }
                                  onClick={() =>
                                    handleDelete(
                                      organization
                                    )
                                  }
                                  className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deletingId ===
                                  organization.id
                                    ? "..."
                                    : "Xóa"}
                                </button>

                              </div>

                            </td>

                          </tr>

                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

              {/* =================================================
                  PHÂN TRANG
              ================================================= */}

              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="text-xs text-slate-500">

                  {filteredOrganizations.length >
                  0 ? (

                    <>
                      Hiển thị{" "}
                      <span className="font-semibold text-slate-700">
                        {(currentPage -
                          1) *
                          ITEMS_PER_PAGE +
                          1}
                      </span>
                      {" – "}
                      <span className="font-semibold text-slate-700">
                        {Math.min(
                          currentPage *
                            ITEMS_PER_PAGE,
                          filteredOrganizations.length
                        )}
                      </span>
                      {" / "}
                      <span className="font-semibold text-slate-700">
                        {
                          filteredOrganizations.length
                        }
                      </span>{" "}
                      đơn vị
                    </>

                  ) : (
                    "Không có dữ liệu"
                  )}

                </div>

                {totalPages > 1 && (

                  <div className="flex items-center gap-1">

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
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Trước
                    </button>

                    {/* CÁC TRANG */}

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
                        className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          currentPage ===
                          page
                            ? "bg-emerald-700 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sau
                    </button>

                  </div>

                )}

              </div>

            </>

          )}

        </section>

        {/* =================================================
            GHI CHÚ
        ================================================= */}

        <p className="mt-3 text-xs leading-5 text-slate-400">
          Cơ cấu tổ chức quản lý đơn vị và
          quan hệ cấp trên – trực thuộc. Chức
          vụ và nhóm thành phần của từng người
          dùng được quản lý ở các mục riêng.
        </p>

      </div>

      {/* =================================================
          MODAL THÊM / SỬA
      ================================================= */}

      {showForm && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">

          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">

            {/* HEADER MODAL */}

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

              <div>

                <h2 className="text-base font-bold text-slate-900">
                  {editingOrganization
                    ? "Sửa đơn vị"
                    : "Thêm đơn vị"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Khai báo thông tin đơn vị
                  trong cơ cấu tổ chức.
                </p>

              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="cursor-pointer rounded-lg px-2 py-1 text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="p-5"
            >

              {/* TÊN */}

              <label className="block">

                <span className="text-sm font-semibold text-slate-700">
                  Tên đơn vị
                </span>

                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Tỉnh đoàn Lâm Đồng"
                  disabled={saving}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                />

              </label>

              {/* LOẠI */}

              <label className="mt-4 block">

                <span className="text-sm font-semibold text-slate-700">
                  Loại đơn vị
                </span>

                <select
                  value={organizationType}
                  onChange={(event) =>
                    setOrganizationType(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                >

                  <option value="">
                    Chọn loại đơn vị
                  </option>

                  <option value="Đoàn cấp tỉnh">
                    Đoàn cấp tỉnh
                  </option>

                  <option value="Đoàn cấp xã">
                    Đoàn cấp xã
                  </option>

                </select>

              </label>

              {/* CẤP TRÊN */}

              <label className="mt-4 block">

                <span className="text-sm font-semibold text-slate-700">
                  Đơn vị cấp trên
                </span>

                <select
                  value={parentId}
                  onChange={(event) =>
                    setParentId(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                >

                  <option value="">
                    Không có — đơn vị cấp cao nhất
                  </option>

                  {organizations
                    .filter(
                      (organization) =>
                        organization.id !==
                        editingOrganization?.id
                    )
                    .map(
                      (
                        organization
                      ) => (

                        <option
                          key={
                            organization.id
                          }
                          value={
                            organization.id
                          }
                        >
                          {
                            organization.name
                          }
                        </option>

                      )
                    )}

                </select>

              </label>

              {/* LỖI */}

              {error && (

                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  {error}
                </div>

              )}

              {/* BUTTON */}

              <div className="mt-6 flex justify-end gap-2">

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !name.trim()
                  }
                  className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {saving
                    ? "Đang lưu..."
                    : editingOrganization
                    ? "Lưu thay đổi"
                    : "Thêm đơn vị"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </main>
  );
}

