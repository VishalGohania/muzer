"use client"

import type React from "react"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { ChevronUp, Play, Share2, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { Appbar } from "../components/Appbar"
import LiteYouTubeEmbed from "react-lite-youtube-embed"
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css"
import { YT_REGEX } from "@/lib/utils"
import YouTubePlayer from "youtube-player"

interface Video {
  id: string
  type: string
  title: string
  url: string
  extractedId: string
  thumbnail: string
  upvotes: number
  downvotes: number
  haveUpvoted: boolean
  smallImg: string
  bigImg: string
  active: boolean
  userId: string
  spaceId: string
}

const REFRESH_INTERVAL_MS = 10 * 1000;


export default function StreamView({
  creatorId,
  playVideo = false,
}: {
  creatorId: string,
  playVideo: boolean,
}) {
  const [inputLink, setInputLink] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [videoId, setVideoId] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<Video | null>(null);
  const [queue, setQueue] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [playNextLoader, setPlayNextLoader] = useState(false);
  const videoPlayerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReturnType<typeof YouTubePlayer> | null>(null);


  const refreshStreams = useCallback(async () => {
    try {
      const res = await fetch(`/api/streams/?creatorId=${creatorId}`, {
        credentials: "include"
      });
      const json = await res.json();
      if (json.streams && Array.isArray(json.streams)) {
        setQueue(json.streams.length > 0 ? json.streams.sort((a: Video, b: Video) => b.upvotes - a.upvotes) : []);
      } else {
        setQueue([]);
      }

      setCurrentlyPlaying((video) => {
        if (video?.id === json.activeStream?.stream?.id) {
          return video;
        }
        return json.activeStream?.stream || null;
      });

      setIsCreator(json.isCreator);
    } catch (error) {
      console.error("Error refreshing streams:", error);
      setQueue([]);
      setCurrentlyPlaying(null);
    }
  }, [creatorId])

  useEffect(() => {
    refreshStreams();
    const interval = setInterval(() => {
      refreshStreams();
    }, REFRESH_INTERVAL_MS)

    return () => clearInterval(interval);
  }, [creatorId, refreshStreams]);

  const playNow = async (streamId: string) => {
    try {
      setPlayNextLoader(true);

      // Mark the specific song as played and set as current
      await fetch('/api/streams/play-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ streamId })
      });

      // Refresh to get updated queue
      await refreshStreams();
    } catch (error) {
      console.error('Error playing song now:', error);
      toast.error('Failed to play song');
    } finally {
      setPlayNextLoader(false);
    }
  };

  const playNext = useCallback(async () => {
    if (queue.length > 0) {
      try {
        setPlayNextLoader(true);
        const data = await fetch('/api/streams/next', {
          method: "GET",
          credentials: 'include'
        });

        if (!data.ok) {
          throw new Error('Failed to fetch next stream');
        }

        const json = await data.json();

        if (json.stream) {
          setCurrentlyPlaying(json.stream);
          setQueue(q => q.filter((x) => x.id !== json.stream?.id));
        }
      } catch (e) {
        console.error("Error playing next song:", e);
        toast.error('Failed to play next song');
      } finally {
        setPlayNextLoader(false);
      }
    }
  }, [queue.length]);

  const playNextRef = useRef(playNext);
  playNextRef.current = playNext;

  useEffect(() => {
    const playerElement = videoPlayerRef.current;

    if (!playerElement || !playVideo) return;

    const initializePlayer = async () => {
      try {
        // clean up existing player
        if (playerRef.current) {
          await playerRef.current.destroy();
          playerRef.current = null;
        }

        // Create new player
        playerRef.current = YouTubePlayer(playerElement, {
          playerVars: {
            origin: window.location.origin,
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1
          }
        });

        // set up event listner
        playerRef.current.on('stateChange', async (event) => {
          if (event.data === 0) {

            if (currentlyPlaying) {
              // Mark current video as played
              await markAsPlayed(currentlyPlaying.id);

              // Remove from current stream
              await fetch('/api/streams/remove-current', {
                method: 'POST',
                credentials: 'include'
              });
            }

            setTimeout(() => {
              playNextRef.current();
            }, 1000)
          }
        });

        if (currentlyPlaying) {
          await playerRef.current.loadVideoById(currentlyPlaying.extractedId);
          await playerRef.current.playVideo();
        }

      } catch (error) {
        console.error("Error initializing Youtube player:", error);
      }
    }
    initializePlayer();
    // Only clean up on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
    // Only depend on currentlyPlaying
  }, [currentlyPlaying, playVideo]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/streams/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          creatorId,
          url: inputLink.trim(),
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add song');
      }

      const data = await res.json();

      // update the queue with new song
      setQueue(prevQueue => [...prevQueue, data].sort((a, b) => b.upvotes - a.upvotes));
      setInputLink("");
      toast.success("Song added to queue successfully!");

    } catch (error) {
      console.error("Error adding song:", error);
      toast.error("Failed to add song");
    } finally {
      setLoading(false);
    }
  }

  const markAsPlayed = async (streamId: string) => {
    try {
      await fetch('/api/streams/mark-played', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ streamId })
      });
    } catch (error) {
      console.error('Error marking stream as played:', error);
    }
  };


  const handleVote = async (id: string) => {
    try {
      const res = await fetch(`/api/streams/upvote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          streamId: id
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to vote' }));
        throw new Error(errorData.message || 'Failed to vote');
      }

      setQueue(prevQueue =>
        prevQueue.map(video => {
          if (video.id === id) {
            const newHaveUpvoted = !video.haveUpvoted;
            return {
              ...video,
              upvotes: newHaveUpvoted ? video.upvotes + 1 : video.upvotes - 1,
              haveUpvoted: newHaveUpvoted
            };
          }
          return video;
        }).sort((a, b) => b.upvotes - a.upvotes));

    } catch (error) {
      console.error("Error voting:", error);
      toast.error(error instanceof Error ? error.message : "Failed to vote");
    }
  }



  const handleShare = () => {
    const shareableLink = `${window.location.origin}/creator/${creatorId}`;
    navigator.clipboard.writeText(shareableLink).then(() => {
      toast.success("Link copied to clipboard!");
    }, () => {
      toast.error('Failed to copy link. Please try again.');
    })
  }

  const removeSong = async (streamId: string) => {
    try {
      const res = await fetch(`/api/streams/remove?streamId=${streamId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error('Failed to remove song');
      }

      toast.success("Song removed successfully");
      await refreshStreams();
    } catch (error) {
      console.error("Error removing song:", error);
      toast.error("Failed to remove song");
    }
  }

  return (
    <div className="flex min-h-screen bg-[rgb(10,10,10)] flex-col bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-gray-200">
      <Appbar />
      <div className="flex justify-center px-5 md:px-10 xl:px-20">
        <div className="grid grid-cols-1 gap-y-5 lg:gap-x-5 lg:grid-cols-5 w-screen py-5 lg:py-8">
          {/* Left: Upcoming Songs */}
          <div className="col-span-3 order-2 lg:order-1">
            <div className="space-y-4 w-full">
              <h2 className="text-2xl font-bold text-white mb-2">Upcoming Songs</h2>
              <div className="space-y-4">
                {queue.length === 0 && (
                  <Card className="bg-gray-900 border-gray-800 w-full">
                    <CardContent className="p-4">
                      <p className="text-center py-8 text-gray-400">
                        No videos in queue
                      </p>
                    </CardContent>
                  </Card>
                )}
                {queue.map((video) => (
                  <Card key={video.id} className="bg-gray-900 border-purple-800 backdrop-blur-sm">
                    <CardContent className="flex items-center space-x-4 p-4">
                      <Image
                        width={160}
                        height={160}
                        src={video.smallImg || "https://placehold.co/128x80/1f2937/ffffff?text=No+Image"}
                        alt={`Thumbnail for ${video.title}`}
                        className="w-30 h-20 object-cover rounded-md mr-4 text-white"
                      />
                      <div className="flex-grow">
                        <h3 className="font-semibold text-white">{video.title}</h3>
                        <div className="flex items-center space-x-2 mt-2">
                          {isCreator && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => playNow(video.id)}
                              className="bg-purple-600 hover:bg-purple-700 text-white hover:cursor-pointer"
                            >
                              Play Now
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVote(video.id, true)}
                            className="flex items-center space-x-1 bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                          >
                            <ChevronUp className={`h-4 w-4 mr-1 ${video.haveUpvoted ? 'text-white' : 'text-gray-400'}`} />
                            <span className="text-white">{video.upvotes}</span>
                          </Button>
                          {isCreator && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeSong(video.id)}
                              className="bg-gray-800 hover:bg-gray-700 border-gray-700 text-white transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Stream Song Voting and Now Playing */}
          <div className="col-span-2 order-1 lg:order-2">
            <div className="flex flex-col items-center w-full">
              <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-white w-full">Stream Song Voting</h1>
                  <Button
                    // variant="outline"
                    className="bg-purple-600 hover:bg-purple-700 text-white hover:cursor-pointer"
                    onClick={handleShare}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>

                {/* Add Song Section - Now at the top */}
                <div className="mb-8">
                  <Card className="bg-gray-900/80 border-purple-800 backdrop-blur-sm p-6">
                    <CardContent className="p-3 space-y-4">
                      <h2 className="text-xl font-bold text-white mb-4">Add a Song</h2>
                      <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                          <label htmlFor="video-url" className="block mb-2 text-white">
                            YouTube URL
                          </label>
                          <Input
                            id="video-url"
                            type="text"
                            placeholder="Paste YouTube link here"
                            value={inputLink}
                            onChange={(e) => {
                              setInputLink(e.target.value);
                            }}
                            className="bg-gray-900 border-purple-700 text-white placeholder-gray-500"
                          />
                        </div>

                        {videoId && (
                          <div className="mb-4">
                            <h3 className="text-sm font-medium mb-2 text-white">Preview</h3>
                            <div className="aspect-video w-full">
                              <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${videoId}`}
                                title="YouTube video preview"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="rounded-lg"
                              ></iframe>
                            </div>
                          </div>
                        )}

                        <Button disabled={loading || !inputLink.trim()} onClick={handleSubmit}
                          type="submit" className="w-full bg-purple-700 text-white hover:bg-purple-800 cursor-pointer">{loading ? "Loading..." : "Add to Queue"}
                        </Button>
                      </form>
                      {inputLink && inputLink.match(YT_REGEX) && !loading && (
                        <div className="mt-4">
                          <LiteYouTubeEmbed
                            title=""
                            id={inputLink.split("?v=")[1]}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4 text-white">Now Playing</h2>
                  <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                      {currentlyPlaying ? (
                        <div>
                          {playVideo ? (
                            <div ref={videoPlayerRef} className="w-full aspect-video" />
                          ) : (
                            <>
                              <Image
                                src={currentlyPlaying.bigImg}
                                alt={currentlyPlaying.title}
                                width={640}
                                height={360}
                                className="w-full h-72 aspact-video object-cover rounded-md"
                              />
                              <p className="mt-2 text-center font-semibold text-white">{currentlyPlaying.title}</p>
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="text-center py-8 text-gray-800">No video playing</p>
                      )}
                      {playVideo && (
                        <Button
                          disabled={playNextLoader}
                          onClick={playNext}
                          className="w-full mt-3 bg-purple-700 hover:bg-purple-800 text-white transition-colors"
                        >
                          <Play className="mr-2 h-4 w-4" />{" "}
                          {playNextLoader ? "...Loading" : "Play Next"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
}
