import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // sharp (binario nativo) se usa en /api/media/jpeg para convertir webp→jpeg.
  serverExternalPackages: ['sharp'],
  // Activa el MCP server en /_next/mcp (Next.js 16+)
  experimental: {
    mcpServer: true,
  },
}

export default nextConfig
