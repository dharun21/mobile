import React, { createContext, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, View, type ScrollViewProps, type ViewProps } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

const FocusContext = createContext<() => void>(() => undefined);
export const useRevealFocusedInput = () => useContext(FocusContext);

export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const viewport = window.visualViewport;
      const update = () => setVisible(Boolean(viewport && window.innerHeight - viewport.height > 120));
      viewport?.addEventListener('resize', update);
      return () => viewport?.removeEventListener('resize', update);
    }
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible;
}

/** One keyboard-resizing boundary per screen/modal. automaticOffset includes headers. */
export function KeyboardFrame({ children, className = '', style, keyboardVerticalOffset = 0, ...props }: ViewProps & { className?: string; keyboardVerticalOffset?: number }) {
  if (Platform.OS === 'web') return <View className={`flex-1 ${className}`} style={style} {...props}>{children}</View>;
  return <View className={`flex-1 ${className}`} style={style} {...props}>
    <KeyboardAvoidingView behavior="padding" automaticOffset keyboardVerticalOffset={keyboardVerticalOffset} style={{ flex: 1 }}>{children}</KeyboardAvoidingView>
  </View>;
}

/** Scroll the focused input into the resized viewport, including when focus moves
 * between fields while the keyboard is already open. No second keyboard inset. */
export const KeyboardScrollView = forwardRef<ScrollView, ScrollViewProps & { contentContainerClassName?: string }>(function KeyboardScrollView({ children, onLayout, ...props }, forwardedRef) {
  const scroll = useRef<ScrollView>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useImperativeHandle(forwardedRef, () => scroll.current!, []);
  const reveal = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (Platform.OS === 'web') {
        const focused = document.activeElement as HTMLElement | null;
        const host = scroll.current as unknown as HTMLElement | null;
        if (focused && host?.contains?.(focused)) focused.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        const focused = TextInput.State.currentlyFocusedInput();
        if (focused) scroll.current?.scrollResponderScrollNativeHandleToKeyboard(focused, 28, true);
      }
    }, Platform.OS === 'web' ? 80 : 100);
  }, []);
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', reveal);
    return () => { subscription.remove(); if (timer.current) clearTimeout(timer.current); };
  }, [reveal]);
  return <FocusContext.Provider value={reveal}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} automaticallyAdjustKeyboardInsets={false} showsVerticalScrollIndicator={false} {...props} onLayout={(event) => { onLayout?.(event); if (Keyboard.isVisible()) reveal(); }}>
      {children}
    </ScrollView>
  </FocusContext.Provider>;
});
