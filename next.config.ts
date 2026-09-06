import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Exact Vercel Blob store used by Ferñent (covers / audio).
      {
        protocol: "https",
        hostname: "bfpfaox9ur5poupw.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      // Allow other store IDs on the same Blob platform if the store rotates.
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "image.pollinations.ai" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  async redirects() {
    return [
      { source: "/archives", destination: "/mensuel", permanent: true },
      { source: "/videos", destination: "/capsules", permanent: true },
      {
        source: "/rubrique/:slug",
        destination: "/breves?r=:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
