const nextConfig = {
  // Removed static export to enable server-side features
  reactStrictMode: true,

  // Make environment variables available to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Output standalone for better container compatibility
  output: "standalone",
};

module.exports = nextConfig;
