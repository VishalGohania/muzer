import { authOptions } from "@/lib/auth-options";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const user = await db.user.findFirst({
    where: {
      email: session?.user?.email ?? ""
    }
  })
  
  if(!user) {
    return NextResponse.json({
      message: "Unauthenticated"
    }, {
      status: 403
    })
  }

  try {
    // Remove current stream
    await db.currentStream.deleteMany({
      where: {
        userId: user.id
      }
    });

    return NextResponse.json({
      message: "Current stream removed"
    })
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      message: "Error while removing current stream"
    }, {
      status: 500
    })
  }
}