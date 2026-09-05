import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/* =========================================================
   SUPABASE ADMIN CLIENT
   Chỉ chạy phía server.
   Không đưa SERVICE ROLE KEY ra trình duyệt.
========================================================= */

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/* =========================================================
   API XÓA TOÀN BỘ CUỘC HỌP
========================================================= */

export async function POST(
  request: Request
) {
  try {
    /* =====================================================
       1. KIỂM TRA ĐĂNG NHẬP
    ===================================================== */

    const supabaseServer =
      await createSupabaseServerClient();

    const {
      data: {
        user,
      },
    } =
      await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Phiên đăng nhập không hợp lệ.",
        },
        {
          status: 401,
        }
      );
    }

    /* =====================================================
       2. KIỂM TRA QUYỀN ADMIN
    ===================================================== */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseServer
        .from("profiles")
        .select(
          "id, role, is_active"
        )
        .eq("id", user.id)
        .single();

    if (profileError) {
      console.error(
        "LỖI KIỂM TRA PROFILE:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Không thể xác định quyền tài khoản.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      !profile ||
      profile.role !== "admin" ||
      profile.is_active !== true
    ) {
      return NextResponse.json(
        {
          error:
            "Bạn không có quyền xóa cuộc họp.",
        },
        {
          status: 403,
        }
      );
    }

    /* =====================================================
       3. ĐỌC meetingId
    ===================================================== */

    const body =
      await request.json();

    const meetingId =
      Number(body?.meetingId);

    if (
      !Number.isInteger(meetingId) ||
      meetingId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "ID cuộc họp không hợp lệ.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       4. ADMIN CLIENT
    ===================================================== */

    const supabaseAdmin =
      createSupabaseAdmin();

    /* =====================================================
       5. KIỂM TRA CUỘC HỌP CÓ TỒN TẠI
    ===================================================== */

    const {
      data: meeting,
      error: meetingError,
    } =
      await supabaseAdmin
        .from("meetings")
        .select(
          "id, title"
        )
        .eq(
          "id",
          meetingId
        )
        .single();

    if (
      meetingError ||
      !meeting
    ) {
      console.error(
        "KHÔNG TÌM THẤY CUỘC HỌP:",
        meetingError
      );

      return NextResponse.json(
        {
          error:
            "Không tìm thấy cuộc họp cần xóa.",
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       6. LẤY CÁC BIỂU QUYẾT CỦA CUỘC HỌP

       Cần lấy ID trước vì:
       meeting_vote_items
       meeting_vote_participants

       liên kết với meeting_votes.
    ===================================================== */

    const {
      data: votes,
      error: votesError,
    } =
      await supabaseAdmin
        .from("meeting_votes")
        .select("id")
        .eq(
          "meeting_id",
          meetingId
        );

    if (votesError) {
      console.error(
        "LỖI LẤY BIỂU QUYẾT:",
        votesError
      );

      return NextResponse.json(
        {
          error:
            `Không thể chuẩn bị xóa biểu quyết: ${votesError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    const voteIds =
      (votes || []).map(
        (vote) => vote.id
      );

    /* =====================================================
       7. LẤY FILE CỦA TÀI LIỆU
    ===================================================== */

    const {
      data: documents,
      error: documentsError,
    } =
      await supabaseAdmin
        .from("meeting_documents")
        .select(
          "id, file_path"
        )
        .eq(
          "meeting_id",
          meetingId
        );

    if (documentsError) {
      console.error(
        "LỖI LẤY TÀI LIỆU:",
        documentsError
      );

      return NextResponse.json(
        {
          error:
            `Không thể chuẩn bị xóa tài liệu: ${documentsError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       8. LẤY FILE CỦA Ý KIẾN / GÓP Ý
    ===================================================== */

    const {
      data: opinions,
      error: opinionsError,
    } =
      await supabaseAdmin
        .from("meeting_opinions")
        .select(
          "id, file_path"
        )
        .eq(
          "meeting_id",
          meetingId
        );

    if (opinionsError) {
      console.error(
        "LỖI LẤY Ý KIẾN:",
        opinionsError
      );

      return NextResponse.json(
        {
          error:
            `Không thể chuẩn bị xóa ý kiến: ${opinionsError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       9. THU THẬP FILE STORAGE
    ===================================================== */

    const storagePaths =
      [
        ...(documents || [])
          .map(
            (item) =>
              item.file_path
          )
          .filter(
            (
              path
            ): path is string =>
              Boolean(path)
          ),

        ...(opinions || [])
          .map(
            (item) =>
              item.file_path
          )
          .filter(
            (
              path
            ): path is string =>
              Boolean(path)
          ),
      ];

    /* =====================================================
       10. XÓA PHIẾU BIỂU QUYẾT

       meeting_vote_items
       phải xóa trước.
    ===================================================== */

    if (voteIds.length > 0) {

      const {
        error:
          voteItemsError,
      } =
        await supabaseAdmin
          .from(
            "meeting_vote_items"
          )
          .delete()
          .in(
            "vote_id",
            voteIds
          );

      if (voteItemsError) {
        console.error(
          "LỖI XÓA PHIẾU BIỂU QUYẾT:",
          voteItemsError
        );

        return NextResponse.json(
          {
            error:
              `Không thể xóa phiếu biểu quyết: ${voteItemsError.message}`,
          },
          {
            status: 500,
          }
        );
      }

      /* ===================================================
         11. XÓA NGƯỜI NHẬN PHIẾU
      =================================================== */

      const {
        error:
          voteParticipantsError,
      } =
        await supabaseAdmin
          .from(
            "meeting_vote_participants"
          )
          .delete()
          .in(
            "vote_id",
            voteIds
          );

      if (voteParticipantsError) {
        console.error(
          "LỖI XÓA NGƯỜI NHẬN PHIẾU:",
          voteParticipantsError
        );

        return NextResponse.json(
          {
            error:
              `Không thể xóa danh sách người nhận phiếu: ${voteParticipantsError.message}`,
          },
          {
            status: 500,
          }
        );
      }
    }

    /* =====================================================
       12. XÓA BIỂU QUYẾT
    ===================================================== */

    const {
      error:
        deleteVotesError,
    } =
      await supabaseAdmin
        .from("meeting_votes")
        .delete()
        .eq(
          "meeting_id",
          meetingId
        );

    if (deleteVotesError) {
      console.error(
        "LỖI XÓA BIỂU QUYẾT:",
        deleteVotesError
      );

      return NextResponse.json(
        {
          error:
            `Không thể xóa biểu quyết: ${deleteVotesError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       13. XÓA Ý KIẾN / GÓP Ý
    ===================================================== */

    const {
      error:
        deleteOpinionsError,
    } =
      await supabaseAdmin
        .from(
          "meeting_opinions"
        )
        .delete()
        .eq(
          "meeting_id",
          meetingId
        );

    if (deleteOpinionsError) {
      console.error(
        "LỖI XÓA Ý KIẾN:",
        deleteOpinionsError
      );

      return NextResponse.json(
        {
          error:
            `Không thể xóa ý kiến: ${deleteOpinionsError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       14. XÓA TÀI LIỆU
    ===================================================== */

    const {
      error:
        deleteDocumentsError,
    } =
      await supabaseAdmin
        .from(
          "meeting_documents"
        )
        .delete()
        .eq(
          "meeting_id",
          meetingId
        );

    if (deleteDocumentsError) {
      console.error(
        "LỖI XÓA TÀI LIỆU:",
        deleteDocumentsError
      );

      return NextResponse.json(
        {
          error:
            `Không thể xóa tài liệu: ${deleteDocumentsError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       15. XÓA NHIỆM VỤ
    ===================================================== */

    const {
      error:
        deleteTasksError,
    } =
      await supabaseAdmin
        .from(
          "meeting_tasks"
        )
        .delete()
        .eq(
          "meeting_id",
          meetingId
        );

    if (deleteTasksError) {
      console.error(
        "LỖI XÓA NHIỆM VỤ:",
        deleteTasksError
      );

      return NextResponse.json(
        {
          error:
            `Không thể xóa nhiệm vụ: ${deleteTasksError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       16. XÓA ĐẠI BIỂU / THÀNH PHẦN CUỘC HỌP
    ===================================================== */

    const {
      error:
        deleteParticipantsError,
    } =
      await supabaseAdmin
        .from(
          "meeting_participants"
        )
        .delete()
        .eq(
          "meeting_id",
          meetingId
        );

    if (deleteParticipantsError) {
      console.error(
        "LỖI XÓA ĐẠI BIỂU:",
        deleteParticipantsError
      );

      return NextResponse.json(
        {
          error:
            `Không thể xóa thành phần cuộc họp: ${deleteParticipantsError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       17. XÓA CUỘC HỌP GỐC
    ===================================================== */

    const {
      error:
        deleteMeetingError,
    } =
      await supabaseAdmin
        .from("meetings")
        .delete()
        .eq(
          "id",
          meetingId
        );

    if (deleteMeetingError) {
      console.error(
        "LỖI XÓA CUỘC HỌP:",
        deleteMeetingError
      );

      return NextResponse.json(
        {
          error:
            `Không thể xóa cuộc họp: ${deleteMeetingError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       18. XÓA FILE STORAGE

       Bucket:
       meeting-documents

       Chỉ thực hiện sau khi dữ liệu DB
       đã được xóa thành công.
    ===================================================== */

    let storageWarning: string | null =
      null;

    if (
      storagePaths.length > 0
    ) {
      /* -----------------------------------------------
         Supabase Storage giới hạn số object
         trong một lần remove.
      ------------------------------------------------ */

      const chunkSize = 1000;

      for (
        let i = 0;
        i < storagePaths.length;
        i += chunkSize
      ) {
        const chunk =
          storagePaths.slice(
            i,
            i + chunkSize
          );

        const {
          error:
            storageError,
        } =
          await supabaseAdmin.storage
            .from(
              "meeting-documents"
            )
            .remove(chunk);

        if (storageError) {
          console.error(
            "LỖI XÓA FILE STORAGE:",
            storageError
          );

          storageWarning =
            `Cuộc họp đã được xóa khỏi cơ sở dữ liệu nhưng một số file Storage chưa xóa được: ${storageError.message}`;

          break;
        }
      }
    }

    /* =====================================================
       19. TRẢ KẾT QUẢ
    ===================================================== */

    return NextResponse.json(
      {
        success: true,
        message:
          storageWarning ||
          `Đã xóa toàn bộ cuộc họp "${meeting.title}".`,
        storageWarning,
      },
      {
        status: 200,
      }
    );

  } catch (error) {

    console.error(
      "LỖI API XÓA CUỘC HỌP:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra khi xóa cuộc họp.",
      },
      {
        status: 500,
      }
    );
  }
}

