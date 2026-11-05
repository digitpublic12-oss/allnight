import AppShell from "@/features/shell/AppShell";

// 같은 화면에서 왼쪽 패널만 바뀐다. 주소로 바로 들어오거나 새로고침해도 해당 패널이 열린다.
export default function Page() {
  return <AppShell />;
}
