import { authOptions } from "@/lib/auth-options";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MarkPlayedSchema = z.object({
  streamId: z.string(),
})

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
    const data = MarkPlayedSchema.parse(await req.json());

    // Mark the stream as played
    await db.stream.update({
      where: {
        id: data.streamId
      },
      data: {
        played: true
      }
    });

    return NextResponse.json({
      message: "Stream marked as played"
    })
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      message: "Error while marking stream as played"
    }, {
      status: 500
    })
  }
}
