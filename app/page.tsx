import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session-token")?.value;

  // Check if user has a valid session
  const user = token ? await validateSession(token) : null;

  if (user) {
    // Authenticated users go to orchestrator
    redirect("/orchestrator");
  } else {
    // Unauthenticated users go to login
    redirect("/login");
  }
}
