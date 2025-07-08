import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";


export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if(!session?.user.id){
    return NextResponse.json(
      { message: "Unauthenticated"},
      { status: 403 }
    )
  }

  const user = session.user;

  try{
    const { searchParams } = new URL(req.url);
    const streamId = searchParams.get("streamId");

    if(!streamId) {
      return NextResponse.json(
        { message: "Stream ID is required"},
        { status: 400 }
      )
    }

    await db.stream.delete({
      where: {
        id: streamId,
        userId: user.id
      }
    });

    return NextResponse.json({
      message: "Song removed successfully",
    });
  } catch {
    return NextResponse.json(
      { message: "Error while removing the song"},
      { status: 400 }
    )
  }
}