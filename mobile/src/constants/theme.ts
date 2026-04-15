export const theme = {
  colors: {
    primary: '#1E3A8A',    // Deep Royal Blue (Modern/Formal)
    secondary: '#334155',  // Slate 700
    background: '#F8FAFC', // Slate 50
    card: '#FFFFFF',
    text: {
      primary: '#0F172A',  // Slate 900
      secondary: '#475569', // Slate 600
      light: '#94A3B8',    // Slate 400
      inverse: '#FFFFFF',
    },
    border: '#E2E8F0',     // Slate 200
    status: {
      success: '#059669',  // Emerald 600
      warning: '#D97706',  // Amber 600
      error: '#DC2626',    // Red 600
      info: '#2563EB',     // Blue 600
    },
    action: {
      hover: '#1E40AF',
      pressed: '#172554',
      disabled: '#CBD5E1',
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    h1: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, lineHeight: 34 },
    h2: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 24, lineHeight: 30 },
    h3: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 20, lineHeight: 28 },
    body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 16, lineHeight: 24 },
    caption: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14, lineHeight: 20 },
    small: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, lineHeight: 16 },
  },
  shadows: {
    sm: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 8,
    }
  }
} as const;
