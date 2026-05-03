import { theme } from './theme'

export const tokens = {
  // Colors
  bg: theme.colors.background,
  panel: theme.colors.panel,
  'panel-hover': theme.colors['panel-hover'],
  border: theme.colors.border,
  'text-primary': theme.colors['text-primary'],
  'text-secondary': theme.colors['text-secondary'],
  accent: theme.colors.accent,
  'accent-weak': theme.colors['accent-weak'],
  danger: theme.colors.danger,
  success: theme.colors.success,

  // Fonts
  fontPrimary: theme.fonts.primary,
  fontMono: theme.fonts.mono,

  // Border radius
  radiusSm: theme.borderRadius.sm,
  radiusMd: theme.borderRadius.md,
  radiusLg: theme.borderRadius.lg,
  radiusXl: theme.borderRadius.xl,

  // Shadows
  shadowSm: theme.shadows.sm,
  shadowMd: theme.shadows.md,
  shadowLg: theme.shadows.lg,
}