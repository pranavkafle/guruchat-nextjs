import type { Config } from "tailwindcss"

const config = {
  content: [
    './pages/**/*.{ts,tsx}', // Optional: Include if you might use pages router later
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    // Add './src/**/*.{ts,tsx}' if you use a src directory
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config

export default config 