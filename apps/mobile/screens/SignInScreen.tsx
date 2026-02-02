import { useAuthActions } from '@convex-dev/auth/react';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

export function SignInScreen() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await signIn('password', { email, password, flow: 'signIn' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (
        message.includes('InvalidSecret') ||
        message.toLowerCase().includes('invalid') ||
        message.toLowerCase().includes('incorrect') ||
        message.toLowerCase().includes('credentials') ||
        message.toLowerCase().includes('password')
      ) {
        setError('Invalid email or password. Please try again.');
      } else if (
        message.includes('InvalidAccountId') ||
        message.toLowerCase().includes('not found') ||
        message.toLowerCase().includes('no user') ||
        message.toLowerCase().includes('does not exist')
      ) {
        setError('No account found with this email address.');
      } else if (
        message.toLowerCase().includes('too many') ||
        message.toLowerCase().includes('rate limit')
      ) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError('Unable to sign in. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#1f2937', '#111827', '#0f172a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <ScrollView
            contentContainerClassName="flex-grow justify-center px-6 py-8"
            keyboardShouldPersistTaps="handled">
            {/* Logo & Branding */}
            <View className="mb-12 items-center">
              <View className="mb-6 h-20 w-20 items-center justify-center rounded-2xl bg-amber-500 shadow-lg">
                <Text className="text-4xl font-bold text-white">S</Text>
              </View>
              <Text className="text-3xl font-bold text-white">ScoreForge</Text>
              <Text className="mt-2 text-base text-gray-400">Tournament Scoring Made Simple</Text>
            </View>

            {/* Features Pills */}
            <View className="mb-10 flex-row flex-wrap justify-center gap-2">
              <View className="rounded-full bg-white/10 px-4 py-2">
                <Text className="text-sm text-gray-300">Live Scoring</Text>
              </View>
              <View className="rounded-full bg-white/10 px-4 py-2">
                <Text className="text-sm text-gray-300">Real-time Updates</Text>
              </View>
              <View className="rounded-full bg-white/10 px-4 py-2">
                <Text className="text-sm text-gray-300">Multi-sport</Text>
              </View>
            </View>

            {/* Login Card */}
            <View className="rounded-3xl bg-white p-6 shadow-xl">
              <Text className="mb-1 text-center text-xl font-bold text-gray-900">Welcome Back</Text>
              <Text className="mb-6 text-center text-sm text-gray-500">
                Sign in to continue scoring
              </Text>

              <View className="space-y-4">
                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Email Address
                  </Text>
                  <TextInput
                    className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3.5 text-base text-gray-900"
                    placeholder="you@example.com"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Password
                  </Text>
                  <TextInput
                    className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3.5 text-base text-gray-900"
                    placeholder="Enter your password"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="password"
                  />
                </View>

                {error && (
                  <View className="rounded-xl bg-red-50 p-4">
                    <Text className="text-center text-sm text-red-600">{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  className={`mt-2 w-full items-center rounded-xl py-4 ${
                    loading ? 'bg-amber-400' : 'bg-amber-500'
                  }`}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.8}>
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-base font-bold text-white">Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View className="mt-8 items-center">
              <Text className="text-center text-xs text-gray-500">
                Scorer access only. Contact your tournament organizer for credentials.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
