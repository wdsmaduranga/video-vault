import { NextRequest, NextResponse } from 'next/server'
import { VideoExtractor } from '@/lib/video-extractor'
import { Readable } from 'stream'

export async function POST(request: NextRequest) {
  try {
    const { url, quality, format = 'mp4' } = await request.json()

    if (!url || !quality) {
      return NextResponse.json(
        { success: false, error: 'URL and quality are required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Check if platform is supported
    const platform = VideoExtractor.detectPlatform(url)
    if (platform === 'Unknown') {
      return NextResponse.json(
        { success: false, error: 'Unsupported platform' },
        { status: 400 }
      )
    }

    console.log(`Starting download for ${platform} video...`)
    
    // Download the video
    const videoStream = await VideoExtractor.downloadVideo(url, quality)
    
    // Generate filename
    const timestamp = Date.now()
    const cleanQuality = quality.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `video_${platform.toLowerCase()}_${cleanQuality}_${timestamp}.${format}`

    // If it's a Buffer, convert to stream
    if (Buffer.isBuffer(videoStream)) {
      console.log('Processing buffer stream...')
      const headers = new Headers()
      headers.set('Content-Type', `video/${format}`)
      headers.set('Content-Disposition', `attachment; filename="${filename}"`)
      headers.set('Content-Length', videoStream.length.toString())

      return new NextResponse(new Uint8Array(videoStream), {
        status: 200,
        headers
      })
    }

    // If it's a ReadableStream (YouTube), convert to Buffer
    if (videoStream && typeof videoStream.pipe === 'function') {
      console.log('Processing Node.js ReadableStream...')
      
      // Convert stream to buffer
      const chunks: Buffer[] = []
      for await (const chunk of videoStream as Readable) {
        chunks.push(Buffer.from(chunk))
      }
      const buffer = Buffer.concat(chunks)
      
      const headers = new Headers()
      headers.set('Content-Type', `video/${format}`)
      headers.set('Content-Disposition', `attachment; filename="${filename}"`)
      headers.set('Content-Length', buffer.length.toString())

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers
      })
    }

    console.error('Invalid video stream format:', typeof videoStream)
    throw new Error('Invalid video stream format')

  } catch (error) {
    console.error('Error in video download API:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}