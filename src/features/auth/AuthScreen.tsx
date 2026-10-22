import React, { useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheet } from '../../components/BottomSheet';
import { KeyboardScrollView } from '../../components/KeyboardLayout';
import { Reveal } from '../../components/Motion';
import { BrandWordmark } from '../../components/BrandWordmark';
import { Copy, ErrorText, Field, PrimaryButton } from '../../components/ui';
import { colors } from '../../config';
import { api, errorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export function AuthScreen() {
  const { login, register } = useAuth();
  const { isDark } = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  async function submit() {
    Keyboard.dismiss();
    setError('');
    if (!email.trim() || !email.includes('@')) return setError('Enter a valid email address.');
    if (mode === 'register' && !name.trim()) return setError('Enter your name.');
    if (password.length < (mode === 'register' ? 12 : 1)) return setError(mode === 'register' ? 'Use at least 12 characters for your password.' : 'Enter your password.');
    setBusy(true);
    try {
      if (mode === 'register') await register(name, email, password);
      else await login(email, password);
    } catch (requestError) { setError(errorMessage(requestError, 'We could not sign you in.')); }
    finally { setBusy(false); }
  }

  return <View className="flex-1 overflow-hidden bg-canvas">
    <View pointerEvents="none" className="absolute -right-36 -top-24 h-[340px] w-[340px] rounded-full bg-violet-400/[0.08]" />
    <View pointerEvents="none" className="absolute -bottom-40 -left-36 h-[370px] w-[370px] rounded-full bg-indigo-400/[0.06]" />
    <KeyboardScrollView className="flex-1" contentContainerClassName="min-h-full w-full items-center justify-center py-8">
      <View className="w-full max-w-[522px] px-6">
        <LinearGradient colors={isDark ? ['#211A30', '#13121D'] : ['#FFFFFF', '#F0EBF8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignItems: 'stretch', borderRadius: 34, borderColor: isDark ? '#C4B5FD26' : '#8066B52E', borderWidth: 1, paddingHorizontal: 28, paddingTop: 38, paddingBottom: 30, shadowColor: '#8B72BF', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.11, shadowRadius: 34, elevation: 12 }}>
          <Reveal style={{ alignItems: 'center' }}><View className="mb-8 items-center"><BrandWordmark size={59} /><View className="mt-3 flex-row items-center gap-2"><View className="h-1 w-1 rounded-full bg-lilac/70" /><Text className="font-medium text-[10px] uppercase tracking-[3px] text-lilac">WORKSPACE ACCESS</Text><View className="h-1 w-1 rounded-full bg-lilac/70" /></View></View></Reveal>
          <View className="mb-8 w-full">
            <Text accessibilityRole="header" className="font-display text-[34px] leading-[43px] tracking-[-1.5px] text-white">{mode === 'login' ? 'Good to have you back.' : 'Find your flow.'}</Text>
            <Copy className="mt-2">{mode === 'login' ? 'Your people, your progress, right where you left them.' : 'Create your Zengen AI workspace and bring your ideas to life.'}</Copy>
          </View>
          {mode === 'register' ? <Field label="Your name" autoCapitalize="words" autoComplete="name" textContentType="name" placeholder="What should we call you?" value={name} onChangeText={setName} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} icon="person-outline" className="mb-5 w-full" /> : null}
          <Field ref={emailRef} label="Email address" autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" placeholder="you@company.com" value={email} onChangeText={setEmail} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} icon="mail-outline" className="mb-5 w-full" />
          <Field ref={passwordRef} label="Password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} textContentType={mode === 'register' ? 'newPassword' : 'password'} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} returnKeyType="go" onSubmitEditing={() => void submit()} placeholder="Enter your password" icon="lock-closed-outline" trailingIcon={showPassword ? 'eye-off-outline' : 'eye-outline'} trailingIconLabel={showPassword ? 'Hide password' : 'Show password'} onTrailingIconPress={() => setShowPassword((value) => !value)} />
          {mode === 'login' ? <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setResetOpen(true); }} className="mt-3 min-h-11 self-end justify-center px-1"><Text className="font-semibold text-[13px] text-lilac">Forgot password?</Text></Pressable> : <Text className="mt-2 w-full font-sans text-[12px] leading-[18px] text-muted">Choose a password with at least 12 characters.</Text>}
          <ErrorText>{error}</ErrorText>
          <PrimaryButton title={mode === 'login' ? 'Sign in to your workspace' : 'Create your account'} loading={busy} disabled={busy} icon="arrow-forward" onPress={() => void submit()} className="mt-6 w-full" />
          <View className="my-6 w-full flex-row items-center gap-3"><View className="h-px flex-1 bg-line" /><Text className="font-sans text-[12px] text-muted">your workspace, your pace</Text><View className="h-px flex-1 bg-line" /></View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); Keyboard.dismiss(); }} className="min-h-12 w-full flex-row items-center justify-center rounded-2xl border border-line bg-white/[0.025] active:bg-white/[0.06]">
            <Text className="font-sans text-[14px] text-muted">{mode === 'login' ? 'New to Zengen AI? ' : 'Already have an account? '}</Text><Text className="font-semibold text-[14px] text-lilac-bright">{mode === 'login' ? 'Create an account' : 'Sign in'}</Text>
          </Pressable>
        </LinearGradient>
        <View className="mt-7 flex-row items-center justify-center gap-2 px-3"><Ionicons name="shield-checkmark-outline" size={16} color={colors.muted} /><Text className="flex-1 font-sans text-[12px] leading-[18px] text-muted">Your workspace stays yours. Sign in securely to pick up where you left off.</Text></View>
      </View>
    </KeyboardScrollView>
    <ResetPasswordSheet visible={resetOpen} email={email} onClose={() => setResetOpen(false)} onSuccess={() => setError('Password updated. Sign in with your new password.')} />
  </View>;
}

function ResetPasswordSheet({ visible, email, onClose, onSuccess }: { visible: boolean; email: string; onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const passwordRef = useRef<TextInput>(null);

  async function sendCode() {
    if (!email.trim() || !email.includes('@')) return setMessage('Enter your email address on the sign in screen first.');
    setBusy(true); setMessage('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
      setMessage('If an account exists, a six digit code has been sent.');
    } catch (requestError) { setMessage(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function reset() {
    if (code.trim().length !== 6) return setMessage('Enter the six digit code from your email.');
    if (newPassword.length < 12) return setMessage('Use at least 12 characters for the new password.');
    setBusy(true); setMessage('');
    try {
      await api.post('/auth/reset-password', { email: email.trim(), code: code.trim(), new_password: newPassword });
      setMessage('Password updated. You can sign in now.');
      onSuccess();
      setTimeout(onClose, 1200);
    } catch (requestError) { setMessage(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  return <BottomSheet visible={visible} onClose={onClose} title="Reset your password" subtitle="We’ll email a six digit code if the account exists.">
    {!sent ? <View className="pb-1"><Text className="font-sans text-[14px] leading-[22px] text-muted">We’ll send a secure code to the email address shown on sign in.</Text><PrimaryButton title="Send reset code" loading={busy} disabled={busy} onPress={() => void sendCode()} className="mt-5" icon="mail-outline" /></View> : <View className="gap-4 pb-1">
      <Field label="Six digit code" keyboardType="number-pad" maxLength={6} placeholder="000000" value={code} onChangeText={setCode} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
      <Field ref={passwordRef} label="New password" secureTextEntry placeholder="At least 12 characters" value={newPassword} onChangeText={setNewPassword} returnKeyType="go" onSubmitEditing={() => void reset()} />
      <PrimaryButton title="Update password" loading={busy} disabled={busy} onPress={() => void reset()} className="mt-1" icon="checkmark" />
    </View>}
    {message ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="mt-4 pb-1 font-sans text-[13px] leading-[20px] text-lilac-bright">{message}</Text> : null}
  </BottomSheet>;
}
