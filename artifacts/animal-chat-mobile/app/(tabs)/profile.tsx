import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser, useAuth, useClerk } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const styles = makeStyles(colors);

  if (!isLoaded) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  if (!isSignedIn) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 100, flex: 1 }}
      >
        <View style={styles.signedOutContent}>
          {/* Logo */}
          <View style={[styles.logoCircle, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="radio" size={40} color={colors.primary} />
          </View>

          <Text style={[styles.appName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            PetSocial
          </Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Voice channels for animals everywhere.{"\n"}Sign in to create channels and save favorites.
          </Text>

          {/* Sign in button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/sign-in" as never)}
            activeOpacity={0.85}
          >
            <Feather name="log-in" size={18} color="#FFFFFF" />
            <Text style={[styles.primaryButtonText, { fontFamily: "Inter_600SemiBold" }]}>
              Sign In
            </Text>
          </TouchableOpacity>

          {/* Sign up button */}
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => router.push("/sign-up" as never)}
            activeOpacity={0.85}
          >
            <Feather name="user-plus" size={18} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              Create Account
            </Text>
          </TouchableOpacity>

          {/* Features */}
          <View style={[styles.featuresBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            {[
              { icon: "mic", text: "Voice chat with the animal community" },
              { icon: "plus-circle", text: "Create your own animal channels" },
              { icon: "shuffle", text: "Auto-tour to discover new channels" },
            ].map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Feather name={f.icon as any} size={16} color={colors.primary} />
                <Text style={[styles.featureText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                  {f.text}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  const displayName =
    user?.firstName
      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
      : user?.emailAddresses?.[0]?.emailAddress ?? "Animal User";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 100 }}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: "#FFF", fontFamily: "Inter_700Bold" }]}>
            {initials}
          </Text>
        </View>
        <Text style={[styles.displayName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {displayName}
        </Text>
        <Text style={[styles.email, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {user?.emailAddresses?.[0]?.emailAddress}
        </Text>
      </View>

      {/* Account actions */}
      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => signOut()}
          activeOpacity={0.75}
        >
          <View style={[styles.menuIcon, { backgroundColor: "#D1452618" }]}>
            <Feather name="log-out" size={18} color={colors.destructive} />
          </View>
          <Text style={[styles.menuLabel, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>
            Sign Out
          </Text>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* App info */}
      <Text style={[styles.version, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        PetSocial v1.0 · Voice chat for the animal kingdom
      </Text>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    signedOutContent: { flex: 1, alignItems: "center", paddingHorizontal: 28, gap: 16 },
    logoCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    appName: { fontSize: 28, letterSpacing: -0.5 },
    tagline: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 8 },
    primaryButton: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 16,
      borderRadius: 16,
    },
    primaryButtonText: { fontSize: 17, color: "#FFF" },
    secondaryButton: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 16,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    secondaryButtonText: { fontSize: 17 },
    featuresBox: {
      width: "100%",
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      gap: 12,
      marginTop: 8,
    },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    featureText: { fontSize: 14, flex: 1 },
    avatarSection: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24, gap: 6 },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    avatarText: { fontSize: 28 },
    displayName: { fontSize: 22, letterSpacing: -0.3 },
    email: { fontSize: 14 },
    section: {
      marginHorizontal: 20,
      borderRadius: 16,
      borderWidth: 1,
      overflow: "hidden",
      marginBottom: 16,
    },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    menuIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    menuLabel: { flex: 1, fontSize: 16 },
    version: { textAlign: "center", fontSize: 13, marginTop: 8 },
  });
}
