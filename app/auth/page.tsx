"use client";

import AuthScreen from "@/components/auth/auth-screen";
import { SignInFlow } from "@/types/auth-types";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";



export default function AuthPage() {
  const searchParams = useSearchParams();
  const formType = useMemo(() => searchParams.get("authType") as SignInFlow, [searchParams]
  )
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if(session.status === "authenticated") {
      router.push("/dashboard")
    }
  },[session.status, router])
  
  if(session.status === "authenticated") {
    return null;
  }
  return (
  <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-purple-900 to-gray-900">
    <AuthScreen authType={formType} />
  </div>
  )
}