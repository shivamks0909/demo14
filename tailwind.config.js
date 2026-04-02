/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#5B5CF6',
        'primary-hover': '#4B4CF0',
        'primary-tint': '#EEF0FF',
        'text-dark': '#0F172A',
        'text-body': '#475569',
        'text-muted': '#94A3B8',
        'bg-main': '#FFFFFF',
        'bg-alt': '#F8FAFC',
        'border-base': '#E2E8F0',
        success: '#10B981',
        destructive: '#EF4444',
        accent: '#8B5CF6',
        secondary: '#64748B',
        muted: '#F1F5F9',
      },
      boxShadow: {
        bento: '0 4px 20px rgba(0, 0, 0, 0.03)',
        'bento-hover': '0 8px 30px rgba(0, 0, 0, 0.06)',
        'primary-soft': '0 10px 30px -5px rgba(91, 92, 246, 0.2)',
        toggle: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        reveal: 'reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        float: 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        spotlight: 'spotlight 2s ease 0.75s 1 forwards',
      },
      keyframes: {
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        spotlight: {
          '0%': { opacity: '0', transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -40%) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
