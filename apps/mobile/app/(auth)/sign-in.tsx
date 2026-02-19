import { useSignIn, useSSO } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { getDisplayMessage } from "@/utils/errors";
import { formatTournamentName } from "@/utils/format";
import { useTempScorer } from "@/contexts/TempScorerContext";
import { QRScannerModal } from "@/components/QRScannerModal";
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
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors, Fonts } from "@/constants/colors";

WebBrowser.maybeCompleteAuthSession();

type LoginType = "regular" | "scorer";

export default function SignInScreen() {
  const { signIn: clerkSignIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const { setSession } = useTempScorer();
  const router = useRouter();
  const colors = useThemeColors();
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

  const brandColor = colors.isDark ? colors.brand.dark : colors.brand.DEFAULT;

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      <SafeAreaView style={styles.flex1}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex1}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always">
            {/* Logo & Branding */}
            <View style={styles.logoContainer}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.welcomeTitle,
                  { color: colors.textTertiary, fontFamily: Fonts.displaySemibold },
                ]}>
                Welcome to ScoreForge
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: colors.textTertiary }]}>
                Tournament Scoring Made Simple
              </Text>
            </View>

            {/* Login Mode Toggle */}
            <View
              style={[
                styles.toggleContainer,
                { borderColor: colors.border, backgroundColor: colors.bgCard },
              ]}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  loginType === "regular" && { backgroundColor: brandColor },
                ]}
                onPress={() => {
                  setLoginType("regular");
                  setError(null);
                }}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: loginType === "regular" ? "#FFFFFF" : colors.textTertiary,
                    },
                  ]}>
                  Account
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  loginType === "scorer" && { backgroundColor: brandColor },
                ]}
                onPress={() => {
                  setLoginType("scorer");
                  setError(null);
                }}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: loginType === "scorer" ? "#FFFFFF" : colors.textTertiary,
                    },
                  ]}>
                  Scorer
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Card */}
            <View style={[styles.card, { backgroundColor: colors.bgCard }]}>
              {loginType === "regular" ? (
                <>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: colors.textPrimary, fontFamily: Fonts.displayBold },
                    ]}>
                    Welcome Back
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textTertiary }]}>
                    Sign in with your account
                  </Text>

                  <View style={styles.gap12}>
                    <TouchableOpacity
                      style={[
                        styles.oauthButton,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.bgSecondary,
                        },
                      ]}
                      onPress={handleOAuthSignIn}
                      disabled={loading}
                      activeOpacity={0.8}>
                      <Text style={[styles.oauthButtonText, { color: colors.textPrimary }]}>G</Text>
                      <Text style={[styles.oauthButtonText, { color: colors.textPrimary }]}>
                        Continue with Google
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dividerRow}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.dividerText, { color: colors.textTertiary }]}>
                      or continue with email
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  </View>

                  <View style={styles.gap16}>
                    <View>
                      <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                        Email Address
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.bgSecondary,
                            color: colors.textPrimary,
                          },
                        ]}
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
                      <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                        Password
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.bgSecondary,
                            color: colors.textPrimary,
                          },
                        ]}
                        placeholder="Enter your password"
                        placeholderTextColor="#94A3B8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoComplete="password"
                      />
                    </View>

                    {error && (
                      <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: brandColor }]}
                      onPress={handleRegularSubmit}
                      disabled={loading}
                      activeOpacity={0.8}>
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={styles.submitButtonText}>Sign In</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: colors.textPrimary, fontFamily: Fonts.displayBold },
                    ]}>
                    Scorer Login
                  </Text>
                  <Text style={[styles.scorerSubtitle, { color: colors.textTertiary }]}>
                    Sign in with your tournament credentials
                  </Text>

                  {/* Scan QR Code Button */}
                  <TouchableOpacity
                    style={styles.qrButton}
                    onPress={() => setShowScanner(true)}
                    activeOpacity={0.8}>
                    <Text style={[styles.qrButtonText, { color: brandColor }]}>Scan QR Code</Text>
                  </TouchableOpacity>

                  <View style={styles.scorerDividerRow}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.dividerText, { color: colors.textTertiary }]}>
                      or enter manually
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  </View>

                  <View style={styles.gap16}>
                    <View>
                      <Text
                        style={[
                          styles.fieldLabel,
                          styles.textCenter,
                          { color: colors.textTertiary },
                        ]}>
                        Tournament Code
                      </Text>
                      <TextInput
                        style={[
                          styles.inputCentered,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.bgSecondary,
                            color: colors.textPrimary,
                          },
                        ]}
                        placeholder="ABC123"
                        placeholderTextColor="#94A3B8"
                        value={tournamentCode}
                        onChangeText={(text) => handleCodeChange(text.toUpperCase().slice(0, 6))}
                        autoCapitalize="characters"
                        maxLength={6}
                      />
                      {tournamentInfo && (
                        <View
                          style={[
                            styles.tournamentInfoBox,
                            {
                              borderColor: "rgba(39,165,94,0.3)",
                              backgroundColor: Colors.status.active.bg,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.tournamentInfoText,
                              { color: Colors.status.active.text },
                            ]}>
                            {formatTournamentName(tournamentInfo.name)}
                          </Text>
                        </View>
                      )}
                      {tournamentCode.length === 6 && tournamentInfo === null && (
                        <View style={styles.tournamentNotFoundBox}>
                          <Text style={styles.tournamentNotFoundText}>Tournament not found</Text>
                        </View>
                      )}
                    </View>

                    <View>
                      <Text
                        style={[
                          styles.fieldLabel,
                          styles.textCenter,
                          { color: colors.textTertiary },
                        ]}>
                        Username
                      </Text>
                      <TextInput
                        style={[
                          styles.inputCenteredBase,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.bgSecondary,
                            color: colors.textPrimary,
                          },
                        ]}
                        placeholder="Your username"
                        placeholderTextColor="#94A3B8"
                        value={username}
                        onChangeText={(text) => setUsername(text.toLowerCase())}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View>
                      <Text
                        style={[
                          styles.fieldLabel,
                          styles.textCenter,
                          { color: colors.textTertiary },
                        ]}>
                        Court PIN
                      </Text>
                      <TextInput
                        style={[
                          styles.inputCentered,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.bgSecondary,
                            color: colors.textPrimary,
                          },
                        ]}
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
                      <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: brandColor }]}
                      onPress={handleScorerSubmit}
                      disabled={loading}
                      activeOpacity={0.8}>
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={styles.submitButtonText}>Start Scoring</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textTertiary }]}>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoContainer: {
    marginBottom: 32,
    alignItems: "center",
  },
  logo: {
    marginBottom: 8,
    height: 112,
    width: 112,
  },
  welcomeTitle: {
    marginBottom: 4,
    fontSize: 24,
  },
  welcomeSubtitle: {
    fontSize: 14,
  },
  toggleContainer: {
    marginBottom: 24,
    flexDirection: "row",
    borderRadius: 9999,
    borderWidth: 1,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 9999,
    paddingVertical: 10,
  },
  toggleText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    borderRadius: 16,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 10,
  },
  cardTitle: {
    marginBottom: 4,
    textAlign: "center",
    fontSize: 20,
  },
  cardSubtitle: {
    marginBottom: 24,
    textAlign: "center",
    fontSize: 14,
  },
  scorerSubtitle: {
    marginBottom: 16,
    textAlign: "center",
    fontSize: 14,
  },
  gap12: {
    gap: 12,
  },
  gap16: {
    gap: 16,
  },
  oauthButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 16,
  },
  oauthButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  dividerRow: {
    marginVertical: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  scorerDividerRow: {
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  dividerLine: {
    height: 1,
    flex: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    textTransform: "uppercase",
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  textCenter: {
    textAlign: "center",
  },
  input: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
  },
  inputCentered: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 16,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 4,
  },
  inputCenteredBase: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 16,
    textAlign: "center",
    fontSize: 16,
  },
  tournamentInfoBox: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
  },
  tournamentInfoText: {
    textAlign: "center",
    fontSize: 14,
  },
  tournamentNotFoundBox: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(208,37,60,0.3)",
    backgroundColor: "rgba(208,37,60,0.1)",
    padding: 8,
  },
  tournamentNotFoundText: {
    textAlign: "center",
    fontSize: 14,
    color: Colors.semantic.error,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(208,37,60,0.3)",
    backgroundColor: "rgba(208,37,60,0.1)",
    padding: 16,
  },
  errorText: {
    textAlign: "center",
    fontSize: 14,
    color: Colors.semantic.error,
  },
  submitButton: {
    marginTop: 8,
    width: "100%",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 20,
    shadowColor: "#70AC15",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  qrButton: {
    marginBottom: 20,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(112,172,21,0.3)",
    backgroundColor: "rgba(112,172,21,0.1)",
    paddingVertical: 16,
  },
  qrButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
    fontSize: 12,
  },
});
