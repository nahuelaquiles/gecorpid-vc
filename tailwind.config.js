/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan all app and component files for Tailwind classes. Include TS/JS and MDX as needed.
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Preserve the soft shadow used in the previous build and the deeper xl shadow from the premium UI
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.06)",
        xl: "0 20px 45px rgba(0,0,0,0.45)",
      },
      // Ensure the extra‑large border radius from the previous build is available
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};
