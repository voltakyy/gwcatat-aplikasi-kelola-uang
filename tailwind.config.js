/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./login.html"
  ],
  theme: {
    extend: {
      colors: {
        'warm-ivory': '#FAF8F4',
        'soft-stone': '#F1EFEA',
        'deep-forest': '#264653',
        'muted-gold': '#C89B3C',
        'sage-green': '#7A9E7E',
        'terracotta': '#C76D4E',
        'charcoal': '#2D2D2D',
        'beige': 'rgba(44, 42, 38, 0.08)',
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '24px',
        'sm': '14px',
        'xs': '10px',
      },
    },
  },
  plugins: [],
}
