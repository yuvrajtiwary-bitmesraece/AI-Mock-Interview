/**
 * Security headers sent with every response.
 * A full Content-Security-Policy is not set here: Clerk and Next.js need inline
 * scripts, so a strict policy needs per-request nonces. The directives below are
 * the parts that are safe without them.
 */
const securityHeaders = [
  // Don't let other sites embed the app in a frame (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  // Stop browsers from guessing content types.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The interview room uses the camera and microphone; nothing else is needed.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    // Server actions accept 1 MB by default. Resume uploads can be up to 4 MB
    // (utils/resume.js), and Vercel caps request bodies at 4.5 MB.
    serverActions: { bodySizeLimit: "5mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
