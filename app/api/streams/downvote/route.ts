import { authOptions } from "@/lib/auth-options";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpvoteSchema = z.object({
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
    const data = UpvoteSchema.parse(await req.json());
    const existingUpvote = await db.upvote.findUnique({
      where: {
        userId_streamId: {
          userId: user.id,
          streamId: data.streamId
        }
      }
    });

    if(existingUpvote) {
      await db.upvote.delete({
        where: {
          userId_streamId: {
            userId: user.id,
            streamId: data.streamId
          }      
        }
      })
  }
    return NextResponse.json({
      message: "Done!"
    })
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      message: "Error while downvoting"
    }, {
      status: 403
    })
  }
}