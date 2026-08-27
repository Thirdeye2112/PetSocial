import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetChannel } from "@workspace/api-client-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useAICompanion } from "@/hooks/useAICompanion";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const MAX_PARTICIPANTS = 4;

const CATEGORY_ICONS: Record<string, string> = {
  Birds: "feather",
  Dogs: "github",
  Cats: "triangle",
  Farm: "sun",
  Wild: "zap",
};

export default function ChannelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: channel, isLoading, error } = useGetChannel(id ?? "", {
    query: { enabled: !!id },
  });

  const { isConnected, isFull, participants, aiCompanion, isMuted, hasMic, toggleMute } =
    useWebRTC(id ?? "");

  const showCompanion = aiCompanion && participants.length === 0;
  const { isSpeaking, isUnlocked, companion, unlock } = useAICompanion(
    channel?.categoryName,
    showCompanion
  );

  const styles = makeStyles(colors);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const topPad = Platform.OS === "web" ? 16 : insets.top;
  const iconName = (CATEGORY_ICONS[channel?.categoryName ?? ""] ?? "radio") as any;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Joining channel...
        </Text>
      </View>
    );
  }

  if (error || !channel) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={48} color={colors.destructive} />
        <Text style={[styles.errorTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Channel Not Found
        </Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={[styles.backLink, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isFull) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
          <Feather name="users" size={36} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.fullTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          This clearing is full
        </Text>
        <Text style={[styles.fullSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Up to 4 animals per channel. Try a different one.
        </Text>
        <TouchableOpacity
          style={[styles.outlineButton, { borderColor: colors.border }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={16} color={colors.foreground} />
          <Text style={[styles.outlineButtonText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Browse channels
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalInRoom = participants.length + 1 + (showCompanion ? 1 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.headerBack}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Text
              style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
              numberOfLines={1}
            >
              {channel.name}
            </Text>
            {isConnected && (
              <View style={[styles.liveBadge, { backgroundColor: "#EF444420" }]}>
                <View style={[styles.liveDot, { backgroundColor: "#EF4444" }]} />
                <Text style={[styles.liveText, { color: "#EF4444", fontFamily: "Inter_600SemiBold" }]}>LIVE</Text>
              </View>
            )}
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + "15" }]}>
            <Feather name={iconName} size={12} color={colors.primary} />
            <Text style={[styles.categoryText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
              {channel.categoryName}
            </Text>
          </View>
        </View>
        <View style={[styles.participantBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.participantCount, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {totalInRoom}/{MAX_PARTICIPANTS}
          </Text>
        </View>
      </View>

      {/* No-mic notice */}
      {!hasMic && (
        <View style={[styles.notice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="mic-off" size={14} color={colors.mutedForeground} />
          <Text style={[styles.noticeText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            No microphone — listening only
          </Text>
        </View>
      )}

      {/* Participants grid */}
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {/* You */}
        <View
          style={[
            styles.participantCard,
            {
              backgroundColor: colors.card,
              borderColor: !isMuted ? colors.primary : colors.border,
              borderWidth: !isMuted ? 2 : 1,
            },
          ]}
        >
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary + "18" }]}>
            <Feather name={iconName} size={32} color={colors.primary} />
          </View>
          <Text style={[styles.participantName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            You
          </Text>
          <View style={styles.participantStatus}>
            {isMuted ? (
              <Feather name="mic-off" size={12} color={colors.destructive} />
            ) : (
              <View style={styles.soundBars}>
                {[1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[styles.bar, { backgroundColor: colors.primary, height: 4 + i * 3 }]}
                  />
                ))}
              </View>
            )}
            <Text style={[styles.participantLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {isMuted ? "Muted" : "Broadcasting"}
            </Text>
          </View>
        </View>

        {/* AI Companion card */}
        {showCompanion && (
          <TouchableOpacity
            activeOpacity={isUnlocked ? 0.9 : 0.7}
            onPress={() => {
              if (!isUnlocked) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                unlock();
              }
            }}
            style={[
              styles.participantCard,
              {
                backgroundColor: colors.card,
                borderColor: isSpeaking ? "#8B5CF6" : isUnlocked ? "#8B5CF640" : "#8B5CF6",
                borderWidth: isSpeaking ? 2 : isUnlocked ? 1 : 2,
                borderStyle: isUnlocked ? "solid" : "dashed",
              },
            ]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: "#8B5CF615" }]}>
              <Text style={{ fontSize: 30 }}>{companion.emoji}</Text>
            </View>
            <Text style={[styles.participantName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {companion.name}
            </Text>
            {!isUnlocked ? (
              <View style={styles.participantStatus}>
                <Feather name="volume-x" size={12} color="#8B5CF6" />
                <Text style={[styles.participantLabel, { color: "#8B5CF6", fontFamily: "Inter_500Medium" }]}>
                  Tap to say hi!
                </Text>
              </View>
            ) : (
              <View style={styles.participantStatus}>
                {isSpeaking ? (
                  <View style={styles.soundBars}>
                    {[1, 2, 3].map((i) => (
                      <View key={i} style={[styles.bar, { backgroundColor: "#8B5CF6", height: 4 + i * 3 }]} />
                    ))}
                  </View>
                ) : (
                  <Feather name="cpu" size={12} color="#8B5CF6" />
                )}
                <Text style={[styles.participantLabel, { color: "#8B5CF6", fontFamily: "Inter_400Regular" }]}>
                  AI companion
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Remote participants */}
        {participants.map((peerId) => (
          <View
            key={peerId}
            style={[styles.participantCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: colors.secondary + "18" }]}>
              <Feather name={iconName} size={32} color={colors.secondary} />
            </View>
            <Text style={[styles.participantName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Animal {peerId.substring(0, 4)}
            </Text>
            <View style={styles.participantStatus}>
              <Feather name="wifi" size={12} color={colors.secondary} />
              <Text style={[styles.participantLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Connected
              </Text>
            </View>
          </View>
        ))}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, MAX_PARTICIPANTS - 1 - participants.length - (showCompanion ? 1 : 0)) }).map((_, i) => (
          <View
            key={`empty-${i}`}
            style={[
              styles.participantCard,
              styles.emptyCard,
              { borderColor: colors.border + "60" },
            ]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: colors.muted }]}>
              <Feather name="user" size={32} color={colors.mutedForeground + "60"} />
            </View>
            <Text style={[styles.participantName, { color: colors.mutedForeground + "60", fontFamily: "Inter_500Medium" }]}>
              Open spot
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: bottomPad + 16, borderTopColor: colors.border },
        ]}
      >
        {hasMic && (
          <TouchableOpacity
            style={[
              styles.controlButton,
              {
                backgroundColor: isMuted ? colors.destructive + "15" : colors.primary + "15",
                borderColor: isMuted ? colors.destructive + "40" : colors.primary + "40",
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleMute();
            }}
            activeOpacity={0.8}
          >
            <Feather
              name={isMuted ? "mic-off" : "mic"}
              size={22}
              color={isMuted ? colors.destructive : colors.primary}
            />
            <Text
              style={[
                styles.controlLabel,
                { color: isMuted ? colors.destructive : colors.primary, fontFamily: "Inter_500Medium" },
              ]}
            >
              {isMuted ? "Unmute" : "Mute"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.leaveButton, { backgroundColor: colors.destructive }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.back();
          }}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={20} color="#FFFFFF" />
          <Text style={[styles.leaveButtonText, { fontFamily: "Inter_700Bold" }]}>Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
    loadingText: { fontSize: 15, marginTop: 8 },
    errorTitle: { fontSize: 22, marginTop: 8 },
    backLink: { fontSize: 16, marginTop: 4 },
    fullTitle: { fontSize: 24, textAlign: "center" },
    fullSubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
    outlineButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      marginTop: 8,
    },
    outlineButtonText: { fontSize: 15 },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 14,
      gap: 12,
      borderBottomWidth: 1,
    },
    headerBack: { padding: 4 },
    headerCenter: { flex: 1, gap: 4 },
    headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { fontSize: 20, flexShrink: 1 },
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    liveText: { fontSize: 10 },
    categoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    categoryText: { fontSize: 12 },
    participantBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    participantCount: { fontSize: 14 },
    notice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    noticeText: { fontSize: 13 },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      padding: 16,
      gap: 12,
    },
    participantCard: {
      width: "47%",
      aspectRatio: 1,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 12,
    },
    emptyCard: {
      borderStyle: "dashed",
      opacity: 0.5,
    },
    avatarCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    participantName: { fontSize: 14 },
    participantStatus: { flexDirection: "row", alignItems: "center", gap: 4 },
    soundBars: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
    bar: { width: 3, borderRadius: 2 },
    participantLabel: { fontSize: 11 },
    bottomBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
    },
    controlButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    controlLabel: { fontSize: 15 },
    leaveButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 16,
    },
    leaveButtonText: { fontSize: 15, color: "#FFFFFF" },
  });
}
