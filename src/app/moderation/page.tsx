import { auth } from "@/auth";
import { ModerationPageClient } from "@/components/moderation/ModerationPageClient";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ModerationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isOwner: true },
  });
  if (!me?.isOwner) redirect("/feed");

  return <ModerationPageClient />;
}
