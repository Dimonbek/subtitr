import { AdminPanel } from "@/components/admin-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subtitr — Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}
