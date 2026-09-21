import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import PostPeerPanel from "./PostPeerPanel";

export default async function PostPeerPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/dashboard");
  return <PostPeerPanel />;
}
