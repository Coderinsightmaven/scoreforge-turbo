import { useSignIn } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import { useRouter } from "expo-router";
import { getDisplayMessage } from "../../utils/errors";
import { formatTournamentName } from "../../utils/format";
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
  const { signIn: clerkSignIn, setActive, isLoaded } = useSignIn();
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
      if (!isLoaded) return;
      const result = await clerkSignIn.create({
        identifier: email,
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errors" in err) {
        const clerkErr = err as { errors: Array<{ message: string }> };
        setError(clerkErr.errors[0]?.message ?? "Sign in failed");
      } else {
        setError("Something went wrong. Please try again.");
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
    <View className="flex-1 bg-bg-page dark:bg-bg-page-dark">
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
              <Text className="font-sans text-sm text-text-tertiary dark:text-text-tertiary-dark">
                Tournament Scoring Made Simple
              </Text>
            </View>

            {/* Login Mode Selector */}
            <View className="mb-6 rounded-xl border border-border bg-bg-card p-3 dark:border-border-dark dark:bg-bg-card-dark">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-text-tertiary-dark">
                Sign-In Mode
              </Text>
              <View className="gap-2">
                <TouchableOpacity
                  className={`rounded-lg border px-4 py-3 ${
                    loginType === "regular"
                      ? "border-brand/50 bg-brand/10"
                      : "border-border bg-bg-secondary dark:border-border-dark dark:bg-bg-secondary-dark"
                  }`}
                  onPress={() => {
                    setLoginType("regular");
                    setError(null);
                  }}
                  activeOpacity={0.8}>
                  <Text
                    className={`text-sm font-semibold ${
                      loginType === "regular"
                        ? "text-brand"
                        : "text-text-primary dark:text-text-primary-dark"
                    }`}>
                    Account Login
                  </Text>
                  <Text
                    className={`mt-1 text-xs ${
                      loginType === "regular"
                        ? "text-brand/80"
                        : "text-text-tertiary dark:text-text-tertiary-dark"
                    }`}>
                    For owners, admins, and regular staff.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`rounded-lg border px-4 py-3 ${
                    loginType === "scorer"
                      ? "border-brand/50 bg-brand/10"
                      : "border-border bg-bg-secondary dark:border-border-dark dark:bg-bg-secondary-dark"
                  }`}
                  onPress={() => {
                    setLoginType("scorer");
                    setError(null);
                  }}
                  activeOpacity={0.8}>
                  <Text
                    className={`text-sm font-semibold ${
                      loginType === "scorer"
                        ? "text-brand"
                        : "text-text-primary dark:text-text-primary-dark"
                    }`}>
                    Scorer Login
                  </Text>
                  <Text
                    className={`mt-1 text-xs ${
                      loginType === "scorer"
                        ? "text-brand/80"
                        : "text-text-tertiary dark:text-text-tertiary-dark"
                    }`}>
                    For temporary tournament scorers using code and PIN.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Card */}
            <View className="rounded-2xl bg-bg-card p-8 shadow-2xl shadow-black/10 dark:bg-bg-card-dark">
              {loginType === "regular" ? (
                <>
                  <Text className="mb-1 text-center font-display-bold text-xl text-text-primary dark:text-text-primary-dark">
                    Welcome Back
                  </Text>
                  <Text className="mb-6 text-center font-sans text-sm text-text-tertiary dark:text-text-tertiary-dark">
                    Sign in with your account
                  </Text>

                  <View className="space-y-4">
                    <View>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-text-tertiary-dark">
                        Email Address
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-border bg-bg-secondary px-5 py-4 text-base text-text-primary dark:border-border-dark dark:bg-bg-secondary-dark dark:text-text-primary-dark"
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
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-text-tertiary-dark">
                        Password
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-border bg-bg-secondary px-5 py-4 text-base text-text-primary dark:border-border-dark dark:bg-bg-secondary-dark dark:text-text-primary-dark"
                        placeholder="Enter your password"
                        placeholderTextColor="#94A3B8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoComplete="password"
                      />
                    </View>

                    {error && (
                      <View className="rounded-xl border border-error/30 bg-error/10 p-4">
                        <Text className="text-center text-sm text-error">{error}</Text>
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
                  <Text className="mb-1 text-center font-display-bold text-xl text-text-primary dark:text-text-primary-dark">
                    Scorer Login
                  </Text>
                  <Text className="mb-6 text-center font-sans text-sm text-text-tertiary dark:text-text-tertiary-dark">
                    Sign in with your tournament credentials
                  </Text>

                  <View className="space-y-4">
                    <View>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-text-tertiary-dark">
                        Tournament Code
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-border bg-bg-secondary px-5 py-4 text-center text-lg font-bold tracking-widest text-text-primary dark:border-border-dark dark:bg-bg-secondary-dark dark:text-text-primary-dark"
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
                            {formatTournamentName(tournamentInfo.name)}
                          </Text>
                        </View>
                      )}
                      {tournamentCode.length === 6 && tournamentInfo === null && (
                        <View className="mt-2 rounded-lg border border-error/30 bg-error/10 p-2">
                          <Text className="text-center text-sm text-error">
                            Tournament not found
                          </Text>
                        </View>
                      )}
                    </View>

                    <View>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-text-tertiary-dark">
                        Username
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-border bg-bg-secondary px-5 py-4 text-base text-text-primary dark:border-border-dark dark:bg-bg-secondary-dark dark:text-text-primary-dark"
                        placeholder="Your username"
                        placeholderTextColor="#94A3B8"
                        value={username}
                        onChangeText={(text) => setUsername(text.toLowerCase())}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-text-tertiary-dark">
                        PIN
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-border bg-bg-secondary px-5 py-4 text-center text-lg font-bold tracking-widest text-text-primary dark:border-border-dark dark:bg-bg-secondary-dark dark:text-text-primary-dark"
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
                      <View className="rounded-xl border border-error/30 bg-error/10 p-4">
                        <Text className="text-center text-sm text-error">{error}</Text>
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
              <Text className="text-center font-sans text-xs text-text-tertiary dark:text-text-tertiary-dark">
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
