// API endpoint to provide runtime configuration to the client
export default function handler(req, res) {
  res.status(200).json({
    apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  });
}
