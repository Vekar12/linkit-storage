/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['raw.githubusercontent.com', 'github.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevents clickjacking (embedding your site in iframes on other domains)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Stops browser from guessing MIME types (prevents MIME-sniffing attacks)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Forces HTTPS for 1 year
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Controls what data is sent in Referer header
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restricts browser features (camera, mic, etc.)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
