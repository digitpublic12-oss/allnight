import { Suspense } from "react";
import SubmissionsReview from "@/features/admin/SubmissionsReview";

// 탭을 주소(?tab=)에서 읽기 때문에 Suspense로 감싼다
export default function AdminSubmissions() {
  return (
    <Suspense>
      <SubmissionsReview />
    </Suspense>
  );
}
