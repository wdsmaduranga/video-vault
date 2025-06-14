import ytdl from 'ytdl-core'

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
      console.log(url)
      const info = await ytdl.getInfo(url)
      console.log(info)
      const videoDetails = info.videoDetails
      // Get available formats with better filtering
      const formats = info.formats
        .map(format => ({
          quality: format.qualityLabel || format.quality || 'Audio Only',
          format: format.container || 'mp4',
          url: format.url,
          filesize: format.contentLength ? parseInt(format.contentLength) : undefined,
          hasVideo: format.hasVideo,
          hasAudio: format.hasAudio
        }))
        .filter((format, index, self) => 
          index === self.findIndex(f => f.quality === format.quality && f.hasVideo === format.hasVideo)
        )
        .sort((a, b) => {
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

      const info = await ytdl.getBasicInfo(url)
      let format

      if (quality.includes('p')) {
        // Find specific video quality with both video and audio
        format = info.formats.find(f => 
          f.qualityLabel === quality && 
          f.hasVideo && 
          f.hasAudio &&
          f.container === 'mp4'
        )

        // If not found, try to find any format with the requested quality
        if (!format) {
          format = info.formats.find(f => 
            f.qualityLabel === quality && 
            f.hasVideo
          )
        }
      } else if (quality === 'Audio Only') {
        // Find best audio format
        format = info.formats.find(f => 
          f.hasAudio && 
          !f.hasVideo &&
          f.container === 'mp4'
        )
      }

      if (!format) {
        // Fallback to best available format
        format = info.formats.find(f => f.hasVideo && f.hasAudio) || 
                info.formats.find(f => f.hasVideo) ||
                info.formats.find(f => f.hasAudio)
      }

      if (!format || !format.url) {
        throw new Error('No suitable format found for download')
      }

      // Get the direct download URL
      const downloadUrl = format.url

      // Fetch the video using the direct URL
      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch video')
      }

      // Convert the response to a readable stream
      return response.body as unknown as NodeJS.ReadableStream

    } catch (error) {
      console.error('YouTube download error:', error)
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