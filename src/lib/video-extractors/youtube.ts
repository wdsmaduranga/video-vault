import fetch from 'node-fetch'

const YOUTUBE_API_KEY = 'AIzaSyB3zLZdm6l7SnNM8Pdns6oh8IFef9bxMbc'
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3'

interface YouTubeApiResponse {
  items: Array<{
    snippet: {
      title: string
      description: string
      channelTitle: string
      thumbnails: {
        high: {
          url: string
        }
      }
    }
    contentDetails: {
      duration: string
    }
    statistics: {
      viewCount: string
    }
  }>
}

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
  private static extractVideoId(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : ''
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
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`
    }
    return `${views} views`
  }

  static async getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    try {
      const videoId = this.extractVideoId(url)
      if (!videoId) {
        throw new Error('Invalid YouTube URL')
      }

      // Get video details
      const videoResponse = await fetch(
        `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
      )
      
      if (!videoResponse.ok) {
        throw new Error('Failed to fetch video details')
      }

      const videoData = await videoResponse.json() as YouTubeApiResponse
      if (!videoData.items || videoData.items.length === 0) {
        throw new Error('Video not found')
      }

      const video = videoData.items[0]
      const snippet = video.snippet
      const contentDetails = video.contentDetails
      const statistics = video.statistics

      // Get available formats
      const formats = [
        {
          quality: '1080p',
          format: 'mp4',
          url: `https://www.youtube.com/watch?v=${videoId}`,
        },
        {
          quality: '720p',
          format: 'mp4',
          url: `https://www.youtube.com/watch?v=${videoId}`,
        },
        {
          quality: '480p',
          format: 'mp4',
          url: `https://www.youtube.com/watch?v=${videoId}`,
        },
        {
          quality: '360p',
          format: 'mp4',
          url: `https://www.youtube.com/watch?v=${videoId}`,
        },
        {
          quality: 'Audio Only',
          format: 'mp3',
          url: `https://www.youtube.com/watch?v=${videoId}`,
        }
      ]

      return {
        title: snippet.title || 'Unknown Title',
        thumbnail: snippet.thumbnails?.high?.url || '',
        duration: this.formatDuration(parseInt(contentDetails.duration.replace(/[^0-9]/g, ''))),
        views: this.formatViews(parseInt(statistics.viewCount || '0')),
        author: snippet.channelTitle || 'Unknown Author',
        description: (snippet.description || '').substring(0, 200) + '...',
        videoId: videoId,
        formats: formats
      }
    } catch (error) {
      console.error('YouTube extraction error:', error)
      throw new Error('Failed to extract YouTube video information. Please check the URL and try again.')
    }
  }

  static async downloadVideo(url: string, quality: string): Promise<NodeJS.ReadableStream> {
    try {
      const videoId = this.extractVideoId(url)
      if (!videoId) {
        throw new Error('Invalid YouTube URL')
      }

      // For now, we'll return a stream that redirects to the YouTube video
      // In a production environment, you would want to implement a proper download mechanism
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch video')
      }

      return response.body as unknown as NodeJS.ReadableStream
    } catch (error) {
      console.error('YouTube download error:', error)
      throw new Error('Failed to download YouTube video. Please try again.')
    }
  }
}