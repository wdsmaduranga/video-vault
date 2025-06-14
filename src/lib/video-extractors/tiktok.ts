import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

export interface TikTokVideoInfo {
  title: string
  thumbnail: string
  duration: string
  views: string
  author: string
  description: string
  videoId: string
  downloadUrl: string
}

export class TikTokExtractor {
  static async getVideoInfo(url: string): Promise<TikTokVideoInfo> {
    try {
      // Clean the URL
      const cleanUrl = this.cleanTikTokUrl(url)
      
      // Fetch the page
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch TikTok page')
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Extract video information from the page
      const scriptTag = $('script[id="__UNIVERSAL_DATA_FOR_REHYDRATION__"]').html()
      
      if (!scriptTag) {
        throw new Error('Could not find video data')
      }

      const data = JSON.parse(scriptTag)
      const videoData = data.__DEFAULT_SCOPE__['webapp.video-detail']?.itemInfo?.itemStruct

      if (!videoData) {
        throw new Error('Could not extract video information')
      }

      return {
        title: videoData.desc || 'TikTok Video',
        thumbnail: videoData.video?.cover || videoData.video?.dynamicCover || '',
        duration: this.formatDuration(videoData.video?.duration || 0),
        views: this.formatViews(videoData.stats?.playCount || 0),
        author: videoData.author?.nickname || videoData.author?.uniqueId || 'Unknown',
        description: videoData.desc || '',
        videoId: videoData.id,
        downloadUrl: videoData.video?.downloadAddr || videoData.video?.playAddr || ''
      }
    } catch (error) {
      console.error('TikTok extraction error:', error)
      throw new Error('Failed to extract TikTok video information')
    }
  }

  static async downloadVideo(url: string): Promise<Buffer> {
    try {
      const videoInfo = await this.getVideoInfo(url)
      
      if (!videoInfo.downloadUrl) {
        throw new Error('No download URL found')
      }

      const response = await fetch(videoInfo.downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://www.tiktok.com/'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download video')
      }

      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      console.error('TikTok download error:', error)
      throw new Error('Failed to download TikTok video')
    }
  }

  private static cleanTikTokUrl(url: string): string {
    // Handle different TikTok URL formats
    if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
      // Short URLs need to be resolved
      return url
    }
    
    // Extract video ID from full URLs
    const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
    if (match) {
      return url
    }
    
    return url
  }

  private static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  private static formatViews(views: number): string {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`
    }
    return `${views} views`
  }
}