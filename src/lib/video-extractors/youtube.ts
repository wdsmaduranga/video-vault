const ytdl = require('@distube/ytdl-core')
import { Readable } from 'stream'
import { videoFormat, videoInfo } from '@distube/ytdl-core'

export interface YouTubeVideoInfo {
  title: string
  thumbnail: string
  duration: string
  views: string
  author: string
  description: string
  videoId: string
  formats: Array<{
    quality: string
    format: string
    url: string
    filesize?: number
  }>
}

export class YouTubeExtractor {
  static async getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    try {
      if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL')
      }

      const options = {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        }
      }

      const info = await ytdl.getInfo(url, options)
      const videoDetails = info.videoDetails

      // Get available formats with better filtering
      const formats = info.formats
        .map((format: videoFormat) => ({
          quality: format.qualityLabel || format.quality || 'Audio Only',
          format: format.container || 'mp4',
          url: format.url,
          filesize: format.contentLength ? parseInt(format.contentLength) : undefined,
          hasVideo: format.hasVideo,
          hasAudio: format.hasAudio
        }))
        .filter((format: any, index: number, self: any[]) => 
          index === self.findIndex((f: any) => f.quality === format.quality && f.hasVideo === format.hasVideo)
        )
        .sort((a: any, b: any) => {
          // Prioritize video+audio formats
          if (a.hasVideo && a.hasAudio && !(b.hasVideo && b.hasAudio)) return -1
          if (b.hasVideo && b.hasAudio && !(a.hasVideo && a.hasAudio)) return 1
          
          const qualityOrder = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p']
          const aIndex = qualityOrder.findIndex(q => a.quality.includes(q))
          const bIndex = qualityOrder.findIndex(q => b.quality.includes(q))
          
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          return 0
        })

      return {
        title: videoDetails.title || 'Unknown Title',
        thumbnail: videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url || '',
        duration: this.formatDuration(parseInt(videoDetails.lengthSeconds || '0')),
        views: this.formatViews(parseInt(videoDetails.viewCount || '0')),
        author: videoDetails.author?.name || 'Unknown Author',
        description: (videoDetails.description || '').substring(0, 200) + '...',
        videoId: videoDetails.videoId,
        formats: formats.slice(0, 8) // Limit to 8 formats for UI
      }
    } catch (error) {
      console.error('YouTube extraction error:', error)
      throw new Error('Failed to extract YouTube video information. Please check the URL and try again.')
    }
  }

  static async downloadVideo(url: string, quality: string): Promise<NodeJS.ReadableStream> {
    try {
      if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL')
      }

      console.log('Starting YouTube download...')
      
      // Get video info first to check available formats
      const options = {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        }
      }

      const info = await ytdl.getInfo(url, options)
      const formats = info.formats.filter((f: videoFormat) => f.hasVideo && f.hasAudio)
      
      // Map quality labels to format IDs
      const formatMap = new Map<string, string>()
      formats.forEach((f: videoFormat) => {
        if (f.qualityLabel) {
          formatMap.set(f.qualityLabel, f.itag.toString())
        }
      })
      
      // Find the closest available quality
      const qualityOrder = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p']
      const requestedQualityIndex = qualityOrder.indexOf(quality)
      
      let selectedFormatId = 'highest'
      if (requestedQualityIndex !== -1) {
        // Try to find the requested quality or closest available
        for (let i = requestedQualityIndex; i < qualityOrder.length; i++) {
          const formatId = formatMap.get(qualityOrder[i])
          if (formatId) {
            selectedFormatId = formatId
            console.log(`Selected quality: ${qualityOrder[i]} (requested: ${quality})`)
            break
          }
        }
        // If no higher quality found, try lower qualities
        if (selectedFormatId === 'highest') {
          for (let i = requestedQualityIndex; i >= 0; i--) {
            const formatId = formatMap.get(qualityOrder[i])
            if (formatId) {
              selectedFormatId = formatId
              console.log(`Selected quality: ${qualityOrder[i]} (requested: ${quality})`)
              break
            }
          }
        }
      }
      
      // Configure ytdl options
      const optionsDownload = {
        quality: selectedFormatId,
        filter: 'videoandaudio',
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        }
      }

      console.log('Download options:', optionsDownload)

      // Create the download stream
      const stream = ytdl(url, optionsDownload)

      // Handle stream events
      stream.on('info', (info: videoInfo, format: videoFormat) => {
        console.log('Download started:', {
          title: info.videoDetails.title,
          format: format.qualityLabel,
          hasVideo: format.hasVideo,
          hasAudio: format.hasAudio,
          container: format.container
        })
      })

      stream.on('progress', (chunkLength: number, downloaded: number, total: number) => {
        const percent = downloaded / total * 100
        console.log(`Download progress: ${percent.toFixed(2)}%`)
      })

      stream.on('error', (error: Error) => {
        console.error('Stream error:', error)
        throw error
      })

      return stream

    } catch (error) {
      console.error('YouTube download error:', error)
      if (error instanceof Error) {
        throw new Error(`Failed to download YouTube video: ${error.message}`)
      }
      throw new Error('Failed to download YouTube video. Please try again.')
    }
  }

  private static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  private static formatViews(views: number): string {
    if (views >= 1000000000) {
      return `${(views / 1000000000).toFixed(1)}B views`
    } else if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`
    }
    return `${views} views`
  }
}