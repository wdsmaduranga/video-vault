import { YouTubeExtractor } from './video-extractors/youtube'
import { TikTokExtractor } from './video-extractors/tiktok'
import { InstagramExtractor } from './video-extractors/instagram'
import { TwitterExtractor } from './video-extractors/twitter'
import { FacebookExtractor } from './video-extractors/facebook'

export interface UnifiedVideoInfo {
  title: string
  thumbnail: string
  duration: string
  platform: string
  quality: string[]
  views?: string
  author?: string
  description?: string
  videoId: string
  originalUrl: string
}

export class VideoExtractor {
  static detectPlatform(url: string): string {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube"
    if (url.includes("facebook.com") || url.includes("fb.watch")) return "Facebook"
    if (url.includes("tiktok.com")) return "TikTok"
    if (url.includes("instagram.com")) return "Instagram"
    if (url.includes("twitter.com") || url.includes("x.com")) return "Twitter/X"
    return "Unknown"
  }

  static async getVideoInfo(url: string): Promise<UnifiedVideoInfo> {
    const platform = this.detectPlatform(url)

    try {
      switch (platform) {
        case "YouTube": {
          const info = await YouTubeExtractor.getVideoInfo(url)
          return {
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            platform,
            quality: info.formats.map(f => f.quality),
            views: info.views,
            author: info.author,
            description: info.description,
            videoId: info.videoId,
            originalUrl: url
          }
        }

        case "TikTok": {
          const info = await TikTokExtractor.getVideoInfo(url)
          return {
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            platform,
            quality: ["Original Quality"],
            views: info.views,
            author: info.author,
            description: info.description,
            videoId: info.videoId,
            originalUrl: url
          }
        }

        case "Instagram": {
          const info = await InstagramExtractor.getVideoInfo(url)
          return {
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            platform,
            quality: info.type === 'video' ? ["1080p", "720p"] : ["Original"],
            views: info.views,
            author: info.author,
            description: info.description,
            videoId: info.videoId,
            originalUrl: url
          }
        }

        case "Twitter/X": {
          const info = await TwitterExtractor.getVideoInfo(url)
          return {
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            platform,
            quality: ["720p", "480p"],
            views: info.views,
            author: info.author,
            description: info.description,
            videoId: info.videoId,
            originalUrl: url
          }
        }

        case "Facebook": {
          const info = await FacebookExtractor.getVideoInfo(url)
          return {
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            platform,
            quality: ["HD", "SD"],
            views: info.views,
            author: info.author,
            description: info.description,
            videoId: info.videoId,
            originalUrl: url
          }
        }

        default:
          throw new Error(`Unsupported platform: ${platform}`)
      }
    } catch (error) {
      console.error(`Error extracting ${platform} video:`, error)
      throw new Error(`Failed to extract video information from ${platform}`)
    }
  }

  static async downloadVideo(url: string, quality: string): Promise<Buffer | NodeJS.ReadableStream> {
    const platform = this.detectPlatform(url)

    try {
      switch (platform) {
        case "YouTube":
          return await YouTubeExtractor.downloadVideo(url, quality)

        case "TikTok":
          return await TikTokExtractor.downloadVideo(url)

        case "Instagram":
          return await InstagramExtractor.downloadMedia(url)

        case "Twitter/X":
          return await TwitterExtractor.downloadVideo(url)

        case "Facebook":
          return await FacebookExtractor.downloadVideo(url)

        default:
          throw new Error(`Unsupported platform: ${platform}`)
      }
    } catch (error) {
      console.error(`Error downloading ${platform} video:`, error)
      throw new Error(`Failed to download video from ${platform}`)
    }
  }
}