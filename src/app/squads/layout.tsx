import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SquadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/auth");

  return (
    <div className="squads-app">
      <header className="squads-top">
        <Link href="/feed" className="squads-top-link">
          ← Лента
        </Link>
        <span className="squads-top-title">Сквады комнат</span>
        <Link href="/squads" className="squads-top-link squads-top-link-right">
          Список
        </Link>
      </header>
      <main className="squads-main">{children}</main>
    </div>
  );
}
