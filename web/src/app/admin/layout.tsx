import type { Metadata } from "next";
import AdminShell from "@/features/admin/AdminShell";

export const metadata: Metadata = {
  title: "ALLNIGHT 관리자",
  // 관리자 화면은 검색엔진에 노출하지 않는다
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
