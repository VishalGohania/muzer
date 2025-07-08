import StreamView from "@/app/components/StreamView";
import { authOptions } from "@/lib/auth-options";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";


export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return redirect("/auth?authType=signIn");
  }

  const user = await db.user.findFirst({
    where: {
      email: session.user.email,
    },
  });

  if (!user) {
    return <div>User not found.</div>;
  }

  return (
    <div>
      <StreamView creatorId={user.id} playVideo={true} />
    </div>
  );
}