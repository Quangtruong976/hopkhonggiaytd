import { requireDelegate } from "@/lib/auth";
import DaiBieuShell from "./DaiBieuShell";

export default async function DaiBieuLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireDelegate();

  return (
    <DaiBieuShell>
      {children}
    </DaiBieuShell>
  );
}

