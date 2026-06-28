/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://qpwtgjldndodsgorsqxm.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd3RnamxkbmRvZHNnb3JzcXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxOTYwMjksImV4cCI6MjA5Nzc3MjAyOX0.NzhmIjIfSAhCBsCCOTFNAvWSYhlBRxWTWS4yUbd19fE',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}
module.exports = nextConfig
