import { NextRequest, NextResponse } from 'next/server'
import { VideoExtractor } from '@/lib/video-extractor'

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

    // Download the video
    const videoStream = await VideoExtractor.downloadVideo(url, quality)
    
    // Generate filename
    const timestamp = Date.now()
    const cleanQuality = quality.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `video_${platform.toLowerCase()}_${cleanQuality}_${timestamp}.${format}`

    // If it's a Buffer, convert to stream
    if (Buffer.isBuffer(videoStream)) {
      const headers = new Headers()
      headers.set('Content-Type', `video/${format}`)
      headers.set('Content-Disposition', `attachment; filename="${filename}"`)
      headers.set('Content-Length', videoStream.length.toString())

      return new NextResponse(videoStream, {
        status: 200,
        headers
      })
    }

    // If it's a ReadableStream (YouTube), pipe it
    if (videoStream && typeof videoStream.pipe === 'function') {
      const headers = new Headers()
      headers.set('Content-Type', `video/${format}`)
      headers.set('Content-Disposition', `attachment; filename="${filename}"`)

      // Convert Node.js ReadableStream to Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          videoStream.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk))
          })
          
          videoStream.on('end', () => {
            controller.close()
          })
          
          videoStream.on('error', (error: Error) => {
            controller.error(error)
          })
        }
      })

      return new NextResponse(webStream, {
        status: 200,
        headers
      })
    }

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