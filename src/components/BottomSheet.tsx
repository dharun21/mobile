import React from 'react';
import { Keyboard, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardFrame, KeyboardScrollView, useKeyboardVisible } from './KeyboardLayout';
import { useReduceMotion } from './Motion';
import { colors } from '../config';

type BottomSheetProps = { visible: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode };

export function BottomSheet({ visible, onClose, title, subtitle, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const reducedMotion = useReduceMotion();
  const close = () => { Keyboard.dismiss(); onClose(); };
  return <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={close} onDismiss={Keyboard.dismiss}>
    <View className="flex-1 bg-black/70">
      <Pressable accessibilityRole="button" accessibilityLabel="Close sheet" onPress={close} style={{ position: 'absolute', inset: 0 }} />
      <KeyboardFrame pointerEvents="box-none">
        <View pointerEvents="box-none" style={{ flex: 1, justifyContent: 'flex-end', paddingTop: insets.top + 24 }}>
          <View accessibilityViewIsModal className="mx-auto w-full max-w-[600px] overflow-hidden rounded-t-[32px] border border-line bg-panel" style={{ maxHeight: '100%' }}>
            <View className="items-center pb-2 pt-3"><View className="h-1 w-9 rounded-full bg-muted/35" /></View>
            <View className="flex-row items-start px-6 pb-5 pt-2">
              <View className="flex-1 pr-3"><Text accessibilityRole="header" className="font-display text-[23px] leading-[30px] tracking-[-0.6px] text-white">{title}</Text>{subtitle ? <Text className="mt-2 font-sans text-[14px] leading-[21px] text-muted">{subtitle}</Text> : null}</View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close sheet" onPress={close} className="h-11 w-11 items-center justify-center rounded-full bg-raised active:opacity-60"><Ionicons name="close" size={21} color={colors.muted} /></Pressable>
            </View>
            <KeyboardScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: keyboardVisible ? 24 : Math.max(insets.bottom, 12) + 20 }}>
              {children}
            </KeyboardScrollView>
          </View>
        </View>
      </KeyboardFrame>
    </View>
  </Modal>;
}
