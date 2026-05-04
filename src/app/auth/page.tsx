import { auth } from "@/auth";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { redirect } from "next/navigation";

export default async function AuthPage() {
  const session = await auth();
  if (session) redirect("/feed");

  return <AuthScreen />;
}
