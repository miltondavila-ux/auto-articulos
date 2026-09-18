import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import ComposioPanel from "./ComposioPanel";

export default async function ComposioPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");

  return <ComposioPanel />;
}
