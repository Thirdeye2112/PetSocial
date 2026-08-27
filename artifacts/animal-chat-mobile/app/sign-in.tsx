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
import { useSignIn, useAuth } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { signIn, errors, fetchStatus } = useSignIn();
  const { isSignedIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");

  if (isSignedIn) {
    router.replace("/(tabs)" as never);
    return null;
  }

  const isLoading = fetchStatus === "fetching";

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          if (url.startsWith("http")) return;
          router.replace("/(tabs)" as never);
        },
      });
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code: verifyCode });
    if (signIn.status === "complete") {
      await signIn.finalize({
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

  if (signIn.status === "needs_client_trust") {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: topPad + 24, paddingBottom: bottomPad + 24, paddingHorizontal: 24 }}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Verify your identity</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          We sent a code to your email address
        </Text>
        <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Verification code</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          value={verifyCode}
          onChangeText={setVerifyCode}
          placeholder="Enter code"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
          autoFocus
        />
        {errors?.fields?.code && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>{errors.fields.code.message}</Text>
        )}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: verifyCode ? colors.primary : colors.muted }]}
          onPress={handleVerify}
          disabled={!verifyCode || isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Verify</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => signIn.mfa.sendEmailCode()} style={styles.linkRow}>
          <Text style={[styles.linkText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Resend code</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 24, paddingBottom: bottomPad + 24, paddingHorizontal: 24, gap: 0 }}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Feather name="x" size={22} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* Logo */}
      <View style={[styles.logoBox, { backgroundColor: colors.primary + "18" }]}>
        <Feather name="radio" size={30} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
        Welcome back
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Sign in to your PetSocial account
      </Text>

      {/* Email */}
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
      {errors?.fields?.identifier && (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {errors.fields.identifier.message}
        </Text>
      )}

      {/* Password */}
      <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
        Password
      </Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.passwordInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={!showPassword}
          autoComplete="current-password"
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
          <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
      {errors?.fields?.password && (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {errors.fields.password.message}
        </Text>
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
            Sign In
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.linkRow}>
        <Text style={[styles.linkLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Don't have an account?{" "}
        </Text>
        <Link href="/sign-up" asChild>
          <TouchableOpacity>
            <Text style={[styles.linkText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Sign up</Text>
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
