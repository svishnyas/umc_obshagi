import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/auth");

  return children;
}
