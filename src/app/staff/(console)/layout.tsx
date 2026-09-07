import { AppShell } from "@/components/AppShell";

export default function StaffConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell staffSession>
      <div className="content-shell py-5 sm:py-7 lg:py-8">{children}</div>
    </AppShell>
  );
}
