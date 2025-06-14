import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

export interface TwitterVideoInfo {
  title: string
  thumbnail: string
  duration: string
  views: string
  author: string
  description: string
  videoId: string
  downloadUrl: string
}

export class TwitterExtractor {
  static async getVideoInfo(url: string): Promise<TwitterVideoInfo> {
    try {
      // Clean the URL
      const cleanUrl = this.cleanTwitterUrl(url)
      
      // Use a different approach for Twitter/X
      // Since Twitter requires authentication for API access, we'll use web scraping
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Twitter page')
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Extract video information from meta tags
      const title = $('meta[property="og:title"]').attr('content') || 
                   $('meta[name="twitter:title"]').attr('content') || 
                   'Twitter Video'

      const description = $('meta[property="og:description"]').attr('content') || 
                         $('meta[name="twitter:description"]').attr('content') || 
                         ''

      const thumbnail = $('meta[property="og:image"]').attr('content') || 
                       $('meta[name="twitter:image"]').attr('content') || 
                       ''

      // Extract video URL from meta tags
      const videoUrl = $('meta[property="og:video:url"]').attr('content') || 
                      $('meta[property="og:video"]').attr('content') || 
                      $('meta[name="twitter:player:stream"]').attr('content') || 
                      ''

      // Extract author information
      const author = $('meta[name="twitter:creator"]').attr('content') || 
                    $('meta[property="og:site_name"]').attr('content') || 
                    'Twitter User'

      // Extract tweet ID from URL
      const tweetIdMatch = cleanUrl.match(/status\/(\d+)/)
      const videoId = tweetIdMatch ? tweetIdMatch[1] : ''

      return {
        title: title.replace(' / Twitter', '').replace(' / X', ''),
        thumbnail,
        duration: '0:00', // Twitter doesn't provide duration in meta tags
        views: '0 views', // Twitter doesn't provide view count in meta tags
        author: author.replace('@', ''),
        description,
        videoId,
        downloadUrl: videoUrl
      }
    } catch (error) {
      console.error('Twitter extraction error:', error)
      throw new Error('Failed to extract Twitter video information')
    }
  }

  static async downloadVideo(url: string): Promise<Buffer> {
    try {
      const videoInfo = await this.getVideoInfo(url)
      
      if (!videoInfo.downloadUrl) {
        // Try alternative method using tweet ID
        const tweetId = videoInfo.videoId
        if (tweetId) {
          // Use a third-party service or API to get video URL
          const downloadUrl = await this.getVideoUrlFromTweetId(tweetId)
          if (downloadUrl) {
            const response = await fetch(downloadUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            })

            if (response.ok) {
              return Buffer.from(await response.arrayBuffer())
            }
          }
        }
        throw new Error('No download URL found')
      }

      const response = await fetch(videoInfo.downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://twitter.com/'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download video')
      }

      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      console.error('Twitter download error:', error)
      throw new Error('Failed to download Twitter video')
    }
  }

  private static cleanTwitterUrl(url: string): string {
    // Handle both twitter.com and x.com
    return url.replace('x.com', 'twitter.com')
  }

  private static async getVideoUrlFromTweetId(tweetId: string): Promise<string | null> {
    try {
      // This would typically use Twitter API or a third-party service
      // For now, we'll return null and handle it gracefully
      return null
    } catch (error) {
      return null
    }
  }
}