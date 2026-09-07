import { redirect } from "next/navigation";
import { Analyzer } from "@/components/Analyzer";
import { getCurrentUser } from "@/lib/auth/dal";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/anmelden");
  return <Analyzer />;
}
