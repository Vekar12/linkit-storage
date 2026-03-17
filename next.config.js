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
          // Content Security Policy — tightened for dashboard pages
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",   // unsafe-inline needed for Next.js inline scripts
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://linkit-backend-tuj9.onrender.com",
              "frame-src 'self' https://view.officeapps.live.com https://storage.googleapis.com https:",  // allow file iframes + Office viewer
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
