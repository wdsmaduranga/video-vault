"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  Download, 
  Link, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Eye, 
  ExternalLink,
  FileVideo,
  Server,
  Zap
} from "lucide-react"
import { SupportedPlatforms } from "@/components/supported-platforms"
import { videoAPI, type VideoInfo, type DownloadRequest } from "@/lib/video-api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

export function VideoDownloader() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [error, setError] = useState("")
  const [downloadingQuality, setDownloadingQuality] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const { toast } = useToast()

  const detectPlatform = (url: string): string => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube"
    if (url.includes("facebook.com") || url.includes("fb.watch")) return "Facebook"
    if (url.includes("tiktok.com")) return "TikTok"
    if (url.includes("instagram.com")) return "Instagram"
    if (url.includes("twitter.com") || url.includes("x.com")) return "Twitter/X"
    return "Unknown"
  }

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      const platform = detectPlatform(url)
      return platform !== "Unknown"
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setVideoInfo(null)
    setIsLoading(true)

    if (!url.trim()) {
      setError("Please enter a video URL")
      setIsLoading(false)
      return
    }

    if (!isValidUrl(url)) {
      setError("Please enter a valid URL from supported platforms (YouTube, TikTok, Instagram, Twitter/X, Facebook)")
      setIsLoading(false)
      return
    }

    try {
      const platform = detectPlatform(url)
      if (platform === "Unknown") {
        throw new Error("Unsupported platform. Please enter a valid URL from a supported platform.")
      }

      const info = await videoAPI.getVideoInfo(url)
      setVideoInfo(info)
      toast({
        title: "Video info loaded",
        description: "Select a quality to download",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load video info"
      setError(errorMessage)
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (quality: string) => {
    if (!videoInfo) return

    setIsDownloading(true)
    setDownloadProgress(0)
    setDownloadError(null)

    try {
      const response = await fetch('/api/video/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoInfo.originalUrl,
          quality,
        }),
      })

      if (!response.ok) {
        throw new Error('Download failed')
      }

      // Handle SSE
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Failed to start download')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            
            if (data.type === 'error') {
              throw new Error(data.error)
            }
            
            if (data.progress !== undefined) {
              setDownloadProgress(data.progress)
            }
            
            if (data.type === 'complete') {
              // Convert base64 to blob and download
              const binaryString = atob(data.buffer)
              const bytes = new Uint8Array(binaryString.length)
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
              }
              const blob = new Blob([bytes], { type: data.contentType })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = data.filename
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
              
              toast({
                title: "Download complete",
                description: `Video has been saved as ${data.filename}`,
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Download error:', error)
      setDownloadError(error instanceof Error ? error.message : 'Download failed')
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error instanceof Error ? error.message : "Download failed",
      })
    } finally {
      setIsDownloading(false)
      setDownloadProgress(0)
    }
  }

  const handleOpenOriginal = () => {
    if (videoInfo?.originalUrl) {
      window.open(videoInfo.originalUrl, '_blank')
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Production Status */}
        <Card className="shadow-xl border-0 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-green-800">
                    🚀 Production Mode Active
                  </h3>
                  <p className="text-sm text-green-600">
                    Real video downloads from YouTube, TikTok, Instagram, Twitter/X, and Facebook
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 font-medium">
                LIVE
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* URL Input Form */}
        <Card className="shadow-xl border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Link className="h-4 w-4 text-white" />
              </div>
              Enter Video URL
            </CardTitle>
            <CardDescription>
              Paste the URL of any video from YouTube, TikTok, Instagram, Twitter/X, or Facebook
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... or https://www.tiktok.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Get Video
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Video Information */}
        {videoInfo && (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Video Ready for Download
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Thumbnail */}
                <div className="lg:col-span-1">
                  <div className="relative group">
                    <img
                      src={videoInfo.thumbnail}
                      alt="Video thumbnail"
                      className="w-full rounded-xl shadow-lg aspect-video object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-white text-center">
                        <Clock className="h-6 w-6 mx-auto mb-1" />
                        <span className="text-sm font-medium">{videoInfo.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video Details */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="font-bold text-xl mb-3 text-gray-900 line-clamp-2">
                      {videoInfo.title}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-medium">
                        {videoInfo.platform}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {videoInfo.duration}
                      </Badge>
                      {videoInfo.views && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {videoInfo.views}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenOriginal}
                        className="ml-auto flex items-center gap-1 text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Original
                      </Button>
                    </div>

                    {videoInfo.author && (
                      <p className="text-gray-600 text-sm mb-2">
                        <span className="font-medium">Creator:</span> {videoInfo.author}
                      </p>
                    )}

                    {videoInfo.description && (
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {videoInfo.description}
                      </p>
                    )}
                  </div>

                  {/* Download Options */}
                  <div>
                    <h4 className="font-semibold mb-4 text-lg text-gray-900">
                      Choose Quality & Download:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {videoInfo.quality.map((quality, index) => (
                        <div key={quality} className="space-y-2">
                          <Button
                            variant="outline"
                            onClick={() => handleDownload(quality)}
                            disabled={downloadingQuality === quality}
                            className={`w-full h-12 font-medium transition-all duration-200 ${
                              index === 0 
                                ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100' 
                                : 'hover:border-blue-400 hover:bg-blue-50'
                            }`}
                          >
                            {downloadingQuality === quality ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                {quality}
                                {index === 0 && (
                                  <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-800">
                                    Best
                                  </Badge>
                                )}
                              </>
                            )}
                          </Button>
                          
                          {/* Progress Bar */}
                          {downloadProgress > 0 && downloadProgress < 100 && (
                            <div className="space-y-1">
                              <Progress value={downloadProgress} className="h-2" />
                              <p className="text-xs text-gray-500 text-center">
                                {downloadProgress}% complete
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-3 rounded-lg border bg-green-50 border-green-200">
                      <p className="text-xs text-center text-green-700">
                        🎉 <strong>Production Ready:</strong> Real video downloads with full quality options from all supported platforms!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Supported Platforms */}
        <SupportedPlatforms />

        <Dialog open={isDownloading || downloadError !== null} onOpenChange={(open) => {
          if (!open) {
            setIsDownloading(false)
            setDownloadError(null)
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {downloadError ? 'Download Error' : 'Downloading Video'}
              </DialogTitle>
            </DialogHeader>
            {downloadError ? (
              <div className="text-red-500">{downloadError}</div>
            ) : (
              <div className="space-y-4">
                <Progress value={downloadProgress} />
                <div className="text-center text-sm text-gray-500">
                  {downloadProgress}% complete
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Download Progress Sidebar */}
        {isDownloading && (
          <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-64">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Downloading...</span>
                <span className="text-sm text-gray-500">{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}