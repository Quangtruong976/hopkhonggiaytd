"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
} from "docx";

type Opinion = {
  id: number;
  meeting_id: number;
  participant_id: number | null;
  speaker_name: string;
  speaker_position: string | null;
  content: string | null;
  status: string;
  registered_at: string;
  spoken_at: string | null;
  opinion_type: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
};

type OpinionsTabProps = {
  meetingId: number;
};

export default function OpinionsTab({
  meetingId,
}: OpinionsTabProps) {
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadOpinions() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("meeting_opinions")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("registered_at", {
        ascending: true,
      });

    if (error) {
      console.error(error);

      setError(
        `Không thể tải danh sách góp ý: ${error.message}`
      );
    } else {
      setOpinions(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOpinions();
  }, [meetingId]);

  /*
   * MỞ FILE GÓP Ý
   */
  async function openFile(filePath: string) {
    setError("");
    setMessage("");

    const { data, error } = await supabase.storage
      .from("meeting-documents")
      .createSignedUrl(filePath, 60 * 10);

    if (error) {
      console.error(error);

      setError(
        `Không thể mở file: ${error.message}`
      );

      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  /*
   * ĐỊNH DẠNG DUNG LƯỢNG FILE
   */
  function formatSize(size: number | null) {
    if (!size) return "";

    if (size < 1024 * 1024) {
      return `${Math.round(size / 1024)} KB`;
    }

    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }

  /*
   * ĐỊNH DẠNG NGÀY GIỜ
   */
  function formatDateTime(date: string) {
    return new Date(date).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /*
   * TẢI TOÀN BỘ Ý KIẾN THÀNH FILE DOCX
   */
  async function downloadOpinions() {
    if (opinions.length === 0) {
      setError("Chưa có ý kiến nào để tải về.");
      return;
    }

    setDownloading(true);
    setError("");
    setMessage("");

    try {
      const children: (
        | Paragraph
        | Table
      )[] = [];

      /*
       * TIÊU ĐỀ
       */

      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 100,
          },
          children: [
            new TextRun({
              text: "TỔNG HỢP Ý KIẾN ĐẠI BIỂU",
              bold: true,
              size: 28,
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 250,
          },
          children: [
            new TextRun({
              text: `Cuộc họp #${meetingId}`,
              size: 22,
            }),
          ],
        })
      );

      /*
       * THÔNG TIN CHUNG
       */

      children.push(
        new Paragraph({
          spacing: {
            after: 100,
          },
          children: [
            new TextRun({
              text: `Tổng số lượt góp ý: ${opinions.length}`,
              bold: true,
              size: 22,
            }),
          ],
        })
      );

      const participantCount = new Set(
        opinions
          .map((item) => item.participant_id)
          .filter((id) => id !== null)
      ).size;

      children.push(
        new Paragraph({
          spacing: {
            after: 250,
          },
          children: [
            new TextRun({
              text: `Số đại biểu có góp ý: ${participantCount}`,
              size: 22,
            }),
          ],
        })
      );

      /*
       * BẢNG TỔNG HỢP
       */

      const headerRow = new TableRow({
        children: [
          new TableCell({
            width: {
              size: 700,
              type: WidthType.DXA,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "STT",
                    bold: true,
                  }),
                ],
              }),
            ],
          }),

          new TableCell({
            width: {
              size: 2200,
              type: WidthType.DXA,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Đại biểu",
                    bold: true,
                  }),
                ],
              }),
            ],
          }),

          new TableCell({
            width: {
              size: 2200,
              type: WidthType.DXA,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Chức vụ",
                    bold: true,
                  }),
                ],
              }),
            ],
          }),

          new TableCell({
            width: {
              size: 4500,
              type: WidthType.DXA,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Nội dung góp ý",
                    bold: true,
                  }),
                ],
              }),
            ],
          }),

          new TableCell({
            width: {
              size: 2200,
              type: WidthType.DXA,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "File đính kèm",
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      const dataRows = opinions.map(
        (opinion, index) =>
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: String(index + 1),
                      }),
                    ],
                  }),
                ],
              }),

              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          opinion.speaker_name ||
                          "Chưa xác định",
                      }),
                    ],
                  }),
                ],
              }),

              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          opinion.speaker_position ||
                          "",
                      }),
                    ],
                  }),
                ],
              }),

              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          opinion.content ||
                          "Không nhập nội dung, chỉ gửi file.",
                      }),
                    ],
                  }),
                ],
              }),

              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          opinion.file_name ||
                          "",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
      );

      children.push(
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            headerRow,
            ...dataRows,
          ],
        })
      );

      /*
       * CHI TIẾT TỪNG GÓP Ý
       */

      children.push(
        new Paragraph({
          spacing: {
            before: 350,
            after: 200,
          },
          children: [
            new TextRun({
              text: "CHI TIẾT Ý KIẾN",
              bold: true,
              size: 24,
            }),
          ],
        })
      );

      opinions.forEach((opinion, index) => {
        children.push(
          new Paragraph({
            spacing: {
              before: 200,
              after: 80,
            },
            children: [
              new TextRun({
                text: `${index + 1}. ${opinion.speaker_name}`,
                bold: true,
                size: 22,
              }),
            ],
          })
        );

        if (opinion.speaker_position) {
          children.push(
            new Paragraph({
              spacing: {
                after: 80,
              },
              children: [
                new TextRun({
                  text: `Chức vụ: ${opinion.speaker_position}`,
                  size: 21,
                }),
              ],
            })
          );
        }

        if (opinion.opinion_type) {
          children.push(
            new Paragraph({
              spacing: {
                after: 80,
              },
              children: [
                new TextRun({
                  text: `Loại ý kiến: ${opinion.opinion_type}`,
                  size: 21,
                }),
              ],
            })
          );
        }

        children.push(
          new Paragraph({
            spacing: {
              after: 80,
            },
            children: [
              new TextRun({
                text: `Thời gian gửi: ${formatDateTime(
                  opinion.registered_at
                )}`,
                size: 21,
              }),
            ],
          })
        );

        children.push(
          new Paragraph({
            spacing: {
              after: 100,
            },
            children: [
              new TextRun({
                text: "Nội dung:",
                bold: true,
                size: 21,
              }),
            ],
          })
        );

        if (opinion.content) {
          const contentLines =
            opinion.content.split("\n");

          contentLines.forEach((line) => {
            children.push(
              new Paragraph({
                spacing: {
                  after: 60,
                },
                children: [
                  new TextRun({
                    text: line,
                    size: 21,
                  }),
                ],
              })
            );
          });
        } else {
          children.push(
            new Paragraph({
              spacing: {
                after: 100,
              },
              children: [
                new TextRun({
                  text:
                    "Đại biểu không nhập nội dung bằng văn bản.",
                  italics: true,
                  size: 21,
                }),
              ],
            })
          );
        }

        if (opinion.file_name) {
          children.push(
            new Paragraph({
              spacing: {
                after: 120,
              },
              children: [
                new TextRun({
                  text: `File đính kèm: ${opinion.file_name}`,
                  bold: true,
                  size: 21,
                }),
              ],
            })
          );
        }
      });

      /*
       * TẠO FILE WORD
       */

      const doc = new Document({
        sections: [
          {
            properties: {},
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `Tong-hop-y-kien-cuoc-hop-${meetingId}.docx`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      setMessage(
        "Đã tạo file Word tổng hợp ý kiến."
      );
    } catch (error) {
      console.error(error);

      setError(
        "Không thể tạo file Word tổng hợp ý kiến."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-5">

      {/* TIÊU ĐỀ */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

        <div>
        <h2 className="text-base font-bold text-emerald-900">
        <span className="text-emerald-900">● </span>
            Ý kiến đại biểu
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Tổng hợp các góp ý đại biểu gửi trước cuộc họp.
          </p>
        </div>

        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={loadOpinions}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            ↻ Làm mới
          </button>

          <button
            type="button"
            onClick={downloadOpinions}
            disabled={
              downloading ||
              opinions.length === 0
            }
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading
              ? "Đang tạo Word..."
              : "⬇ Tải tổng hợp (.docx)"}
          </button>

        </div>
      </div>

      {/* THÔNG BÁO */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          {message}
        </div>
      )}

      {/* THỐNG KÊ */}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-[11px] text-slate-400">
            Lượt góp ý
          </div>

          <div className="mt-1 text-lg font-bold text-slate-900">
            {opinions.length}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-[11px] text-slate-400">
            Đại biểu góp ý
          </div>

          <div className="mt-1 text-lg font-bold text-slate-900">
            {
              new Set(
                opinions
                  .map(
                    (item) =>
                      item.participant_id
                  )
                  .filter(
                    (id) => id !== null
                  )
              ).size
            }
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-[11px] text-slate-400">
            File đính kèm
          </div>

          <div className="mt-1 text-lg font-bold text-slate-900">
            {
              opinions.filter(
                (item) =>
                  !!item.file_path
              ).length
            }
          </div>
        </div>

      </div>

      {/* DANH SÁCH Ý KIẾN */}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-4 py-3">

          <div className="flex items-center justify-between">

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Các góp ý đã gửi
              </h3>

              <p className="mt-0.5 text-[11px] text-slate-400">
                Đại biểu có thể gửi nhiều góp ý cho cùng một cuộc họp.
              </p>
            </div>

          </div>

        </div>

        {loading ? (

          <div className="py-10 text-center text-xs text-slate-500">
            Đang tải ý kiến...
          </div>

        ) : opinions.length === 0 ? (

          <div className="px-4 py-10 text-center">

            <div className="text-3xl">
              💬
            </div>

            <div className="mt-2 text-sm font-semibold text-slate-700">
              Chưa có góp ý nào
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Khi đại biểu gửi góp ý, nội dung sẽ xuất hiện tại đây.
            </div>

          </div>

        ) : (

          <div className="divide-y divide-slate-100">

            {opinions.map(
              (opinion, index) => (

                <div
                  key={opinion.id}
                  className="px-4 py-3 hover:bg-slate-50/60"
                >

                  <div className="flex gap-3">

                    {/* STT */}

                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">

                      {/* NGƯỜI GỬI */}

                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          <div className="text-sm font-semibold text-slate-900">
                            {opinion.speaker_name}
                          </div>

                          {opinion.speaker_position && (
                            <div className="text-xs text-slate-500">
                              {opinion.speaker_position}
                            </div>
                          )}

                        </div>

                        <div className="text-[11px] text-slate-400">
                          {formatDateTime(
                            opinion.registered_at
                          )}
                        </div>

                      </div>

                      {/* LOẠI Ý KIẾN */}

                      {opinion.opinion_type && (
                        <div className="mt-1">

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                            {opinion.opinion_type}
                          </span>

                        </div>
                      )}

                      {/* NỘI DUNG */}

                      {opinion.content && (
                        <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                          {opinion.content}
                        </div>
                      )}

                      {/* FILE */}

                      {opinion.file_path && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">

                          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">

                            <span className="text-base">
                              📎
                            </span>

                            <div className="min-w-0">

                              <div className="truncate text-xs font-semibold text-slate-700">
                                {opinion.file_name ||
                                  "File góp ý"}
                              </div>

                              {opinion.file_size && (
                                <div className="text-[10px] text-slate-400">
                                  {formatSize(
                                    opinion.file_size
                                  )}
                                </div>
                              )}

                            </div>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              openFile(
                                opinion.file_path!
                              )
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Xem file
                          </button>

                        </div>
                      )}

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}
