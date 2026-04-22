import React, {useEffect, useRef} from "react";
import {View, Animated, StyleSheet, ViewStyle} from "react-native";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Shimmer loading skeleton placeholder.
 * Usage: <Skeleton width={200} height={20} />
 */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const backgroundColor = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#e2e8f0", "#f1f5f9"],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
}

/**
 * Pre-built skeleton layouts for common patterns
 */
export function CardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <Skeleton width="60%" height={20} style={{marginBottom: 12}} />
      <Skeleton width="100%" height={14} style={{marginBottom: 8}} />
      <Skeleton width="80%" height={14} />
    </View>
  );
}

export function ListItemSkeleton() {
  return (
    <View style={skeletonStyles.listItem}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={{flex: 1, marginLeft: 12}}>
        <Skeleton width="70%" height={16} style={{marginBottom: 6}} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});
