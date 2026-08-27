import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSignUp, useAuth } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");

  if (isSignedIn) {
    router.replace("/(tabs)" as never);
    return null;
  }

  const isLoading = fetchStatus === "fetching";
  const needsVerify =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) return;
    if (!error) await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          if (url.startsWith("http")) return;
          router.replace("/(tabs)" as never);
        },
      });
    }
  };

  const styles = makeStyles(colors);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (needsVerify) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: topPad + 24, paddingBottom: bottomPad + 24, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={[styles.logoBox, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="mail" size={30} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Check your email
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          We sent a 6-digit code to {email}
        </Text>

        <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium", marginTop: 24 }]}>
          Verification code
        </Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, fontFamily: "Inter_400Regular", letterSpacing: 6, textAlign: "center", fontSize: 22 }]}
          value={code}
          onChangeText={setCode}
          placeholder="000000"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
          maxLength={6}
          autoFocus
        />
        {errors?.fields?.code && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.fields.code.message}</Text>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: code.length === 6 ? colors.primary : colors.muted, marginTop: 24 }]}
          onPress={handleVerify}
          disabled={code.length < 4 || isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={[styles.primaryBtnText, { color: code.length === 6 ? "#FFF" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Verify & Create Account
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => signUp.verifications.sendEmailCode()} style={styles.linkRow}>
          <Text style={[styles.linkText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
            Resend code
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 24, paddingBottom: bottomPad + 24, paddingHorizontal: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Feather name="x" size={22} color={colors.mutedForeground} />
      </TouchableOpacity>

      <View style={[styles.logoBox, { backgroundColor: colors.primary + "18" }]}>
        <Feather name="radio" size={30} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
        Join PetSocial
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Create your account to join animal voice channels
      </Text>

      <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium", marginTop: 24 }]}>
        Email address
      </Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      {errors?.fields?.emailAddress && (
        <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.fields.emailAddress.message}</Text>
      )}

      <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
        Password
      </Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.passwordInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={!showPassword}
          autoComplete="new-password"
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
          <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
      {errors?.fields?.password && (
        <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.fields.password.message}</Text>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: email && password ? colors.primary : colors.muted, marginTop: 24 }]}
        onPress={handleSubmit}
        disabled={!email || !password || isLoading}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={[styles.primaryBtnText, { color: email && password ? "#FFF" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            Create Account
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.linkRow}>
        <Text style={[styles.linkLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Already have an account?{" "}
        </Text>
        <Link href="/sign-in" asChild>
          <TouchableOpacity>
            <Text style={[styles.linkText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Sign in</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Required by Clerk for bot protection */}
      <View nativeID="clerk-captcha" />
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    closeBtn: { alignSelf: "flex-end", padding: 4, marginBottom: 8 },
    logoBox: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    title: { fontSize: 26, letterSpacing: -0.5, marginBottom: 6 },
    subtitle: { fontSize: 15, lineHeight: 21, marginBottom: 4 },
    label: { fontSize: 14, marginBottom: 8, marginTop: 16 },
    input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, marginBottom: 4 },
    errorText: { fontSize: 13, marginBottom: 4 },
    passwordRow: { position: "relative" },
    passwordInput: { paddingRight: 48 },
    eyeBtn: { position: "absolute", right: 14, top: 13 },
    primaryBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginBottom: 16 },
    primaryBtnText: { fontSize: 17 },
    linkRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 4 },
    linkLabel: { fontSize: 14 },
    linkText: { fontSize: 14 },
  });
}
