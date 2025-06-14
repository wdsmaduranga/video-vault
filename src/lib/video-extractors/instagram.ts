import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

export interface InstagramVideoInfo {
  title: string
  thumbnail: string
  duration: string
  views: string
  author: string
  description: string
  videoId: string
  downloadUrl: string
  type: 'video' | 'image' | 'carousel'
}

export class InstagramExtractor {
  static async getVideoInfo(url: string): Promise<InstagramVideoInfo> {
    try {
      // Clean the URL
      const cleanUrl = this.cleanInstagramUrl(url)
      
      // Fetch the page
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Instagram page')
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Extract data from script tags
      let videoData: any = null
      
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const data = JSON.parse($(element).html() || '{}')
          if (data.video || data.image) {
            videoData = data
          }
        } catch (e) {
          // Continue searching
        }
      })

      // Alternative: Extract from window._sharedData
      if (!videoData) {
        const scriptContent = $('script').filter((_, element) => {
          return $(element).html()?.includes('window._sharedData')
        }).html()

        if (scriptContent) {
          const match = scriptContent.match(/window\._sharedData = ({.*?});/)
          if (match) {
            const sharedData = JSON.parse(match[1])
            const postData = sharedData.entry_data?.PostPage?.[0]?.graphql?.shortcode_media
            if (postData) {
              videoData = postData
            }
          }
        }
      }

      if (!videoData) {
        throw new Error('Could not extract video information')
      }

      const isVideo = videoData.is_video || videoData['@type'] === 'VideoObject'
      const mediaUrl = isVideo 
        ? (videoData.video_url || videoData.contentUrl)
        : (videoData.display_url || videoData.image || videoData.contentUrl)

      return {
        title: this.extractCaption(videoData) || 'Instagram Post',
        thumbnail: videoData.display_url || videoData.thumbnailUrl || videoData.image || '',
        duration: isVideo ? this.formatDuration(videoData.video_duration || 0) : '0:00',
        views: this.formatViews(videoData.video_view_count || videoData.like_count || 0),
        author: videoData.owner?.username || videoData.author?.name || 'Unknown',
        description: this.extractCaption(videoData) || '',
        videoId: videoData.shortcode || videoData.id || '',
        downloadUrl: mediaUrl || '',
        type: isVideo ? 'video' : 'image'
      }
    } catch (error) {
      console.error('Instagram extraction error:', error)
      throw new Error('Failed to extract Instagram media information')
    }
  }

  static async downloadMedia(url: string): Promise<Buffer> {
    try {
      const mediaInfo = await this.getVideoInfo(url)
      
      if (!mediaInfo.downloadUrl) {
        throw new Error('No download URL found')
      }

      const response = await fetch(mediaInfo.downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://www.instagram.com/'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download media')
      }

      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      console.error('Instagram download error:', error)
      throw new Error('Failed to download Instagram media')
    }
  }

  private static cleanInstagramUrl(url: string): string {
    // Convert to standard format
    const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
    if (match) {
      return `https://www.instagram.com/p/${match[1]}/`
    }
    return url
  }

  private static extractCaption(data: any): string {
    if (data.edge_media_to_caption?.edges?.[0]?.node?.text) {
      return data.edge_media_to_caption.edges[0].node.text
    }
    if (data.caption) {
      return data.caption
    }
    if (data.description) {
      return data.description
    }
    return ''
  }

  private static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
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