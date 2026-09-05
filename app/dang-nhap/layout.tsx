export default function DangNhapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * Trang đăng nhập là trang độc lập.
   *
   * Không kiểm tra Supabase Auth ở đây.
   * Không query profiles ở đây.
   *
   * Việc kiểm tra tài khoản và điều hướng
   * được thực hiện trong page.tsx sau khi
   * đăng nhập thành công.
   */

  return children;
}

