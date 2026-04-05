/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Enterprise Green
        primary: {
          DEFAULT: '#1a7a4a',
          hover: '#166534',
          soft: '#f0fdf4',
          border: '#bbf7d0',
          muted: '#dcfce7',
        },
        // Text hierarchy
        text: {
          primary: '#0f172a',
          secondary: '#475569',
          muted: '#94a3b8',
          inverse: '#ffffff',
        },
        // Background surfaces
        bg: {
          main: '#f8fafc',
          surface: '#ffffff',
          elevated: '#ffffff',
          subtle: '#f1f5f9',
        },
        // Borders
        border: {
          base: '#e2e8f0',
          subtle: '#f1f5f9',
          focus: '#1a7a4a',
        },
        // Semantic colors
        success: {
          DEFAULT: '#10b981',
          soft: '#d1fae5',
          border: '#a7f3d0',
        },
        warning: {
          DEFAULT: '#f59e0b',
          soft: '#fef3c7',
          border: '#fde68a',
        },
        error: {
          DEFAULT: '#ef4444',
          soft: '#fee2e2',
          border: '#fecaca',
        },
        info: {
          DEFAULT: '#3b82f6',
          soft: '#dbeafe',
          border: '#bfdbfe',
        },
        neutral: {
          DEFAULT: '#64748b',
          soft: '#f1f5f9',
          border: '#e2e8f0',
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)',
        'card-elevated': '0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.06)',
        'sidebar': '1px 0 0 #e2e8f0',
        'header': '0 1px 3px rgba(0,0,0,0.04)',
        'button': '0 1px 2px rgba(0,0,0,0.05)',
        'button-hover': '0 4px 12px rgba(26,122,74,0.15)',
        'input': '0 1px 2px rgba(0,0,0,0.04)',
        'dropdown': '0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        'primary-soft': '0 4px 14px rgba(26,122,74,0.15)',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0' }],
        'sm': ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '0' }],
        'base': ['0.875rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
        'lg': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
        'xl': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.02em' }],
        '3xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.025em' }],
        '4xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.03em' }],
      },
      borderRadius: {
        'none': '0',
        'sm': '0.375rem',
        'DEFAULT': '0.5rem',
        'md': '0.625rem',
        'lg': '0.75rem',
        'xl': '0.875rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'slide-down': 'slideDown 0.2s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionDuration: {
        'default': '150ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [],
}
