import { auth } from "@/auth";
import { EventsPageClient } from "@/components/events/EventsPageClient";
import { redirect } from "next/navigation";

export default async function EventsPage() {
  const session = await auth();
  if (!session) redirect("/auth");

  return <EventsPageClient />;
}

