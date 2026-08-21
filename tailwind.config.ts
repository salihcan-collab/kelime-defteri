import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        'paper-alt': 'rgb(var(--color-paper-alt) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--color-ink-soft) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--color-accent-soft) / <alpha-value>)',
        'accent-ink': 'rgb(var(--color-accent-ink) / <alpha-value>)',
        highlight: 'rgb(var(--color-highlight) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warn: 'rgb(var(--color-warn) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
      },
      fontFamily: {
        body: 'var(--font-body)',
        heading: 'var(--font-heading)',
      },
      boxShadow: {
        notebook: '0 1px 2px rgba(30, 20, 10, 0.06), 0 6px 18px rgba(30, 20, 10, 0.06)',
        lift: '0 2px 4px rgba(30, 20, 10, 0.08), 0 10px 28px rgba(30, 20, 10, 0.10)',
      },
      borderRadius: {
        notebook: '1rem',
      },
    },
  },
  plugins: [],
};

export default config;
