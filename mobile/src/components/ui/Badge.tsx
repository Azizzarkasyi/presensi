import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ 
  label, 
  variant = 'default',
  size = 'md' 
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: '#DCFCE7', text: '#166534' }; // Green 100/800
      case 'warning':
        return { bg: '#FEF3C7', text: '#92400E' }; // Amber 100/800
      case 'error':
        return { bg: '#FEE2E2', text: '#991B1B' }; // Red 100/800
      case 'info':
        return { bg: '#DBEAFE', text: '#1E40AF' }; // Blue 100/800
      default:
        return { bg: '#F1F5F9', text: '#475569' }; // Slate 100/600
    }
  };

  const colors = getColors();

  return (
    <View style={[
      styles.container, 
      { backgroundColor: colors.bg },
      size === 'sm' && styles.small
    ]}>
      <Text style={[
        styles.text, 
        { color: colors.text },
        size === 'sm' && styles.textSmall
      ]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 10,
  },
});
