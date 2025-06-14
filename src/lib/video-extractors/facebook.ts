import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

export interface FacebookVideoInfo {
  title: string
  thumbnail: string
  duration: string
  views: string
  author: string
  description: string
  videoId: string
  downloadUrl: string
}

export class FacebookExtractor {
  static async getVideoInfo(url: string): Promise<FacebookVideoInfo> {
    try {
      // Clean the URL
      const cleanUrl = this.cleanFacebookUrl(url)
      
      // Fetch the page
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Facebook page')
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Extract video information from meta tags
      const title = $('meta[property="og:title"]').attr('content') || 
                   $('title').text() || 
                   'Facebook Video'

      const description = $('meta[property="og:description"]').attr('content') || 
                         $('meta[name="description"]').attr('content') || 
                         ''

      const thumbnail = $('meta[property="og:image"]').attr('content') || ''

      // Extract video URL from meta tags
      const videoUrl = $('meta[property="og:video:url"]').attr('content') || 
                      $('meta[property="og:video"]').attr('content') || 
                      ''

      // Try to extract from script tags
      let scriptVideoUrl = ''
      $('script').each((_, element) => {
        const scriptContent = $(element).html() || ''
        if (scriptContent.includes('hd_src') || scriptContent.includes('sd_src')) {
          const hdMatch = scriptContent.match(/"hd_src":"([^"]+)"/)
          const sdMatch = scriptContent.match(/"sd_src":"([^"]+)"/)
          
          if (hdMatch) {
            scriptVideoUrl = hdMatch[1].replace(/\\u0025/g, '%').replace(/\\/g, '')
          } else if (sdMatch) {
            scriptVideoUrl = sdMatch[1].replace(/\\u0025/g, '%').replace(/\\/g, '')
          }
        }
      })

      // Extract video ID from URL
      const videoIdMatch = cleanUrl.match(/videos\/(\d+)/) || cleanUrl.match(/\/(\d+)\/?$/)
      const videoId = videoIdMatch ? videoIdMatch[1] : ''

      return {
        title: title.replace(' | Facebook', ''),
        thumbnail,
        duration: '0:00', // Facebook doesn't provide duration in meta tags
        views: '0 views', // Facebook doesn't provide view count in meta tags
        author: 'Facebook User',
        description,
        videoId,
        downloadUrl: scriptVideoUrl || videoUrl
      }
    } catch (error) {
      console.error('Facebook extraction error:', error)
      throw new Error('Failed to extract Facebook video information')
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
          'Referer': 'https://www.facebook.com/'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download video')
      }

      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      console.error('Facebook download error:', error)
      throw new Error('Failed to download Facebook video')
    }
  }

  private static cleanFacebookUrl(url: string): string {
    // Handle different Facebook URL formats
    if (url.includes('fb.watch')) {
      return url
    }
    
    // Convert mobile URLs to desktop
    return url.replace('m.facebook.com', 'www.facebook.com')
  }
}