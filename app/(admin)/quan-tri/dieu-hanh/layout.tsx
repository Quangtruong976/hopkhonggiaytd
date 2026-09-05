export default function DieuHanhLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-w-0 flex-1">
      {children}
    </main>
  );
}

