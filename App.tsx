import React, { useState } from 'react';
import './global.css';
import { ActivityIndicator, Pressable, StatusBar, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NavigationProvider } from './src/context/NavigationContext';
import { colors, type AppScreen, type MainTab } from './src/config';
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

function AppContent() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<AppScreen>('home');
  const [lastTab, setLastTab] = useState<MainTab>('home');
  const navigate = (target: AppScreen) => {
    if (['home', 'finance', 'chat', 'assistant', 'profile'].includes(target)) setLastTab(target as MainTab);
    setScreen(target);
  };

  if (loading) return <View className="flex-1 items-center justify-center bg-ink"><ActivityIndicator color={colors.lilac} size="large" /><Text className="mt-3 text-xs text-muted">Preparing your workspace…</Text></View>;
  if (!user) return <AuthScreen />;

  const tabScreen = ['home', 'finance', 'chat', 'assistant', 'profile'].includes(screen);
  const title: Record<AppScreen, string> = {
    home: 'Your workspace', finance: 'Finance', chat: 'AI finance analyst', assistant: 'Personal assistant', profile: 'Your account',
    notifications: 'Notifications', pricing: 'Plans & pricing', admin: 'User AI access',
  };
  const screens = {
    home: <HomeScreen />, finance: <FinanceScreen />, chat: <ChatScreen />, assistant: <AssistantScreen />, profile: <ProfileScreen />,
    notifications: <NotificationsScreen />, pricing: <PricingScreen />, admin: <AdminUsersScreen />,
  };

  return <NavigationProvider value={navigate}>
    <SafeAreaView edges={['top']} className="flex-1 bg-ink">
      <StatusBar barStyle="light-content" backgroundColor={colors.ink} />
      <View className="h-[58px] flex-row items-center px-5">
        {!tabScreen ? <Pressable onPress={() => navigate(lastTab)} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-panel"><Ionicons name="arrow-back" size={20} color={colors.lilac} /></Pressable> : null}
        <View className="flex-1">
          <Text className="text-[9px] font-extrabold tracking-[2px] text-lilac">ZENGENAI</Text>
          <Text className="text-[16px] font-semibold text-white">{title[screen]}</Text>
        </View>
        {tabScreen ? <Pressable accessibilityLabel="Notifications" onPress={() => navigate('notifications')} className="h-10 w-10 items-center justify-center rounded-full bg-panel"><Ionicons name="notifications-outline" size={21} color={colors.lilac} /></Pressable> : null}
      </View>
      <View className="flex-1">{screens[screen]}</View>
      {tabScreen ? <TabBar active={screen as MainTab} onChange={navigate} /> : null}
    </SafeAreaView>
  </NavigationProvider>;
}

export default function App() {
  return <SafeAreaProvider><AuthProvider><AppContent /></AuthProvider></SafeAreaProvider>;
}
