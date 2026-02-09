import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, ViewProps } from 'react-native';
import { theme } from '../../constants/theme';

interface CardProps extends ViewProps {
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'flat';
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  onPress, 
  variant = 'elevated',
  noPadding = false,
  ...props 
}) => {
  const cardStyle = [
    styles.card,
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
    variant === 'flat' && styles.flat,
    noPadding && styles.noPadding,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity 
        style={cardStyle} 
        onPress={onPress} 
        activeOpacity={0.7}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  elevated: {
    ...theme.shadows.sm,
  },
  outlined: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  flat: {
    backgroundColor: 'transparent',
  },
  noPadding: {
    padding: 0,
  },
});
