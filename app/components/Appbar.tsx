"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation";
import Link from "next/link";

export function Appbar() {
  const { data: session, status } = useSession();
  const router = useRouter();

  return <div className="flex justify-between px-5 py-4 md:px-10 xl:px-20">
    <div
      onClick={() => {
        router.push(session?.user ? '/dashboard' : '/')
      }}
      className={`text-lg font-bold flex flex-col justify-center text-white hover:cursor-pointer`}>
      Muzer
    </div>
    <div className="flex items-center gap-x-2">
      {session?.user &&
        <Button
          className="bg-purple-600 hover:bg-purple-700 text-white hover:cursor-pointer"
          onClick={() =>
            signOut({
              callbackUrl: "/"
            })
          }
        >
          Logout
        </Button>}
      {status === 'unauthenticated' && (
        <div className="space-x-3">
          <Button
            className="bg-purple-600 hover:bg-purple-700 hover:cursor-pointer"
            onClick={() => router.push("/auth?/authType=signIn")}
          >
            Signin
          </Button>
          <Link
            href={{
              pathname: "/auth",
              query: {
                authType: "signUp"
              }
            }}
          >
            <Button
              variant={"ghost"}
              className="text-white hover:bg-white/10 hover:cursor-pointer"
            >
              Signup
            </Button>
          </Link>
        </div>
      )
      }
    </div>
  </div>
} 