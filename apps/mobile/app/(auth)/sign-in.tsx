import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import { useRouter } from "expo-router";
import { getDisplayMessage } from "../../utils/errors";
import { useTempScorer } from "../../contexts/TempScorerContext";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type LoginType = "regular" | "scorer";

export default function SignInScreen() {
  const { signIn } = useAuthActions();
  const { setSession } = useTempScorer();
  const router = useRouter();
  const [loginType, setLoginType] = useState<LoginType>("regular");

  // Regular login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Scorer login state
  const [tournamentCode, setTournamentCode] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signInTempScorer = useMutation(api.temporaryScorers.signIn);
  const lookupTournamentByCode = useMutation(api.temporaryScorers.getTournamentByCode);

  const [tournamentInfo, setTournamentInfo] = useState<{
    _id: string;
    name: string;
    sport: string;
  } | null>(null);
  const handleCodeChange = async (code: string) => {
    setTournamentCode(code);
    if (code.length === 6) {
      try {
        const result = await lookupTournamentByCode({ code });
        setTournamentInfo(result);
      } catch {
        setTournamentInfo(null);
      }
    } else {
      setTournamentInfo(null);
    }
  };

  const handleRegularSubmit = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await signIn("password", { email, password, flow: "signIn" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (
        message.includes("InvalidSecret") ||
        message.toLowerCase().includes("invalid") ||
        message.toLowerCase().includes("incorrect") ||
        message.toLowerCase().includes("credentials") ||
        message.toLowerCase().includes("password")
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (
        message.includes("InvalidAccountId") ||
        message.toLowerCase().includes("not found") ||
        message.toLowerCase().includes("no user") ||
        message.toLowerCase().includes("does not exist")
      ) {
        setError("No account found with this email address.");
      } else if (
        message.toLowerCase().includes("too many") ||
        message.toLowerCase().includes("rate limit")
      ) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError("Unable to sign in. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScorerSubmit = async () => {
    if (!tournamentCode || !username || !pin) {
      setError("Please fill in all fields");
      return;
    }

    if (tournamentCode.length !== 6) {
      setError("Tournament code must be 6 characters");
      return;
    }

    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await signInTempScorer({
        code: tournamentCode,
        username: username,
        pin: pin,
      });

      if (!result) {
        setError("Invalid credentials. Please check your code, username, and PIN.");
        return;
      }

      await setSession({
        token: result.token,
        scorerId: result.scorerId,
        tournamentId: result.tournamentId,
        displayName: result.displayName,
        tournamentName: result.tournamentName,
        sport: result.sport,
        expiresAt: result.expiresAt,
      });

      router.replace("/(scorer)");
    } catch (err) {
      setError(getDisplayMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1">
          <ScrollView
            contentContainerClassName="flex-grow justify-center px-6 py-8"
            keyboardShouldPersistTaps="always">
            {/* Logo & Branding */}
            <View className="mb-8 items-center">
              <View className="mb-4 h-24 w-24 items-center justify-center rounded-3xl bg-brand shadow-2xl shadow-brand/30">
                <Text className="font-display-bold text-4xl text-white">S</Text>
              </View>
              <Text className="mb-1 font-display-semibold text-2xl text-text-primary">
                Welcome to ScoreForge
              </Text>
              <Text className="font-sans text-sm text-text-tertiary dark:text-slate-400">
                Tournament Scoring Made Simple
              </Text>
            </View>

            {/* Login Mode Selector */}
            <View className="mb-6 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-slate-400">
                Sign-In Mode
              </Text>
              <View className="gap-2">
                <TouchableOpacity
                  className={`rounded-lg border px-4 py-3 ${
                    loginType === "regular"
                      ? "border-slate-900 bg-slate-900"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                  onPress={() => {
                    setLoginType("regular");
                    setError(null);
                  }}
                  activeOpacity={0.8}>
                  <Text
                    className={`text-sm font-semibold ${
                      loginType === "regular" ? "text-white" : "text-slate-800 dark:text-slate-100"
                    }`}>
                    Account Login
                  </Text>
                  <Text
                    className={`mt-1 text-xs ${
                      loginType === "regular"
                        ? "text-slate-200"
                        : "text-text-tertiary dark:text-slate-400"
                    }`}>
                    For owners, admins, and regular staff.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`rounded-lg border px-4 py-3 ${
                    loginType === "scorer"
                      ? "border-slate-900 bg-slate-900"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                  onPress={() => {
                    setLoginType("scorer");
                    setError(null);
                  }}
                  activeOpacity={0.8}>
                  <Text
                    className={`text-sm font-semibold ${
                      loginType === "scorer" ? "text-white" : "text-slate-800 dark:text-slate-100"
                    }`}>
                    Scorer Login
                  </Text>
                  <Text
                    className={`mt-1 text-xs ${
                      loginType === "scorer"
                        ? "text-slate-200"
                        : "text-text-tertiary dark:text-slate-400"
                    }`}>
                    For temporary tournament scorers using code and PIN.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Card */}
            <View className="rounded-2xl bg-white p-8 shadow-2xl shadow-slate-900/10 dark:bg-slate-900">
              {loginType === "regular" ? (
                <>
                  <Text className="mb-1 text-center font-display-bold text-xl text-slate-900 dark:text-slate-100">
                    Welcome Back
                  </Text>
                  <Text className="mb-6 text-center font-sans text-sm text-text-tertiary dark:text-slate-400">
                    Sign in with your account
                  </Text>

                  <View className="space-y-4">
                    <View>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-slate-400">
                        Email Address
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="you@example.com"
                        placeholderTextColor="#94A3B8"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                      />
                    </View>

                    <View>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-slate-400">
                        Password
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="Enter your password"
                        placeholderTextColor="#94A3B8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoComplete="password"
                      />
                    </View>

                    {error && (
                      <View className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <Text className="text-center text-sm text-red-600">{error}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      className="mt-2 w-full items-center rounded-xl bg-brand py-5 shadow-lg shadow-brand/30"
                      onPress={handleRegularSubmit}
                      disabled={loading}
                      activeOpacity={0.8}>
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text className="text-base font-bold text-white">Sign In</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text className="mb-1 text-center font-display-bold text-xl text-slate-900 dark:text-slate-100">
                    Scorer Login
                  </Text>
                  <Text className="mb-6 text-center font-sans text-sm text-text-tertiary dark:text-slate-400">
                    Sign in with your tournament credentials
                  </Text>

                  <View className="space-y-4">
                    <View>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-slate-400">
                        Tournament Code
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-center text-lg font-bold tracking-widest text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="ABC123"
                        placeholderTextColor="#94A3B8"
                        value={tournamentCode}
                        onChangeText={(text) => handleCodeChange(text.toUpperCase().slice(0, 6))}
                        autoCapitalize="characters"
                        maxLength={6}
                      />
                      {tournamentInfo && (
                        <View className="mt-2 rounded-lg border border-status-active-border/30 bg-status-active-bg p-2">
                          <Text className="text-center text-sm text-status-active-text">
                            {tournamentInfo.name}
                          </Text>
                        </View>
                      )}
                      {tournamentCode.length === 6 && tournamentInfo === null && (
                        <View className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2">
                          <Text className="text-center text-sm text-red-600">
                            Tournament not found
                          </Text>
                        </View>
                      )}
                    </View>

                    <View>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-slate-400">
                        Username
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="Your username"
                        placeholderTextColor="#94A3B8"
                        value={username}
                        onChangeText={(text) => setUsername(text.toLowerCase())}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-slate-400">
                        PIN
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-center text-lg font-bold tracking-widest text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="1234"
                        placeholderTextColor="#94A3B8"
                        value={pin}
                        onChangeText={(text) => setPin(text.replace(/[^0-9]/g, "").slice(0, 6))}
                        keyboardType="number-pad"
                        maxLength={6}
                        secureTextEntry
                      />
                    </View>

                    {error && (
                      <View className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <Text className="text-center text-sm text-red-600">{error}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      className="mt-2 w-full items-center rounded-xl bg-brand py-5 shadow-lg shadow-brand/30"
                      onPress={handleScorerSubmit}
                      disabled={loading}
                      activeOpacity={0.8}>
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text className="text-base font-bold text-white">Start Scoring</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Footer */}
            <View className="mt-6 items-center">
              <Text className="text-center font-sans text-xs text-text-tertiary dark:text-slate-400">
                {loginType === "regular"
                  ? "Scorer access only. Contact your tournament organizer for credentials."
                  : "Get your code, username, and PIN from the tournament organizer."}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
