import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandWordmark } from '../../components/BrandWordmark';
import { Card, Copy, Eyebrow, Heading, SectionTitle } from '../../components/ui';
import { colors, fonts } from '../../config';
import { useTheme } from '../../context/ThemeContext';

const plans = [
  { name: 'Spark', tagline: 'A bright beginning.', price: 35, count: 'Any 2 AI specialists', description: 'For individuals building their first AI team.', info: '1 user · 1 device · Medium usage limits', features: ['Choose any 2 specialist AI employees', 'Personal AI Assistant included'], icon: 'flash-outline' as const },
  { name: 'Nexus', tagline: 'Better, together.', price: 65, count: 'Any 4 AI specialists', description: 'For growing businesses bringing their work together.', info: '2 users · 2 devices · Medium usage limits', features: ['Choose any 4 specialist AI employees', 'Personal AI Assistant included'], popular: true, icon: 'people-outline' as const },
  { name: 'Infinity', tagline: 'Room for every possibility.', price: 250, count: 'Any 6 AI specialists', description: 'For businesses ready for a broader AI workforce.', info: '3 users · 3 devices · High usage limits', features: ['Choose any 6 specialist AI employees', 'Personal AI Assistant included', 'Early access trials for upcoming specialists'], icon: 'infinite-outline' as const },
];

export function PricingScreen() {
  const { isDark } = useTheme();
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const money = (usd: number) => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(currency === 'INR' ? usd * 95.11 : usd);

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-3" showsVerticalScrollIndicator={false}>
      <Eyebrow>Made for the way you work</Eyebrow>
      <View className="mt-5"><BrandWordmark size={47} /></View>
      <Heading className="mt-5 text-[31px] leading-[39px]">Your team.{'\n'}Your possibilities.</Heading>
      <Copy className="mt-3">One specialist or a whole AI workforce. Your Personal Assistant is included with every plan.</Copy>

      <View className="mt-6 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="font-semibold text-[14px] text-white">Monthly plans</Text>
          <Text className="mt-1 font-sans text-[12px] text-muted">Launch preview</Text>
        </View>
        <View accessibilityLabel="Display currency" className="flex-row rounded-2xl border border-line bg-panel p-1">
          {(['USD', 'INR'] as const).map((item) => (
            <Pressable key={item} accessibilityRole="button" accessibilityLabel={'Show prices in ' + item} accessibilityState={{ selected: currency === item }} onPress={() => setCurrency(item)} className={'min-h-11 min-w-14 items-center justify-center rounded-xl px-3 ' + (currency === item ? 'bg-lilac' : '')}>
              <Text className={'font-semibold text-[13px] ' + (currency === item ? 'text-ink' : 'text-muted')}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Card className="mt-5 p-5">
        <View className="flex-row items-center">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-lilac/10"><Ionicons name="sparkles-outline" size={23} color={colors.lilac} /></View>
          <View className="ml-3 flex-1"><Text className="font-semibold text-[17px] text-white">One perfect fit</Text><Text className="mt-1 font-sans text-[13px] text-muted">A single AI specialist</Text></View>
        </View>
        <View className="mt-5 flex-row flex-wrap items-baseline gap-x-2">
          <Text className="font-display text-[36px] tracking-[-1px] text-white">{money(19)}</Text>
          <Text className="font-sans text-[13px] text-muted">/ specialist / month</Text>
        </View>
        <Copy className="mt-2">Start with one specialist for your small business, plus your Personal Assistant.</Copy>
        <View className="my-5 h-px bg-line" />
        <Perk text="One selected specialist" />
        <Perk text="Personal Assistant included" />
        <Perk text="Tailored corporate pricing available" />
      </Card>

      <SectionTitle title="Build your AI team" />
      <Copy className="mb-5">A little more support, at every stage.</Copy>
      {plans.map((plan) => (
        <View key={plan.name} className={'mb-4 overflow-hidden rounded-[26px] border ' + (plan.popular ? 'border-lilac/40' : 'border-line')}>
        <LinearGradient
          colors={isDark ? (plan.popular ? ['#2b223c', '#19151f'] : ['#17141e', '#14131c']) : (plan.popular ? ['#F0EAFB', '#E8E1F3'] : ['#FFFFFF', '#F6F3FA'])}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 24 }}
        >
          <View className="flex-row items-center justify-between">
            <View className="h-11 w-11 items-center justify-center rounded-2xl border border-lilac/15 bg-lilac/10"><Ionicons name={plan.icon} size={23} color={colors.lilac} /></View>
            {plan.popular ? <View className="rounded-full border border-lilac/20 bg-lilac/10 px-3 py-1.5"><Text className="font-semibold text-[11px] text-lilac">Most popular</Text></View> : null}
          </View>
          <Text style={{ marginTop: 17, fontFamily: fonts.brand, fontSize: 43, lineHeight: 52, color: isDark ? '#F5F3FF' : colors.text }}>{plan.name}</Text>
          <Text className="mt-1 font-medium text-[14px] text-lilac">{plan.tagline}</Text>
          <View className="mt-5 flex-row flex-wrap items-baseline gap-x-2">
            <Text className="font-display text-[36px] tracking-[-1px] text-white">{money(plan.price)}</Text>
            <Text className="font-sans text-[13px] text-muted">/ month</Text>
          </View>
          <Text className="mt-3 font-semibold text-[16px] text-white">{plan.count}</Text>
          <Copy className="mt-2">{plan.description}</Copy>
          <View className="my-5 h-px bg-line" />
          {plan.features.map((feature) => <Perk key={feature} text={feature} />)}
          <View className="mt-5 rounded-2xl bg-canvas/70 px-4 py-3"><Text className="font-sans text-[12px] leading-[19px] text-muted">{plan.info}</Text></View>
        </LinearGradient>
        </View>
      ))}

      <View className="mt-1 flex-row items-start rounded-[22px] border border-lilac/15 bg-lilac/5 p-5">
        <Ionicons name="information-circle-outline" size={22} color={colors.lilac} />
        <View className="ml-3 flex-1">
          <Text className="font-semibold text-[14px] text-lilac-bright">A preview of what's ahead</Text>
          <Text className="mt-2 font-sans text-[13px] leading-[21px] text-muted">Specialist selection and checkout are coming soon. For now, your workspace administrator manages access.</Text>
        </View>
      </View>
      <Text className="mt-5 px-1 font-sans text-[12px] leading-[20px] text-muted">Finance Analyst is available now. HR Executive and Sales Analyst are coming soon. INR prices are approximate conversions at ₹95.11 per USD; local billing may vary.</Text>
    </ScrollView>
  );
}

function Perk({ text }: { text: string }) {
  return (
    <View className="mb-3 flex-row items-start">
      <Ionicons name="checkmark-circle-outline" size={18} color={colors.lilac} style={{ marginTop: 1 }} />
      <Text className="ml-3 flex-1 font-sans text-[14px] leading-[21px] text-body">{text}</Text>
    </View>
  );
}
