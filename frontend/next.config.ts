import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

const nextConfig: NextConfig = {
  // Static export for Netlify
  output: 'export',
  trailingSlash: true,
  
  images: {
    unoptimized: true, // Required for static export
  }
};

export default nextConfig;
