import { authOptions } from "@/lib/auth-options";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication
    if (!session?.user?.email) {
      return NextResponse.json({
        message: "Unauthenticated"
      }, {
        status: 403
      });
    }

    const user = await db.user.findFirst({
      where: {
        email: session?.user?.email ?? ""
      }
    });

    if (!user) {
      return NextResponse.json({
        message: "User not found"
      }, {
        status: 404
      });
    }

    // Find the current active stream
    const current = await db.currentStream.findFirst({
      where: { userId: user.id }
    });

    // Mark the current as played, if any
    if (current?.streamId) {
      await db.stream.update({
        where: { id: current.streamId },
        data: { played: true, playedTs: new Date() }
      });
    }

    // Find the next most upvoted unplayed stream
    const nextStream = await db.stream.findFirst({
      where: { userId: user.id, played: false },
      orderBy: { upvotes: { _count: 'desc' } }
    });

    if (!nextStream) {
      // Clear the current stream since there's nothing to play
      await db.currentStream.deleteMany({ where: { userId: user.id } });
      return NextResponse.json({ message: "No more streams in queue", stream: null });
    }

    // Set the new current stream
    await db.currentStream.upsert({
      where: { userId: user.id },
      update: { streamId: nextStream.id },
      create: { userId: user.id, streamId: nextStream.id }
    });

    return NextResponse.json({ stream: nextStream });
  } catch (error) {
    console.error("Error in next stream route:", error);
    return NextResponse.json({
      message: "Internal server error"
    }, {
      status: 500
    });
  }
}