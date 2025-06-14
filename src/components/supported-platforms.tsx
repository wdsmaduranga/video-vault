"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Youtube, 
  Facebook, 
  Instagram, 
  Twitter,
  Sparkles,
  CheckCircle,
  Shield,
  Zap
} from "lucide-react"

const platforms = [
  {
    name: "YouTube",
    icon: Youtube,
    color: "bg-red-500",
    description: "Download videos in up to 4K quality",
    formats: ["MP4", "WEBM"],
    maxQuality: "4K"
  },
  {
    name: "TikTok",
    icon: Sparkles,
    color: "bg-black",
    description: "Save TikTok videos without watermarks",
    formats: ["MP4"],
    maxQuality: "1080p"
  },
  {
    name: "Instagram",
    icon: Instagram,
    color: "bg-gradient-to-br from-purple-500 to-pink-500",
    description: "Download posts, reels, and stories",
    formats: ["MP4", "JPG"],
    maxQuality: "1080p"
  },
  {
    name: "Facebook",
    icon: Facebook,
    color: "bg-blue-600",
    description: "Save Facebook videos and posts",
    formats: ["MP4"],
    maxQuality: "1080p"
  },
  {
    name: "Twitter/X",
    icon: Twitter,
    color: "bg-gray-900",
    description: "Download Twitter videos and GIFs",
    formats: ["MP4", "GIF"],
    maxQuality: "720p"
  }
]

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Ultra-fast processing and download speeds"
  },
  {
    icon: Shield,
    title: "100% Secure",
    description: "No data stored, completely private and safe"
  },
  {
    icon: CheckCircle,
    title: "High Quality",
    description: "Download in original quality up to 4K"
  }
]

export function SupportedPlatforms() {
  return (
    <div className="space-y-8">
      {/* Supported Platforms */}
      <Card className="shadow-xl border-0 bg-white/60 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl mb-2">Supported Platforms</CardTitle>
          <p className="text-gray-600">
            Download videos from all your favorite social media platforms
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const Icon = platform.icon
              return (
                <div
                  key={platform.name}
                  className="group p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-lg bg-white/50"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-10 h-10 ${platform.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                      <p className="text-xs text-gray-500">Max: {platform.maxQuality}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {platform.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    {platform.formats.map((format) => (
                      <Badge key={format} variant="secondary" className="text-xs">
                        {format}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            })}
            
            {/* Coming Soon Card */}
            <div className="group p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gray-300 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-600">More Platforms</h3>
                  <p className="text-xs text-gray-400">Coming Soon</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-3">
                We're adding support for more platforms
              </p>
              
              <Badge variant="outline" className="text-xs text-gray-500">
                Stay Tuned
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl mb-2">Why Choose VideoVault?</CardTitle>
          <p className="text-gray-600">
            The most reliable and feature-rich video downloader
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}