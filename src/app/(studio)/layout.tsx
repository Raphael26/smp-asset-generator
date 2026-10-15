import { Toaster } from "@/components/ui/Toaster";
import { Sidebar } from "@/components/studio/Sidebar";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <Toaster>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </Toaster>
  );
}
