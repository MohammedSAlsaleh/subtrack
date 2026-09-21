import colors from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';

/**
 * Returns the design tokens for the current color scheme.
 *
 * Respects a manual theme override (System / Light / Dark) stored via
 * ThemeContext. Falls back to the system colour scheme when set to "system".
 */
export function useColors() {
  const { resolvedScheme } = useTheme();
  const palette = resolvedScheme === 'dark' ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
