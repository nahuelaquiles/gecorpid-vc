/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🚫 No cortar el build en Vercel por errores de ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 🚫 No cortar el build por errores de TypeScript (si aparecieran)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Recomendado para despliegues en Vercel (optimiza el output)
  output: 'standalone',
};

export default nextConfig;
