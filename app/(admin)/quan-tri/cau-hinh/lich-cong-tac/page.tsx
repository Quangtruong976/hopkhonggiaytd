"use client";

import { useState } from "react";

type ConfigSection = {
  id: string;
  title: string;
  description: string;
  items: string[];
};

const initialSections: ConfigSection[] = [
  {
    id: "types",
    title: "Loại lịch",
    description:
      "Các loại hoạt động được sử dụng khi tạo lịch công tác.",
    items: [
      "Họp",
      "Hội nghị",
      "Làm việc",
      "Đi công tác",
      "Sự kiện",
      "Khác",
    ],
  },
  {
    id: "formats",
    title: "Hình thức",
    description:
      "Hình thức tổ chức của một lịch công tác.",
    items: [
      "Trực tiếp",
      "Trực tuyến",
      "Kết hợp",
    ],
  },
  {
    id: "statuses",
    title: "Trạng thái",
    description:
      "Trạng thái xử lý của lịch công tác.",
    items: [
      "Dự kiến",
      "Đã xác nhận",
      "Đã hoàn thành",
      "Đã hủy",
    ],
  },
  {
    id: "locations",
    title: "Địa điểm",
    description:
      "Các địa điểm thường xuyên được sử dụng trong lịch công tác.",
    items: [
      "Phòng họp Tỉnh đoàn",
      "Hội trường Tỉnh đoàn",
    ],
  },
];

export default function LichCongTacConfigPage() {
  const [sections, setSections] =
    useState<ConfigSection[]>(initialSections);

  const [openSection, setOpenSection] =
    useState<string | null>(null);

  const [newItem, setNewItem] = useState("");

  const [message, setMessage] = useState("");

  function toggleSection(id: string) {
    setOpenSection((current) =>
      current === id ? null : id
    );

    setNewItem("");
    setMessage("");
  }

  function addItem(sectionId: string) {
    const value = newItem.trim();

    if (!value) return;

    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) {
          return section;
        }

        const exists = section.items.some(
          (item) =>
            item.toLowerCase() ===
            value.toLowerCase()
        );

        if (exists) {
          return section;
        }

        return {
          ...section,
          items: [...section.items, value],
        };
      })
    );

    setNewItem("");

    setMessage("Đã thêm danh mục.");
  }

  function removeItem(
    sectionId: string,
    item: string
  ) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa "${item}" không?`
    );

    if (!confirmed) return;

    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) {
          return section;
        }

        return {
          ...section,
          items: section.items.filter(
            (value) => value !== item
          ),
        };
      })
    );

    setMessage(`Đã xóa "${item}".`);
  }

  return (
    <main className="min-h-screen bg-slate-100">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto max-w-7xl px-6 py-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
              ▣
            </div>

            <div>

              <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                Cấu hình hệ thống
              </div>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                Cấu hình Lịch công tác
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Thiết lập các danh mục dùng chung cho chức năng
                Lịch công tác.
              </p>

            </div>

          </div>

        </div>

      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-5xl px-6 py-6">

        {/* NOTE */}

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-700">

          <div className="font-semibold">
            Nguyên tắc
          </div>

          <div className="mt-1">
            Các danh mục tại đây do tài khoản Quản trị thiết lập.
            Tài khoản Điều hành sẽ sử dụng các danh mục này khi
            tạo lịch công tác cụ thể.
          </div>

        </div>

        {/* MESSAGE */}

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {/* CONFIG LIST */}

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">

            <h2 className="text-sm font-bold text-slate-800">
              Danh mục cấu hình
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Quản lý các danh mục được sử dụng trong Lịch công tác.
            </p>

          </div>

          <div className="divide-y divide-slate-100">

            {sections.map(
              (section, index) => {

                const opened =
                  openSection === section.id;

                return (
                  <div key={section.id}>

                    {/* ROW */}

                    <button
                      type="button"
                      onClick={() =>
                        toggleSection(
                          section.id
                        )
                      }
                      className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                    >

                      {/* STT */}

                      <div className="w-8 shrink-0 text-center text-sm font-semibold text-slate-400">
                        {index + 1}
                      </div>

                      {/* ICON */}

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        {index === 0
                          ? "☷"
                          : index === 1
                          ? "◈"
                          : index === 2
                          ? "●"
                          : "⌂"}
                      </div>

                      {/* CONTENT */}

                      <div className="min-w-0 flex-1">

                        <div className="text-sm font-bold text-slate-800">
                          {section.title}
                        </div>

                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {section.description}
                        </div>

                      </div>

                      {/* COUNT */}

                      <div className="hidden shrink-0 sm:block">

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                          {section.items.length} mục
                        </span>

                      </div>

                      {/* ARROW */}

                      <div className="w-5 shrink-0 text-center text-slate-400">
                        {opened ? "⌃" : "⌄"}
                      </div>

                    </button>

                    {/* DETAIL */}

                    {opened && (

                      <div className="border-t border-slate-100 bg-slate-50 px-5 py-5">

                        <div className="mx-auto max-w-3xl">

                          {/* ITEMS */}

                          <div className="space-y-2">

                            {section.items.length === 0 ? (

                              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-xs text-slate-400">
                                Chưa có danh mục.
                              </div>

                            ) : (

                              section.items.map(
                                (item, itemIndex) => (

                                  <div
                                    key={`${section.id}-${item}`}
                                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                                  >

                                    <div className="w-6 text-center text-xs font-semibold text-slate-400">
                                      {itemIndex + 1}
                                    </div>

                                    <div className="flex-1 text-sm text-slate-700">
                                      {item}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeItem(
                                          section.id,
                                          item
                                        )
                                      }
                                      className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                                    >
                                      Xóa
                                    </button>

                                  </div>

                                )
                              )

                            )}

                          </div>

                          {/* ADD */}

                          <div className="mt-4 flex flex-col gap-2 sm:flex-row">

                            <input
                              type="text"
                              value={newItem}
                              onChange={(event) =>
                                setNewItem(
                                  event.target.value
                                )
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.key ===
                                  "Enter"
                                ) {
                                  event.preventDefault();

                                  addItem(
                                    section.id
                                  );
                                }
                              }}
                              placeholder={`Thêm ${section.title.toLowerCase()}...`}
                              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                addItem(
                                  section.id
                                )
                              }
                              className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                            >
                              + Thêm
                            </button>

                          </div>

                        </div>

                      </div>

                    )}

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* FOOTER NOTE */}

        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-500">

          <strong className="text-slate-700">
            Lưu ý:
          </strong>{" "}
          Phiên bản hiện tại là giao diện khung để thống nhất
          cách quản lý. Dữ liệu sẽ được kết nối với Supabase
          sau khi thống nhất cấu trúc chính thức.

        </div>

      </div>

    </main>
  );
}