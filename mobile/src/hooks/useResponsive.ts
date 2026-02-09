import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface UseResponsiveReturn {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWeb: boolean;
}

export const useResponsive = (): UseResponsiveReturn => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;

  const getBreakpoint = (): Breakpoint => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  };

  const breakpoint = getBreakpoint();

  return {
    width,
    height,
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isWeb: Platform.OS === 'web',
  };
};

// Responsive style helper
export const responsive = <T extends object>(
  mobile: T,
  tablet?: Partial<T>,
  desktop?: Partial<T>
) => {
  return (breakpoint: Breakpoint): T => {
    if (breakpoint === 'desktop' && desktop) {
      return { ...mobile, ...tablet, ...desktop };
    }
    if (breakpoint === 'tablet' && tablet) {
      return { ...mobile, ...tablet };
    }
    return mobile;
  };
};
