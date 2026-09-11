import { Analyzer } from "@/components/Analyzer";
import { LandingPage } from "@/components/landing/LandingPage";
import { getCurrentUser } from "@/lib/auth/dal";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <LandingPage />;
  return <Analyzer userId={user.id} />;
}
