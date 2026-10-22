import React, { useEffect, useState } from 'react';
import './global.css';
import { ActivityIndicator, Pressable, StatusBar, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { GreatVibes_400Regular } from '@expo-google-fonts/great-vibes';
import { Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NavigationProvider } from './src/context/NavigationContext';
import { applyColorScheme, colors, fonts, type AppScreen, type MainTab, type PinnedSpecialist } from './src/config';
import { BrandWordmark } from './src/components/BrandWordmark';
import { KeyboardFrame, useKeyboardVisible } from './src/components/KeyboardLayout';
import { Reveal } from './src/components/Motion';
import { TabBar } from './src/components/TabBar';
import { AuthScreen } from './src/features/auth/AuthScreen';
import { HomeScreen } from './src/features/home/HomeScreen';
import { FinanceScreen } from './src/features/finance/FinanceScreen';
import { ChatScreen } from './src/features/chat/ChatScreen';
import { AssistantScreen } from './src/features/assistant/AssistantScreen';
import { ProfileScreen } from './src/features/profile/ProfileScreen';
import { NotificationsScreen } from './src/features/notifications/NotificationsScreen';
import { PricingScreen } from './src/features/pricing/PricingScreen';
import { AdminUsersScreen } from './src/features/access/AdminUsersScreen';
import { AITeamScreen } from './src/features/home/AITeamScreen';
import { sessionStorage } from './src/services/sessionStorage';

function AppContent() {
  const { user, loading } = useAuth();
  const { isDark, mode } = useTheme();
  applyColorScheme(mode);
  const keyboardVisible = useKeyboardVisible();
  const [screen, setScreen] = useState<AppScreen>('home');
  const [lastTab, setLastTab] = useState<MainTab>('home');
  const [pinnedSpecialist, setPinnedSpecialist] = useState<PinnedSpecialist | null>(null);
  const [pinLoadedFor, setPinLoadedFor] = useState<string | null>(null);
  // v2 discards earlier shortcut state; AI Chat now has its own fixed tab,
  // while a selected specialist uses a separate optional shortcut.
  const pinStorageKey = user ? `zengen.mobile.main-menu.v2.${user.id}` : null;

  useEffect(() => {
    setScreen('home');
    setLastTab('home');
  }, [user?.id]);

  useEffect(() => {
    if (!user || !pinStorageKey) return;
    let active = true;
    void sessionStorage.getItem(pinStorageKey).then((stored) => {
      if (!active) return;
      const isAllowed = stored === 'finance'
        ? user.specialists.includes('finance_analyst')
        : stored === 'assistant' && user.specialists.includes('personal_assistant');
      setPinnedSpecialist(stored !== 'none' && isAllowed ? stored as PinnedSpecialist : null);
      setPinLoadedFor(user.id);
    });
    return () => { active = false; };
  }, [pinStorageKey, user]);

  useEffect(() => {
    if (!user || !pinStorageKey || pinLoadedFor !== user.id) return;
    const stillAllowed = pinnedSpecialist === 'finance'
      ? user.specialists.includes('finance_analyst')
      : pinnedSpecialist === 'assistant' && user.specialists.includes('personal_assistant');
    if (pinnedSpecialist && !stillAllowed) {
      setPinnedSpecialist(null);
      return;
    }
    void (pinnedSpecialist
      ? sessionStorage.setItem(pinStorageKey, pinnedSpecialist)
      : sessionStorage.setItem(pinStorageKey, 'none'));
  }, [pinLoadedFor, pinStorageKey, pinnedSpecialist, user]);

  const navigate = (requestedTarget: AppScreen) => {
    const hasFinance = user?.specialists.includes('finance_analyst') ?? false;
    const hasAssistant = user?.specialists.includes('personal_assistant') ?? false;
    const target: AppScreen = requestedTarget === 'finance' && !hasFinance
      ? 'home'
      : requestedTarget === 'chat' && !user?.specialists.length
        ? 'home'
        : requestedTarget === 'assistant' && !hasAssistant ? 'home' : requestedTarget;
    if (['home', 'ais', 'finance', 'chat', 'assistant', 'profile'].includes(target)) setLastTab(target as MainTab);
    setScreen(target);
  };

  if (loading) return <View className="flex-1 items-center justify-center bg-canvas"><BrandWordmark size={56} /><ActivityIndicator color={colors.lilac} size="small" style={{ marginTop: 18 }} /><Text style={{ marginTop: 14, color: colors.muted, fontFamily: fonts.regular, fontSize: 14 }}>Making room for what matters...</Text></View>;
  if (!user) return <AuthScreen />;

  const tabScreen = ['home', 'ais', 'finance', 'chat', 'assistant', 'profile'].includes(screen);
  const title: Record<AppScreen, string> = {
    home: 'Your workspace', ais: 'Your AI team', finance: 'Finance', chat: 'AI finance analyst', assistant: 'Personal assistant', profile: 'Your account',
    notifications: 'Notifications', pricing: 'Plans & pricing', admin: 'User AI access',
  };
  const screens = {
    home: <HomeScreen />, ais: <AITeamScreen pinned={pinnedSpecialist} onPin={setPinnedSpecialist} />, finance: <FinanceScreen />, chat: <ChatScreen />, assistant: <AssistantScreen />, profile: <ProfileScreen />,
    notifications: <NotificationsScreen />, pricing: <PricingScreen />, admin: <AdminUsersScreen />,
  };

  return <NavigationProvider value={navigate}>
    <KeyboardFrame className="flex-1 bg-canvas">
      <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? colors.ink : '#F7F5FA'} />
        <View className="h-[72px] flex-row items-center border-b border-line/50 px-5">
          {!tabScreen ? <Pressable accessibilityRole="button" accessibilityLabel="Back to previous section" onPress={() => navigate(lastTab)} className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-panel active:bg-raised"><Ionicons name="arrow-back" size={20} color={colors.lilac} /></Pressable> : null}
          {tabScreen ? <BrandWordmark size={35} /> : <View className="flex-1"><Text className="font-semibold text-[10px] uppercase tracking-[1.8px] text-lilac">ZENGEN WORKSPACE</Text><Text accessibilityRole="header" className="mt-0.5 font-display text-[17px] text-white">{title[screen]}</Text></View>}
          {tabScreen ? <View className="flex-1" /> : null}
          {tabScreen ? <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => navigate('notifications')} className="h-11 w-11 items-center justify-center rounded-2xl bg-panel active:bg-raised"><Ionicons name="notifications-outline" size={21} color={colors.lilac} /></Pressable> : null}
        </View>
        <View className="min-h-0 flex-1"><Reveal key={screen} style={{ flex: 1 }}>{screens[screen]}</Reveal></View>
        {tabScreen && !keyboardVisible ? <TabBar active={screen === 'chat' ? 'chat' : screen === 'finance' || screen === 'assistant' ? (screen === pinnedSpecialist ? screen : 'ais') : screen as MainTab} pinned={pinnedSpecialist} specialists={user.specialists} onChange={navigate} /> : null}
      </SafeAreaView>
    </KeyboardFrame>
  </NavigationProvider>;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold,
    Manrope_600SemiBold, Manrope_700Bold, GreatVibes_400Regular,
  });
  if (!fontsLoaded && !fontError) return <SafeAreaProvider><View className="flex-1 items-center justify-center bg-canvas"><Text style={{ color: colors.text, fontFamily: 'serif', fontSize: 38, fontStyle: 'italic' }}>Zengen AI</Text><ActivityIndicator color={colors.lilac} style={{ marginTop: 16 }} /></View></SafeAreaProvider>;
  return <SafeAreaProvider><KeyboardProvider statusBarTranslucent navigationBarTranslucent><ThemeProvider><AuthProvider><AppContent /></AuthProvider></ThemeProvider></KeyboardProvider></SafeAreaProvider>;
}
