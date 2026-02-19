import { useSignIn, useSSO } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { getDisplayMessage } from "../../utils/errors";
import { formatTournamentName } from "../../utils/format";
import { useTempScorer } from "../../contexts/TempScorerContext";
import { QRScannerModal } from "../../components/QRScannerModal";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

type LoginType = "regular" | "scorer";

export default function SignInScreen() {
  const { signIn: clerkSignIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
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
  const [showScanner, setShowScanner] = useState(false);

  // Handle deep links from QR code scanning
  const url = Linking.useURL();

  const handleOAuthSignIn = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { createdSessionId, setActive: setOAuthActive } = await startSSOFlow({
        strategy: "oauth_google",
      });
      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
      }
    } catch (err) {
      const message = getDisplayMessage(err);
      if (message.includes("Missing external verification redirect URL")) {
        setError(
          "Google sign-in is not fully configured in Clerk for this app build. Check Native API and Google OAuth provider settings."
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [startSSOFlow]);

  const signInTempScorer = useMutation(api.temporaryScorers.signIn);
  const lookupTournamentByCode = useMutation(api.temporaryScorers.getTournamentByCode);

  const [tournamentInfo, setTournamentInfo] = useState<{
    _id: string;
    name: string;
    sport: string;
  } | null>(null);
  const handleCodeChange = useCallback(
    async (code: string) => {
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
    },
    [lookupTournamentByCode]
  );

  useEffect(() => {
    if (url) {
      const parsed = Linking.parse(url);
      // Handle: scoreforge://scorer?code=ABC123&court=court-1
      if (parsed.hostname === "scorer" || parsed.path === "scorer") {
        setLoginType("scorer");
        if (parsed.queryParams?.code) {
          const code = String(parsed.queryParams.code);
          handleCodeChange(code.toUpperCase().slice(0, 6));
        }
        if (parsed.queryParams?.court) {
          setUsername(String(parsed.queryParams.court).toLowerCase());
        }
        if (parsed.queryParams?.pin) {
          setPin(String(parsed.queryParams.pin).toUpperCase().slice(0, 6));
        }
      }
    }
  }, [url, handleCodeChange]);

  const handleRegularSubmit = async () => {
    if (!isLoaded) return;
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await clerkSignIn.create({
        identifier: email,
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else if (result.status === "needs_second_factor") {
        setError("Two-factor authentication is required but not yet supported.");
      } else if (result.status === "needs_new_password") {
        setError("A password reset is required. Please reset your password on the web app.");
      } else {
        setError("Unable to complete sign in. Please try again.");
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errors" in err) {
        const clerkErr = err as { errors: { message: string }[] };
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

    if (pin.length < 6) {
      setError("Court PIN must be 6 characters");
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
        assignedCourt: result.assignedCourt ?? undefined,
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
              <Image
                source={require("../../assets/logo.png")}
                className="mb-2 h-28 w-28"
                resizeMode="contain"
              />
              <Text className="mb-1 font-display-semibold text-2xl text-text-tertiary dark:text-text-tertiary-dark">
                Welcome to ScoreForge
              </Text>
              <Text className="font-sans text-sm text-text-tertiary dark:text-text-tertiary-dark">
                Tournament Scoring Made Simple
              </Text>
            </View>

            {/* Login Mode Toggle */}
            <View className="mb-6 flex-row rounded-full border border-border bg-bg-card p-1 dark:border-border-dark dark:bg-bg-card-dark">
              <TouchableOpacity
                className={`flex-1 rounded-full py-2.5 ${
                  loginType === "regular" ? "bg-brand" : ""
                }`}
                onPress={() => {
                  setLoginType("regular");
                  setError(null);
                }}
                activeOpacity={0.8}>
                <Text
                  className={`text-center text-sm font-semibold ${
                    loginType === "regular"
                      ? "text-white"
                      : "text-text-tertiary dark:text-text-tertiary-dark"
                  }`}>
                  Account
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-full py-2.5 ${loginType === "scorer" ? "bg-brand" : ""}`}
                onPress={() => {
                  setLoginType("scorer");
                  setError(null);
                }}
                activeOpacity={0.8}>
                <Text
                  className={`text-center text-sm font-semibold ${
                    loginType === "scorer"
                      ? "text-white"
                      : "text-text-tertiary dark:text-text-tertiary-dark"
                  }`}>
                  Scorer
                </Text>
              </TouchableOpacity>
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

                  <View className="gap-3">
                    <TouchableOpacity
                      className="w-full flex-row items-center justify-center gap-3 rounded-xl border-2 border-border bg-bg-secondary py-4 dark:border-border-dark dark:bg-bg-secondary-dark"
                      onPress={handleOAuthSignIn}
                      disabled={loading}
                      activeOpacity={0.8}>
                      <Text className="text-base font-semibold text-text-primary dark:text-text-primary-dark">
                        G
                      </Text>
                      <Text className="text-base font-semibold text-text-primary dark:text-text-primary-dark">
                        Continue with Google
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="my-5 flex-row items-center">
                    <View className="h-[1px] flex-1 bg-border dark:bg-border-dark" />
                    <Text className="mx-3 text-xs uppercase text-text-tertiary dark:text-text-tertiary-dark">
                      or continue with email
                    </Text>
                    <View className="h-[1px] flex-1 bg-border dark:bg-border-dark" />
                  </View>

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
                  <Text className="mb-4 text-center font-sans text-sm text-text-tertiary dark:text-text-tertiary-dark">
                    Sign in with your tournament credentials
                  </Text>

                  {/* Scan QR Code Button */}
                  <TouchableOpacity
                    className="mb-5 w-full flex-row items-center justify-center gap-2 rounded-xl border-2 border-brand/30 bg-brand/10 py-4"
                    onPress={() => setShowScanner(true)}
                    activeOpacity={0.8}>
                    <Text className="text-base font-bold text-brand">Scan QR Code</Text>
                  </TouchableOpacity>

                  <View className="mb-5 flex-row items-center">
                    <View className="h-[1px] flex-1 bg-border dark:bg-border-dark" />
                    <Text className="mx-3 text-xs uppercase text-text-tertiary dark:text-text-tertiary-dark">
                      or enter manually
                    </Text>
                    <View className="h-[1px] flex-1 bg-border dark:bg-border-dark" />
                  </View>

                  <View className="space-y-4">
                    <View>
                      <Text className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-text-tertiary-dark">
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
                      <Text className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-text-tertiary-dark">
                        Username
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-border bg-bg-secondary px-5 py-4 text-center text-base text-text-primary dark:border-border-dark dark:bg-bg-secondary-dark dark:text-text-primary-dark"
                        placeholder="Your username"
                        placeholderTextColor="#94A3B8"
                        value={username}
                        onChangeText={(text) => setUsername(text.toLowerCase())}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View>
                      <Text className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-text-tertiary dark:text-text-tertiary-dark">
                        Court PIN
                      </Text>
                      <TextInput
                        className="w-full rounded-xl border-2 border-border bg-bg-secondary px-5 py-4 text-center text-lg font-bold tracking-widest text-text-primary dark:border-border-dark dark:bg-bg-secondary-dark dark:text-text-primary-dark"
                        placeholder="ABC123"
                        placeholderTextColor="#94A3B8"
                        value={pin}
                        onChangeText={(text) =>
                          setPin(
                            text
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, "")
                              .slice(0, 6)
                          )
                        }
                        autoCapitalize="characters"
                        maxLength={6}
                        autoCorrect={false}
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

      <QRScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={({ code, court, pin: scannedPin }) => {
          setShowScanner(false);
          handleCodeChange(code.slice(0, 6));
          setUsername(court);
          if (scannedPin) {
            setPin(scannedPin.slice(0, 6));
          }
        }}
      />
    </View>
  );
}
