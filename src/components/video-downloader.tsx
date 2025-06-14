"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export function VideoDownloader() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [error, setError] = useState("")
  const [downloadingQuality, setDownloadingQuality] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({})

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

    if (!url.trim()) {
      setError("Please enter a video URL")
      return
    }

    if (!isValidUrl(url)) {
      setError("Please enter a valid URL from supported platforms (YouTube, TikTok, Instagram, Twitter/X, Facebook)")
      return
    }

    setIsLoading(true)

    try {
      const info = await videoAPI.getVideoInfo(url)
      setVideoInfo(info)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch video information. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (quality: string) => {
    if (!videoInfo) return
    
    setDownloadingQuality(quality)
    setDownloadProgress(prev => ({ ...prev, [quality]: 0 }))

    try {
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const current = prev[quality] || 0
          if (current < 90) {
            return { ...prev, [quality]: current + 10 }
          }
          return prev
        })
      }, 500)

      const response = await fetch('/api/video/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoInfo.originalUrl,
          quality,
          format: 'mp4'
        }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Download failed')
      }

      // Complete progress
      setDownloadProgress(prev => ({ ...prev, [quality]: 100 }))

      // Get the video blob
      const blob = await response.blob()
      
      // Create download link
      const downloadUrl = URL.createObjectURL(blob)
      const fileName = `${videoInfo.title.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}_${quality.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`
      
      // Trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl)
      }, 1000)
      
      // Show success message
      setTimeout(() => {
        alert(`✅ Download completed successfully!\n\nFile: ${fileName}\n\nThe video has been saved to your downloads folder.`)
      }, 500)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed'
      alert(`❌ Download failed: ${errorMessage}`)
    } finally {
      setDownloadingQuality(null)
      setDownloadProgress(prev => ({ ...prev, [quality]: 0 }))
    }
  }

  const handleOpenOriginal = () => {
    if (videoInfo?.originalUrl) {
      window.open(videoInfo.originalUrl, '_blank')
    }
  }

  return (
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
          <p className="text-gray-600 text-sm">
            Paste the URL of any video from YouTube, TikTok, Instagram, Twitter/X, or Facebook
          </p>
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
                        {downloadProgress[quality] > 0 && downloadProgress[quality] < 100 && (
                          <div className="space-y-1">
                            <Progress value={downloadProgress[quality]} className="h-2" />
                            <p className="text-xs text-gray-500 text-center">
                              {downloadProgress[quality]}% complete
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
    </div>
  )
}