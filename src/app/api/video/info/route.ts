import { NextRequest, NextResponse } from 'next/server'
import { VideoExtractor } from '@/lib/video-extractor'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { success: false, message: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Check if platform is supported
    const platform = VideoExtractor.detectPlatform(url)
    if (platform === 'Unknown') {
      return NextResponse.json(
        { success: false, message: 'Unsupported platform. Please use YouTube, TikTok, Instagram, Twitter/X, or Facebook URLs.' },
        { status: 400 }
      )
    }

    // Extract video information
    const videoInfo = await VideoExtractor.getVideoInfo(url)

    return NextResponse.json({
      success: true,
      data: videoInfo
    })

  } catch (error) {
    console.error('Error in video info API:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    )
  }
}