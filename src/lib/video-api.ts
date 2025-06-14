export interface VideoInfo {
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

export interface DownloadRequest {
  url: string
  quality: string
  format?: string
}

export interface DownloadResponse {
  success: boolean
  downloadUrl?: string
  filename?: string
  error?: string
  message?: string
}

class VideoAPI {
  private baseUrl: string

  constructor() {
    // Use internal Next.js API routes by default
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
  }

  async getVideoInfo(url: string): Promise<VideoInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/video/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch video information')
      }

      return data.data
    } catch (error) {
      console.error('Error fetching video info:', error)
      throw new Error('Failed to fetch video information. Please check the URL and try again.')
    }
  }

  async downloadVideo(request: DownloadRequest): Promise<DownloadResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/video/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error downloading video:', error)
      return {
        success: false,
        error: 'Download failed. Please try again.',
      }
    }
  }

  async getDownloadProgress(taskId: string): Promise<{ progress: number; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/video/progress/${taskId}`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error getting download progress:', error)
      return { progress: 0, status: 'error' }
    }
  }
}

export const videoAPI = new VideoAPI()