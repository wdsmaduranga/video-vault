import { Readable } from 'stream'

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
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

  static validateURL(url: string): boolean {
    const patterns = [
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*&v=([a-zA-Z0-9_-]{11})/,
      /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ]
    return patterns.some(pattern => pattern.test(url))
  }

  private static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*&v=([a-zA-Z0-9_-]{11})/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  private static async fetchVideoPage(videoId: string): Promise<string> {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': this.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    })
    return await response.text()
  }

  private static extractPlayerConfig(html: string): any {
    const configMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/)
    if (!configMatch) return null
    try {
      return JSON.parse(configMatch[1])
    } catch {
      return null
    }
  }

  static async getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    try {
      if (!this.validateURL(url)) {
        throw new Error('Invalid YouTube URL')
      }

      const videoId = this.extractVideoId(url)
      if (!videoId) {
        throw new Error('Could not extract video ID')
      }

      const html = await this.fetchVideoPage(videoId)
      const config = this.extractPlayerConfig(html)
      
      if (!config) {
        throw new Error('Could not extract video information')
      }

      const videoDetails = config.videoDetails
      const streamingData = config.streamingData

      // Extract available formats
      const formats = streamingData.formats
        .filter((format: any) => format.hasVideo && format.hasAudio)
        .map((format: any) => ({
          quality: format.qualityLabel || format.quality || 'Audio Only',
          format: format.container || 'mp4',
          url: format.url,
          filesize: format.contentLength ? parseInt(format.contentLength) : undefined
        }))
        .sort((a: any, b: any) => {
          const qualityOrder = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p']
          const aIndex = qualityOrder.findIndex(q => a.quality.includes(q))
          const bIndex = qualityOrder.findIndex(q => b.quality.includes(q))
          return aIndex - bIndex
        })

      return {
        title: videoDetails.title || 'Unknown Title',
        thumbnail: videoDetails.thumbnail?.thumbnails?.[videoDetails.thumbnail.thumbnails.length - 1]?.url || '',
        duration: this.formatDuration(parseInt(videoDetails.lengthSeconds || '0')),
        views: this.formatViews(parseInt(videoDetails.viewCount || '0')),
        author: videoDetails.author || 'Unknown Author',
        description: (videoDetails.shortDescription || '').substring(0, 200) + '...',
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
      if (!this.validateURL(url)) {
        throw new Error('Invalid YouTube URL')
      }

      console.log('Starting YouTube download...')
      
      // Get video info first
      const info = await this.getVideoInfo(url)
      
      // Find the requested quality or closest available
      const qualityOrder = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p']
      const requestedQualityIndex = qualityOrder.indexOf(quality)
      
      let selectedFormat = info.formats[0] // Default to highest quality
      if (requestedQualityIndex !== -1) {
        // Try to find the requested quality or closest available
        for (let i = requestedQualityIndex; i < qualityOrder.length; i++) {
          const format = info.formats.find(f => f.quality.includes(qualityOrder[i]))
          if (format) {
            selectedFormat = format
            console.log(`Selected quality: ${format.quality} (requested: ${quality})`)
            break
          }
        }
        // If no higher quality found, try lower qualities
        if (selectedFormat === info.formats[0]) {
          for (let i = requestedQualityIndex; i >= 0; i--) {
            const format = info.formats.find(f => f.quality.includes(qualityOrder[i]))
            if (format) {
              selectedFormat = format
              console.log(`Selected quality: ${format.quality} (requested: ${quality})`)
              break
            }
          }
        }
      }

      console.log('Downloading from URL:', selectedFormat.url)

      // Fetch the video stream
      const response = await fetch(selectedFormat.url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.youtube.com/'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`)
      }

      // Convert the response to a Node.js readable stream
      const stream = new Readable()
      const reader = response.body?.getReader()
      
      if (!reader) {
        throw new Error('Failed to get response reader')
      }

      // Read the stream
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              stream.push(null)
              break
            }
            stream.push(Buffer.from(value))
          }
        } catch (error) {
          stream.emit('error', error)
        }
      }

      pump()
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