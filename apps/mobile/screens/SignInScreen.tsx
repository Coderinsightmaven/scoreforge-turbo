import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import { getDisplayMessage } from "../utils/errors";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type LoginType = "regular" | "scorer";

interface TempScorerSession {
  token: string;
  scorerId: string;
  tournamentId: string;
  displayName: string;
  tournamentName: string;
  sport: string;
  expiresAt: number;
}

interface SignInScreenProps {
  onTempScorerLogin?: (session: TempScorerSession) => void;
}

export function SignInScreen({ onTempScorerLogin }: SignInScreenProps) {
  const { signIn } = useAuthActions();
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

  // Mutation for temp scorer sign in
  const signInTempScorer = useMutation(api.temporaryScorers.signIn);

  // Query tournament info by code (for preview)
  const tournamentInfo = useQuery(
    api.temporaryScorers.getTournamentByCode,
    tournamentCode.length === 6 ? { code: tournamentCode } : "skip"
  );

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

      // Call the parent callback with the session info
      if (onTempScorerLogin) {
        onTempScorerLogin({
          token: result.token,
          scorerId: result.scorerId,
          tournamentId: result.tournamentId,
          displayName: result.displayName,
          tournamentName: result.tournamentName,
          sport: result.sport,
          expiresAt: result.expiresAt,
        });
      }
    } catch (err) {
      setError(getDisplayMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-editorial-page">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1">
          <ScrollView
            contentContainerClassName="flex-grow justify-center px-6 py-8"
            keyboardShouldPersistTaps="always">
            {/* Logo & Branding */}
            <View className="mb-8 items-center">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-xl bg-brand shadow-lg">
                <Text className="font-display-bold text-3xl text-white">S</Text>
              </View>
              <Text className="font-sans text-sm text-gray-500">
                Tournament Scoring Made Simple
              </Text>
            </View>

            {/* Login Type Tabs */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#f3f4f6",
                borderRadius: 12,
                padding: 4,
                marginBottom: 24,
              }}>
              <Pressable
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: loginType === "regular" ? "#ffffff" : "transparent",
                }}
                onPress={() => {
                  setLoginType("regular");
                  setError(null);
                }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: loginType === "regular" ? "#111827" : "#6b7280",
                  }}>
                  Account Login
                </Text>
              </Pressable>
              <Pressable
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: loginType === "scorer" ? "#ffffff" : "transparent",
                }}
                onPress={() => {
                  setLoginType("scorer");
                  setError(null);
                }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: loginType === "scorer" ? "#111827" : "#6b7280",
                  }}>
                  Scorer Login
                </Text>
              </Pressable>
            </View>

            {/* Login Card */}
            <View className="rounded-xl bg-white p-6 shadow-xl">
              {loginType === "regular" ? (
                <>
                  <Text className="mb-1 text-center font-display-bold text-xl text-gray-900">
                    Welcome Back
                  </Text>
                  <Text className="mb-6 text-center font-sans text-sm text-gray-500">
                    Sign in with your account
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
                        loading ? "bg-brand" : "bg-brand"
                      }`}
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
                  <Text className="mb-1 text-center font-display-bold text-xl text-gray-900">
                    Scorer Login
                  </Text>
                  <Text className="mb-6 text-center font-sans text-sm text-gray-500">
                    Sign in with your tournament credentials
                  </Text>

                  <View className="space-y-4">
                    <View>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Tournament Code
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3.5 text-center text-lg font-bold tracking-widest text-gray-900"
                        placeholder="ABC123"
                        placeholderTextColor="#9ca3af"
                        value={tournamentCode}
                        onChangeText={(text) => setTournamentCode(text.toUpperCase().slice(0, 6))}
                        autoCapitalize="characters"
                        maxLength={6}
                      />
                      {tournamentInfo && (
                        <View className="mt-2 rounded-lg bg-brand-light p-2">
                          <Text className="text-center text-sm text-brand-text">
                            {tournamentInfo.name}
                          </Text>
                        </View>
                      )}
                      {tournamentCode.length === 6 && tournamentInfo === null && (
                        <View className="mt-2 rounded-lg bg-red-50 p-2">
                          <Text className="text-center text-sm text-red-600">
                            Tournament not found
                          </Text>
                        </View>
                      )}
                    </View>

                    <View>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Username
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3.5 text-base text-gray-900"
                        placeholder="Your username"
                        placeholderTextColor="#9ca3af"
                        value={username}
                        onChangeText={(text) => setUsername(text.toLowerCase())}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        PIN
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3.5 text-center text-lg font-bold tracking-widest text-gray-900"
                        placeholder="1234"
                        placeholderTextColor="#9ca3af"
                        value={pin}
                        onChangeText={(text) => setPin(text.replace(/[^0-9]/g, "").slice(0, 6))}
                        keyboardType="number-pad"
                        maxLength={6}
                        secureTextEntry
                      />
                    </View>

                    {error && (
                      <View className="rounded-xl bg-red-50 p-4">
                        <Text className="text-center text-sm text-red-600">{error}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      className={`mt-2 w-full items-center rounded-xl py-4 ${
                        loading ? "bg-brand" : "bg-brand"
                      }`}
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
              <Text className="text-center font-sans text-xs text-gray-500">
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
