import { google } from 'googleapis'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createReadStream } from 'fs'
import { createWriteStream } from 'fs'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import { Readable } from 'stream'

const execAsync = promisify(exec)

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
    hasVideo: boolean
    hasAudio: boolean
  }>
}

export class YouTubeExtractor {
  private static youtube = google.youtube('v3')

  static async getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    try {
      const videoId = this.extractVideoId(url)
      console.log(videoId)
      if (!videoId) {
        throw new Error('Invalid YouTube URL')
      }

      const response = await this.youtube.videos.list({
        key: 'AIzaSyB3zLZdm6l7SnNM8Pdns6oh8IFef9bxMbc',
        part: ['snippet', 'contentDetails', 'statistics'],
        id: [videoId]
      })

      const video = response.data.items?.[0]
      if (!video) {
        throw new Error('Video not found')
      }

      // Get video formats using yt-dlp
      const formats = await this.getVideoFormats(videoId)

      return {
        title: video.snippet?.title || 'Unknown Title',
        thumbnail: video.snippet?.thumbnails?.maxres?.url || video.snippet?.thumbnails?.high?.url || '',
        duration: this.formatDuration(this.parseDuration(video.contentDetails?.duration || 'PT0S')),
        views: this.formatViews(parseInt(video.statistics?.viewCount || '0')),
        author: video.snippet?.channelTitle || 'Unknown Author',
        description: (video.snippet?.description || '').substring(0, 200) + '...',
        videoId: videoId,
        formats: formats
      }
    } catch (error) {
      console.error('YouTube extraction error:', error)
      throw new Error('Failed to extract YouTube video information. Please check the URL and try again.')
    }
  }

  private static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return null
  }

  private static async getVideoFormats(videoId: string) {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`
      const { stdout } = await execAsync(`yt-dlp -j "${url}"`)
      const videoInfo = JSON.parse(stdout)

      const formats = videoInfo.formats
        .filter((format: any) => {
          // Filter out formats without video or audio
          return format.vcodec !== 'none' || format.acodec !== 'none'
        })
        .map((format: any) => {
          const quality = format.height 
            ? `${format.height}p` 
            : format.acodec !== 'none' ? 'Audio Only' : 'Unknown'

          return {
            quality,
            format: format.ext || 'mp4',
          url: format.url,
            filesize: format.filesize,
            hasVideo: format.vcodec !== 'none',
            hasAudio: format.acodec !== 'none'
          }
        })
        .filter((format: any, index: number, self: any[]) => 
          // Remove duplicates based on quality and format type
          index === self.findIndex(f => 
            f.quality === format.quality && 
            f.hasVideo === format.hasVideo && 
            f.hasAudio === format.hasAudio
          )
        )
        .sort((a: any, b: any) => {
          // Prioritize video+audio formats
          if (a.hasVideo && a.hasAudio && !(b.hasVideo && b.hasAudio)) return -1
          if (b.hasVideo && b.hasAudio && !(a.hasVideo && a.hasAudio)) return 1
          
          // Sort by quality
          const qualityOrder = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p']
          const aIndex = qualityOrder.findIndex(q => a.quality.includes(q))
          const bIndex = qualityOrder.findIndex(q => b.quality.includes(q))
          
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          return 0
        })

      return formats.slice(0, 8) // Limit to 8 formats for UI
    } catch (error) {
      console.error('Error getting video formats:', error)
      // Return basic formats as fallback
      return [
        {
          quality: '1080p',
          format: 'mp4',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          hasVideo: true,
          hasAudio: true
        },
        {
          quality: '720p',
          format: 'mp4',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          hasVideo: true,
          hasAudio: true
        },
        {
          quality: '480p',
          format: 'mp4',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          hasVideo: true,
          hasAudio: true
        },
        {
          quality: '360p',
          format: 'mp4',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          hasVideo: true,
          hasAudio: true
        },
        {
          quality: 'Audio Only',
          format: 'mp3',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          hasVideo: false,
          hasAudio: true
        }
      ]
    }
  }

  private static parseDuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    if (!match) return 0

    const hours = (match[1] ? parseInt(match[1]) : 0)
    const minutes = (match[2] ? parseInt(match[2]) : 0)
    const seconds = (match[3] ? parseInt(match[3]) : 0)

    return hours * 3600 + minutes * 60 + seconds
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

  static async downloadVideo(url: string, quality: string): Promise<NodeJS.ReadableStream> {
    try {
      const videoId = this.extractVideoId(url)
      if (!videoId) {
        throw new Error('Invalid YouTube URL')
      }

      // First, get video info to check size
      const { stdout: infoJson } = await execAsync(`yt-dlp -j "${url}"`)
      const videoInfo = JSON.parse(infoJson)
      const filesize = videoInfo.filesize || 0

      // If file is small (< 100MB), use streaming
      if (filesize < 100 * 1024 * 1024) {
        return this.streamDownload(url, quality)
      }

      // For larger files, use file system method
      return this.fileSystemDownload(url, quality, videoId)
    } catch (error) {
      console.error('YouTube download error:', error)
      throw new Error('Failed to download YouTube video. Please try again.')
    }
  }

  private static async streamDownload(url: string, quality: string): Promise<NodeJS.ReadableStream> {
    const args = ['--no-warnings', '--no-playlist']
    
    if (quality === 'Audio Only') {
      args.push('-f', 'bestaudio[ext=m4a]')
    } else if (quality.includes('p')) {
      args.push('-f', `bestvideo[height<=${quality.replace('p', '')}]+bestaudio/best[height<=${quality.replace('p', '')}]`)
    }

    args.push('-o', '-')

    const ytdl = spawn('yt-dlp', [url, ...args])
    const stream = new Readable({
      read() {}
    })

    ytdl.stdout.on('data', (data) => {
      stream.push(data)
    })

    ytdl.stderr.on('data', (data) => {
      console.error(`yt-dlp stderr: ${data}`)
    })

    ytdl.on('close', (code) => {
      if (code !== 0) {
        stream.emit('error', new Error(`yt-dlp process exited with code ${code}`))
      }
      stream.push(null)
    })

    ytdl.on('error', (error) => {
      stream.emit('error', error)
    })

    return stream
  }

  private static async fileSystemDownload(url: string, quality: string, videoId: string): Promise<NodeJS.ReadableStream> {
    const tempFilePath = join(tmpdir(), `${videoId}-${Date.now()}.mp4`)
    
    let command = `yt-dlp "${url}" -o "${tempFilePath}"`
    
    if (quality === 'Audio Only') {
      command += ' -f "bestaudio[ext=m4a]"'
    } else if (quality.includes('p')) {
      command += ` -f "bestvideo[height<=${quality.replace('p', '')}]+bestaudio/best[height<=${quality.replace('p', '')}]"`
    }

    try {
      await execAsync(command)
      const stream = createReadStream(tempFilePath)

      // Clean up the file when the stream ends
      stream.on('end', async () => {
        try {
          await unlink(tempFilePath)
        } catch (error) {
          console.error('Error deleting temporary file:', error)
        }
      })

      return stream
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await unlink(tempFilePath)
      } catch {}
      throw error
    }
  }
}