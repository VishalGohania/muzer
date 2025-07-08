"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export function Redirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.push('/dashboard')
    }
  }, [session, router, status]);

  if (status === "loading") {
    return <div>loading...</div>;
  }

  return null;
}