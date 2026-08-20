import { GmsShell } from "@/components/gms/GmsShell";

export default function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GmsShell>{children}</GmsShell>;
}
