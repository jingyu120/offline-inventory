import { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { Box } from './Primitives';

export function SkeletonRow({
  height = 20,
  width = '100%',
  borderRadius = 's',
}: {
  height?: number;
  width?: number | 'auto' | `${number}%`;
  borderRadius?: 'none' | 's' | 'm' | 'l' | 'xl';
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity, width, height }}>
      <Box
        bg="borderColor"
        borderRadius={borderRadius}
        width="100%"
        height="100%"
      />
    </Animated.View>
  );
}

export function SkeletonCard() {
  return (
    <Box
      p="m"
      borderRadius="m"
      borderWidth={1}
      borderColor="borderColor"
      bg="secondaryBackground"
    >
      <SkeletonRow height={24} width="60%" borderRadius="s" />
      <Box height={8} />
      <SkeletonRow height={16} width="40%" borderRadius="s" />
      <Box height={16} />
      <SkeletonRow height={14} width="90%" borderRadius="s" />
      <Box height={6} />
      <SkeletonRow height={14} width="80%" borderRadius="s" />
    </Box>
  );
}
