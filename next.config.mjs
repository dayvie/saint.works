/** @type {import('next').NextConfig} */

// Determine if we're building for production (GitHub Pages)
// Set GITHUB_PAGES=true when building for production deployment
const isProduction = process.env.GITHUB_PAGES === "true";
const basePath = isProduction ? "/saint.works" : "";

// Export basePath for use in other files
process.env.NEXT_PUBLIC_BASE_PATH = basePath;

const nextConfig = {
  /**
   * Enable static exports.
   *
   * @see https://nextjs.org/docs/app/building-your-application/deploying/static-exports
   */
  output: "export",

  /**
   * Set base path. This is the slug of your GitHub repository.
   * Empty string for local dev, "/saint.works" for GitHub Pages.
   *
   * @see https://nextjs.org/docs/app/api-reference/next-config-js/basePath
   */
  basePath: basePath,

  /**
   * Disable server-based image optimization. Next.js does not support
   * dynamic features with static exports.
   *
   * @see https://nextjs.org/docs/app/api-reference/components/image#unoptimized
   */
  images: {
    unoptimized: true,
  },

  /**
   * Enable React strict mode.
   */
  reactStrictMode: true,

  /**
   * Configure Sass to inject basePath variable
   */
  sassOptions: {
    additionalData: `$base-path: "${basePath}";`,
  },
};

export default nextConfig;

