import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Card, Copy, Eyebrow, Heading, SectionTitle } from '../../components/ui';

const plans = [
  { name: 'Spark', tagline: 'Your AI workforce begins here', price: 35, count: 'Any 2 AI employees', description: 'Best for individuals and first-time AI workforce users.', info: '1 user · 1 device · Medium usage limits', features: ['Choose any 2 specialist AI employees', 'Personal AI Assistant included'] },
  { name: 'Nexus', tagline: 'Your connected AI team', price: 65, count: 'Any 4 AI employees', description: 'Best for growing businesses that need multiple specialists.', info: '2 users · 2 devices · Medium usage limits', features: ['Choose any 4 specialist AI employees', 'Personal AI Assistant included'], popular: true },
  { name: 'Infinity', tagline: 'Your AI workforce, expanded', price: 250, count: 'Choose any 6 AI employees', description: 'For businesses ready to build a broader AI-powered operation.', info: '3 users · 3 devices · High usage limits', features: ['Choose any 6 specialist AI employees', 'Personal AI Assistant included', 'Early access trials for upcoming specialists'] },
];

export function PricingScreen() {
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const money = (usd: number) => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: currency === 'INR' ? 0 : 2 }).format(currency === 'INR' ? usd * 95.11 : usd);
  return <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-2" showsVerticalScrollIndicator={false}>
    <Eyebrow>Single specialist or full AI team</Eyebrow><Heading className="mt-2">Choose how to build your AI workforce.</Heading><Copy className="mt-2">Your Personal AI Assistant is included with every ZengenAI plan.</Copy>
    <View className="mt-5 flex-row items-center justify-between"><Text className="text-[12px] text-muted">Display currency</Text><View className="flex-row rounded-xl border border-line bg-panel p-1">{(['USD', 'INR'] as const).map((item) => <Pressable key={item} onPress={() => setCurrency(item)} className={`rounded-lg px-3 py-2 ${currency === item ? 'bg-raised' : ''}`}><Text className={`text-[11px] font-semibold ${currency === item ? 'text-lilac-bright' : 'text-muted'}`}>{item}</Text></Pressable>)}</View></View>

    <Card className="mt-5 p-4"><Eyebrow>Buy a single AI employee</Eyebrow><SectionTitle title="One specialist. One subscription." /><Copy className="text-[11px]">For a small business: choose one specialist AI, with your Personal Assistant included. Corporate pricing is tailored to your requirements.</Copy><View className="mt-3 flex-row items-end"><Text className="text-[27px] font-bold text-white">{money(19)}</Text><Text className="mb-1 ml-1 text-[10px] text-muted">/ AI / month</Text></View><Perk text="One selected specialist" /><Perk text="Personal Assistant included" /><Perk text="Corporate pricing available" /></Card>

    <SectionTitle title="Zengen AI workforce plans" /><Copy className="mb-3 text-[11px]">Separate multi-specialist packages. Each plan includes the number of specialists listed below.</Copy>
    {plans.map((plan) => <Card key={plan.name} className={`mb-3 p-4 ${plan.popular ? 'border-lilac/50 bg-raised' : ''}`}><View className="flex-row items-start justify-between"><View className="flex-1"><Eyebrow>ZENGEN AI WORKFORCE</Eyebrow><Text className="mt-2 text-[23px] font-bold text-white">{plan.name}</Text><Text className="mt-1 text-[11px] text-lilac-bright">{plan.tagline}</Text></View>{plan.popular ? <Text className="rounded-full bg-lilac/15 px-2.5 py-1 text-[9px] font-bold tracking-wider text-lilac-bright">POPULAR</Text> : null}</View><View className="mt-4 flex-row items-end"><Text className="text-[27px] font-bold text-white">{money(plan.price)}</Text><Text className="mb-1 ml-1 text-[10px] text-muted">/ package / month</Text></View><Text className="mt-3 text-[13px] font-semibold text-white">{plan.count}</Text><Copy className="mt-1 text-[11px]">{plan.description}</Copy><View className="my-3 h-px bg-line" />{plan.features.map((feature) => <Perk key={feature} text={feature} />)}<Copy className="mt-3 text-[10px]">{plan.info}</Copy><Text className="mt-3 text-[10px] font-medium text-lilac-bright">Plan preview · Specialist selection and checkout are coming soon.</Text></Card>)}

    <Copy className="text-[10px]">Finance Analyst is available now. HR Executive and Sales Analyst are coming soon. INR prices are approximate conversions at ₹95.11 per USD. Purchase verification and checkout are not implemented; specialist access is managed by an administrator.</Copy>
  </ScrollView>;
}

function Perk({ text }: { text: string }) { return <View className="mt-2 flex-row items-start"><Text className="mr-2 text-[13px] text-mint">✓</Text><Text className="flex-1 text-[11px] leading-[17px] text-white">{text}</Text></View>; }
