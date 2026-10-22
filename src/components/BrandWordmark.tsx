import React from 'react';
import { Text, View } from 'react-native';
import { colors, fonts } from '../config';

/** The same Great Vibes lettering and violet AI badge used on the web. */
export function BrandWordmark({ size = 40, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <View accessible accessibilityLabel="Zengen AI" accessibilityRole="image" style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.18 }}>
      <Text allowFontScaling={false} style={{ fontFamily: fonts.brand, fontSize: size, lineHeight: size * 1.3, color: colors.text, paddingHorizontal: 3, paddingTop: size * 0.07 }}>
        {compact ? 'Z' : 'Zengen'}
      </Text>
      <View style={{ borderWidth: 1, borderColor: '#C4B5FD40', backgroundColor: '#C4B5FD12', borderRadius: Math.max(5, size * 0.15), paddingHorizontal: size * 0.17, paddingVertical: size * 0.11, marginTop: -size * 0.09 }}>
        <Text allowFontScaling={false} style={{ color: colors.lilac, fontSize: Math.max(9, size * 0.25), fontFamily: fonts.bold, letterSpacing: 1.8 }}>AI</Text>
      </View>
    </View>
  );
}
