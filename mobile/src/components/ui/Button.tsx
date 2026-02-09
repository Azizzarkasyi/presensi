import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { theme } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return theme.colors.action.disabled;
    switch (variant) {
      case 'primary': return theme.colors.primary;
      case 'secondary': return theme.colors.secondary;
      case 'danger': return theme.colors.status.error;
      case 'success': return theme.colors.status.success;
      case 'outline': 
      case 'ghost': 
        return 'transparent';
      default: return theme.colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled && variant !== 'primary' && variant !== 'success' && variant !== 'danger') return theme.colors.action.disabled;
    switch (variant) {
      case 'outline': return theme.colors.primary;
      case 'ghost': return theme.colors.text.secondary;
      case 'danger': 
      case 'success':
        return theme.colors.text.inverse;
      default: return theme.colors.text.inverse;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm': return { minHeight: 36, paddingVertical: 6, paddingHorizontal: 12 };
      case 'lg': return { minHeight: 56, paddingVertical: 16, paddingHorizontal: 32 };
      default: return { minHeight: 48, paddingVertical: 12, paddingHorizontal: 24 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return 13;
      case 'lg': return 18;
      default: return 16;
    }
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor() },
        getSizeStyles(),
        variant === 'outline' && styles.outlineBorder,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text style={[
            styles.text, 
            { color: getTextColor(), fontSize: getFontSize() },
            icon ? { marginLeft: 8 } : {},
            textStyle
          ]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
  },
  outlineBorder: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.8,
  },
});
