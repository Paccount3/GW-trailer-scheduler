import { AppShell } from "@/components/AppShell";

export default function StaffLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <div className="content-shell">{children}</div>
    </AppShell>
  );
}
