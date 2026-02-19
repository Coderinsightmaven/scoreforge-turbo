import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import * as React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors, Fonts } from "@/constants/colors";

export default function Page() {
  const colors = useThemeColors();
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === "complete") {
        await setActive({
          session: signUpAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              console.log(session?.currentTask);
              return;
            }

            router.replace("/");
          },
        });
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  if (pendingVerification) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPage }]}>
        <Text style={[styles.title, { fontFamily: Fonts.displayBold, color: colors.textPrimary }]}>
          Verify your email
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          A verification code has been sent to your email.
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.bgCard,
              color: colors.textPrimary,
            },
          ]}
          value={code}
          placeholder="Enter your verification code"
          placeholderTextColor={colors.textLight}
          onChangeText={(c) => setCode(c)}
          keyboardType="numeric"
        />
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: Colors.brand.DEFAULT },
            pressed && styles.buttonPressed,
          ]}
          onPress={onVerifyPress}>
          <Text style={styles.buttonText}>Verify</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPage }]}>
      <Text style={[styles.title, { fontFamily: Fonts.displayBold, color: colors.textPrimary }]}>
        Sign up
      </Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Email address</Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: colors.bgCard,
            color: colors.textPrimary,
          },
        ]}
        autoCapitalize="none"
        value={emailAddress}
        placeholder="Enter email"
        placeholderTextColor={colors.textLight}
        onChangeText={(email) => setEmailAddress(email)}
        keyboardType="email-address"
      />
      <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: colors.bgCard,
            color: colors.textPrimary,
          },
        ]}
        value={password}
        placeholder="Enter password"
        placeholderTextColor={colors.textLight}
        secureTextEntry={true}
        onChangeText={(p) => setPassword(p)}
      />
      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: Colors.brand.DEFAULT },
          (!emailAddress || !password) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={onSignUpPress}
        disabled={!emailAddress || !password}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
      <View style={styles.linkContainer}>
        <Text style={{ color: colors.textPrimary }}>Have an account? </Text>
        <Link href="/sign-in">
          <Text style={{ color: Colors.brand.DEFAULT, fontWeight: "600" }}>Sign in</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    marginBottom: 8,
    fontSize: 28,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.8,
  },
  label: {
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  linkContainer: {
    flexDirection: "row",
    gap: 4,
    marginTop: 12,
    alignItems: "center",
  },
});
