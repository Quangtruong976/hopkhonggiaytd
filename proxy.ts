import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(name, value);
            }
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  /*
   * QUAN TRỌNG:
   *
   * Proxy chỉ chịu trách nhiệm duy trì session.
   *
   * KHÔNG truy vấn bảng profiles ở đây.
   *
   * Nếu mỗi request lại query profiles,
   * trang quản trị có thể bị chậm hoặc bị
   * redirect về /dang-nhap khi query lỗi/chậm.
   */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /*
   * CHƯA ĐĂNG NHẬP
   *
   * Chỉ chặn các khu vực cần đăng nhập.
   */

  if (
    !user &&
    (
      pathname.startsWith("/quan-tri") ||
      pathname.startsWith("/dai-bieu")
    )
  ) {
    return NextResponse.redirect(
      new URL("/dang-nhap", request.url)
    );
  }

  /*
   * ĐÃ ĐĂNG NHẬP
   *
   * Không kiểm tra role ở Proxy.
   *
   * Role sẽ được kiểm tra ở layout/page
   * tương ứng của từng khu vực.
   */

  return response;
}

export const config = {
  matcher: [
    "/quan-tri/:path*",
    "/dai-bieu/:path*",
  ],
};

