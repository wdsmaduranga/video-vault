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
    
    // Create a new TransformStream for progress updates
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    // Start the download process
    const downloadPromise = (async () => {
      try {
        const videoStream = await VideoExtractor.downloadVideo(url, quality)
        
        // Generate filename
        const timestamp = Date.now()
        const cleanQuality = quality.replace(/[^a-zA-Z0-9]/g, '_')
        const filename = `video_${platform.toLowerCase()}_${cleanQuality}_${timestamp}.${format}`

        // If it's a Buffer, send it directly
        if (Buffer.isBuffer(videoStream)) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ progress: 100 })}\n\n`))
          await writer.write(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete',
            buffer: videoStream.toString('base64'),
            filename,
            contentType: `video/${format}`
          })}\n\n`))
          await writer.close()
          return
        }

        // If it's a ReadableStream (YouTube), handle progress
        if (videoStream && typeof videoStream.pipe === 'function') {
          console.log('Processing Node.js ReadableStream...')
          
          let downloaded = 0
          let total = 0
          
          // Convert stream to buffer with progress
          const chunks: Buffer[] = []
          for await (const chunk of videoStream as Readable) {
            const buffer = Buffer.from(chunk)
            chunks.push(buffer)
            downloaded += buffer.length
            
            // Estimate total size based on first chunk
            if (!total && downloaded > 0) {
              total = downloaded * 10 // Rough estimate
            }
            
            // Send progress update
            if (total) {
              const progress = Math.min(Math.round((downloaded / total) * 100), 99)
              await writer.write(encoder.encode(`data: ${JSON.stringify({ progress })}\n\n`))
            }
          }
          
          const buffer = Buffer.concat(chunks)
          
          // Send completion message
          await writer.write(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete',
            buffer: buffer.toString('base64'),
            filename,
            contentType: `video/${format}`
          })}\n\n`))
          await writer.close()
          return
        }

        throw new Error('Invalid video stream format')
      } catch (error) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ 
          type: 'error',
          error: error instanceof Error ? error.message : 'Download failed'
        })}\n\n`))
        await writer.close()
      }
    })()

    // Return the readable stream for SSE
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in video download API:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}