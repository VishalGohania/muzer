import { YT_REGEX } from "@/lib/utils";
import db from "@/lib/db"
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { google } from 'googleapis';
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";

const youtube = google.youtube('v3');

const CreateStreamSchema = z.object({
  creatorId: z.string(),
  url: z.string()
}) 

const MAX_QUEUE_LEN = 20;

const sanitize = (str: string) => str.replace(/\u0000/g, "");

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ 
        message: "Not authenticated" 
      }, { 
        status: 401 // Unauthorized
      });
    }

    const data = CreateStreamSchema.parse(await req.json());

    if (!data.url.trim()) {
      return NextResponse.json(
        {
          message: "YouTube link cannot be empty",
        },
        {
          status: 400,
        },
      );
    }

    const user = await db.user.findFirst({
      where: {
        email: session.user.email,
      }
    });

    if(!user) {
      return NextResponse.json({ 
        message: "User not found in database"
      }, {
        status: 404 // Not Found
      })
    }

    const isYt = data.url.match(YT_REGEX);
    const extractedId = data.url ? data.url.match(YT_REGEX)?.[1] : null;



    if(!isYt || !extractedId) {
      return NextResponse.json({
        message: "Invalid YouTube URL Format"
      }, {
        status: 411
      })
    }

    // Check if the user is not the creator
    if(user.id !== data.creatorId) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      await db.stream.count({
        where: {
          userId: data.creatorId,
          addedBy: user.id,
          createAt: {
            gte: tenMinutesAgo
          }
        }
      });

      // Check for dublicate song in the last 10 minutes
      const dublicateSong = await db.stream.findFirst({
        where: {
          userId: data.creatorId,
          extractedId: extractedId,
          createAt: {
            gte: tenMinutesAgo,
          }
        }
      });

      if(dublicateSong) {
        return NextResponse.json(
          {
            message: "This song was already added in the last 10 minutes"
          },
          {
            status: 429,
          }
        )
      }


      const existingActiveStream = await db.stream.count({
        where: {
          userId: data.creatorId
        }
      })

      if(existingActiveStream > MAX_QUEUE_LEN) {
        return NextResponse.json({
          message: "Already at Limit"
        }, {
          status: 411
        }
      )
      }
    }
    try {
      const response = await youtube.videos.list({
        part: ['snippet'],
        id: [extractedId],
        key: process.env.YOUTUBE_API_KEY
      });

      if (!response.data.items || response.data.items.length === 0) {
        return NextResponse.json({
          message: "Could not find video details"
        }, {
          status: 400
        });
      }

      const videoDetails = response.data.items[0];
      const title = sanitize(videoDetails.snippet?.title || "Untitled Video");
      const thumbnails = videoDetails.snippet?.thumbnails;

      if (!thumbnails) {
        return NextResponse.json({
          message: "Could not find video thumbnails"
        }, {
          status: 400
        });
      }

      // Get the highest quality thumbnail
      const thumbnailUrl = thumbnails.maxres?.url || 
                          thumbnails.high?.url || 
                          thumbnails.medium?.url || 
                          thumbnails.default?.url || 
                          "https://placehold.co/128x80/1f2937/ffffff?text=No+Image";

      const stream = await db.stream.create({
        data: {
          userId: data.creatorId,
          addedBy: user.id,
          url: data.url,
          extractedId: extractedId,
          type: "Youtube",
          title: title ?? "Can't find video",
          smallImg: thumbnailUrl,
          bigImg: thumbnailUrl
        }
      });

      return NextResponse.json({
        ...stream,
        hasUpvoted: false,
        upvotes: 0,
      })
    } catch (error) {
      return NextResponse.json({
        message: "Error while fetching video details: " + (error instanceof Error ? error.message : String(error))
      }, {
        status: 400
      });
    }     
} catch (e) {
    console.error(e);
    return NextResponse.json({
      message: "Error while adding a stream"
    }, {
      status: 411
    })
  }
  
}

export async function GET(req: NextRequest) {
  const creatorId = req.nextUrl.searchParams.get("creatorId") || "";
  const session = await getServerSession(authOptions);
 
  if (!session?.user?.email) {
    return NextResponse.json({ 
      message: "Not authenticated" 
    }, { 
      status: 401 // Unauthorized
    });
  }

   if (!/^[0-9a-fA-F-]{36}$/.test(creatorId)) {
    return NextResponse.json({ message: "Invalid creatorId format" }, { status: 400 });
  }

  const user = await db.user.findFirst({
    where: {
      email: session.user.email,
    }
  });

  if(!user){
    return NextResponse.json({
      message: "User not found in database"
    }, {
      status: 404 // Not Found
    })
  }

  if(!creatorId || creatorId === "undefined") {
    return NextResponse.json({
      message: "CreatorId is required"
    }, {
      status: 411
    })
  }

  const sanitizedId = sanitize(creatorId);

  const [streams, activeStream] = await Promise.all([ 
    db.stream.findMany({
      where: {
        userId: sanitizedId,
        played: false
      },
      include: {
        _count: {
          select: {
            upvotes: true
          }
        },
        upvotes: {
          where: {
            userId: user.id
          }
        }
      }
  }), 
  db.currentStream.findFirst({
    where: {
      userId: sanitizedId
    },
    include: {
      stream: true
    }
  })])

  const isCreator = user.id === creatorId

  return NextResponse.json({
    streams: streams.map(({_count, ...rest}) => ({
      ...rest,
      upvotes: _count.upvotes,
      hasUpvoted: rest.upvotes.length ? true: false
    })),
    activeStream,
    isCreator
  })

}