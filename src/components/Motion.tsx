import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, type ViewProps } from 'react-native';

export function Reveal({ children, ...props }: ViewProps) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let alive = true;
    let animation: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!alive || reduced) return;
      progress.setValue(0);
      animation = Animated.timing(progress, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== 'web' });
      animation.start();
    });
    return () => { alive = false; animation?.stop(); };
  }, [progress]);
  return <Animated.View {...props} style={[props.style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{children}</Animated.View>;
}

export function useReduceMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (alive) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; subscription.remove(); };
  }, []);
  return reduced;
}
