import { createTheme } from 'next-themes'

export const theme = {
  colors: {
    background: 'var(--background)',
    panel: 'var(--panel)',
    'panel-hover': 'var(--panel-hover)',
    border: 'var(--border)',
    'text-primary': 'var(--text-primary)',
    'text-secondary': 'var(--text-secondary)',
    accent: 'var(--accent)',
    'accent-weak': 'var(--accent-weak)',
    danger: 'var(--danger)',
    success: 'var(--success)',
  },
  fonts: {
    primary: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '1.5rem',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
}

export type ThemeColors = typeof theme.colors