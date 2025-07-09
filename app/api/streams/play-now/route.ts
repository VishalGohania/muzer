import { authOptions } from "@/lib/auth-options";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PlayNowSchema = z.object({
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
    const data = PlayNowSchema.parse(await req.json());

    const stream = await db.stream.findUnique({
      where: {
        id: data.streamId,
        userId: user.id 
      }
    });

    if (!stream) {
      return NextResponse.json({
        message: "Stream not found"
      }, {
        status: 404
      })
    }

    // Mark as played and set as current
    await db.stream.update({
      where: {
        id: data.streamId
      },
      data: {
        played: true
      }
    });

    await db.currentStream.upsert({
      where: {
        userId: user.id
      },
      create: {
        userId: user.id,
        streamId: data.streamId
      },
      update: {
        streamId: data.streamId
      }
    });

    return NextResponse.json({
      message: "Now playing",
      stream
    })
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      message: "Error while playing stream"
    }, {
      status: 500
    })
  }
}