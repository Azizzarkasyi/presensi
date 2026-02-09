export const theme = {
  colors: {
    primary: '#2563EB',    // Rich Blue
    secondary: '#475569',  // Slate 600
    background: '#F8FAFC', // Ultra Light Slate
    card: '#FFFFFF',
    text: {
      primary: '#1E293B',  // Slate 900
      secondary: '#64748B', // Slate 500
      light: '#94A3B8',    // Slate 400
      inverse: '#FFFFFF',
    },
    border: '#E2E8F0',     // Slate 200
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    action: {
      hover: '#1D4ED8',
      pressed: '#1E40AF',
      disabled: '#94A3B8',
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
    h1: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
    h2: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
    h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
    body: { fontSize: 16, lineHeight: 24 },
    caption: { fontSize: 14, lineHeight: 20 },
    small: { fontSize: 12, lineHeight: 16 },
  },
  shadows: {
    sm: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    }
  }
} as const;
