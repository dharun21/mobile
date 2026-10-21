import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card, Copy, ErrorText, Eyebrow, Field, PrimaryButton } from '../../components/ui';
import { colors } from '../../config';
import { api, errorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  async function submit() {
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

  return <KeyboardAvoidingView className="flex-1 bg-ink" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerClassName="min-h-full justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
      <View className="mx-auto w-full max-w-[440px]">
        <LinearGradient colors={['#A989D9', '#584477']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="mb-8 h-16 w-16 items-center justify-center rounded-[22px]">
          <Ionicons name="sparkles" size={29} color="white" />
        </LinearGradient>
        <Eyebrow>YOUR ZENGENAI WORKSPACE</Eyebrow>
        <Text className="mt-3 text-[35px] font-bold leading-[39px] tracking-[-1px] text-white">{mode === 'login' ? 'Your AI team,\nready when you are.' : 'Create your\nZengenAI account.'}</Text>
        <Copy className="mt-3">{mode === 'login' ? 'Sign in to pick up right where you left off.' : 'A calmer, more capable way to work starts here.'}</Copy>
        <Card className="mt-8 gap-3 p-4">
          {mode === 'register' ? <Field autoCapitalize="words" placeholder="Full name" value={name} onChangeText={setName} returnKeyType="next" /> : null}
          <Field autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="Email address" value={email} onChangeText={setEmail} returnKeyType="next" />
          <View className="relative justify-center">
            <Field placeholder="Password" autoComplete={mode === 'register' ? 'new-password' : 'password'} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} onSubmitEditing={submit} returnKeyType="go" className="pr-14" />
            <Pressable onPress={() => setShowPassword((value) => !value)} className="absolute right-4 p-2"><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} /></Pressable>
          </View>
          <ErrorText>{error}</ErrorText>
          <PrimaryButton title={mode === 'login' ? 'Sign in' : 'Create account'} loading={busy} onPress={submit} className="mt-2" />
          {mode === 'login' ? <Pressable onPress={() => setResetOpen(true)} className="items-center py-2"><Text className="text-[13px] font-medium text-lilac-bright">Forgot password?</Text></Pressable> : null}
        </Card>
        <Pressable onPress={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }} className="mt-5 items-center py-2">
          <Text className="text-[13px] text-muted">{mode === 'login' ? 'New to ZengenAI?  ' : 'Already have an account?  '}<Text className="font-semibold text-lilac-bright">{mode === 'login' ? 'Create an account' : 'Sign in'}</Text></Text>
        </Pressable>
        <Text className="mt-8 text-center text-[11px] text-muted">Thoughtfully built for better work</Text>
      </View>
    </ScrollView>
    <ResetPasswordModal visible={resetOpen} email={email} onClose={() => setResetOpen(false)} onError={setError} />
  </KeyboardAvoidingView>;
}

function ResetPasswordModal({ visible, email, onClose, onError }: { visible: boolean; email: string; onClose: () => void; onError: (message: string) => void }) {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function sendCode() {
    if (!email.trim() || !email.includes('@')) return setMessage('Enter your email address on the sign in screen first.');
    setBusy(true); setMessage('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
      setMessage('If an account exists, a six digit code has been sent.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function reset() {
    if (code.trim().length !== 6) return setMessage('Enter the six digit code from your email.');
    if (newPassword.length < 12) return setMessage('Use at least 12 characters for the new password.');
    setBusy(true); setMessage('');
    try {
      await api.post('/auth/reset-password', { email: email.trim(), code: code.trim(), new_password: newPassword });
      setMessage('Password updated. You can sign in now.');
      onError('Password updated. Sign in with your new password.');
      setTimeout(onClose, 900);
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View className="flex-1 justify-end bg-black/60"><View className="rounded-t-[28px] border border-line bg-panel px-5 pb-10 pt-5">
      <View className="mb-5 flex-row items-center justify-between"><Text className="text-[19px] font-semibold text-white">Reset your password</Text><Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.muted} /></Pressable></View>
      <Copy>We’ll email a six digit code if the account exists.</Copy>
      {!sent ? <PrimaryButton title="Send reset code" loading={busy} onPress={sendCode} className="mt-5" /> : <View className="mt-4 gap-3"><Field keyboardType="number-pad" maxLength={6} placeholder="Six digit code" value={code} onChangeText={setCode} /><Field secureTextEntry placeholder="New password (12+ characters)" value={newPassword} onChangeText={setNewPassword} /><PrimaryButton title="Update password" loading={busy} onPress={reset} /></View>}
      {message ? <Text className="mt-4 text-[12px] leading-[18px] text-lilac-bright">{message}</Text> : null}
    </View></View>
  </Modal>;
}
