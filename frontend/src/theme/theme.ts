export const theme = {
  colors: {
    background: 'hsl(222, 47%, 5%)',
    panel: 'hsl(222, 47%, 11%)',
    'panel-hover': 'hsl(222, 47%, 13%)',
    border: 'hsl(215, 28%, 17%)',
    'text-primary': 'hsl(210, 40%, 98%)',
    'text-secondary': 'hsl(215, 20%, 65%)',
    accent: 'hsl(200, 100%, 50%)',
    'accent-weak': 'hsl(200, 50%, 70%)',
    danger: 'hsl(0, 75%, 60%)',
    success: 'hsl(142, 76%, 36%)',
  },
  fonts: {
    primary: 'Inter, system-ui, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
}

export const lightTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    background: 'hsl(210, 40%, 98%)',
    panel: 'hsl(210, 40%, 96%)',
    'panel-hover': 'hsl(210, 40%, 94%)',
    border: 'hsl(214, 32%, 91%)',
    'text-primary': 'hsl(222, 47%, 11%)',
    'text-secondary': 'hsl(215, 16%, 47%)',
    accent: 'hsl(200, 100%, 40%)',
    'accent-weak': 'hsl(200, 50%, 50%)',
  },
}