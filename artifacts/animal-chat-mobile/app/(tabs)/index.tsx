import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListCategories, useListChannels, useGetStats } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<string, string> = {
  Birds: "feather",
  Dogs: "github",
  Cats: "triangle",
};

const MAX_PARTICIPANTS = 4;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: categories, isLoading: loadingCats, refetch: refetchCats } = useListCategories();
  const { data: channels, isLoading: loadingChannels, refetch: refetchChannels } = useListChannels();
  const { data: stats } = useGetStats();

  const isLoading = loadingCats || loadingChannels;

  const topActiveChannels = (channels ?? [])
    .filter((c) => c.participantCount > 0)
    .sort((a, b) => b.participantCount - a.participantCount)
    .slice(0, 5);

  const styles = makeStyles(colors);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const onRefresh = () => {
    refetchCats();
    refetchChannels();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 100 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Feather name="radio" size={26} color={colors.primary} />
          <Text style={[styles.logoText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            PetSocial
          </Text>
        </View>
        <View style={[styles.filterBadge, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="wind" size={13} color={colors.primary} />
          <Text style={[styles.filterText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
            Animals only
          </Text>
        </View>
      </View>

      {/* Stats */}
      {stats && (
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {stats.totalChannels}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Live Channels
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {stats.totalActiveUsers}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Animals Online
            </Text>
          </View>
        </View>
      )}

      {/* Active Now */}
      {topActiveChannels.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Active Now
          </Text>
          {topActiveChannels.map((channel) => {
            const full = channel.participantCount >= MAX_PARTICIPANTS;
            return (
              <TouchableOpacity
                key={channel.id}
                style={[styles.channelCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/channel/${channel.id}` as never)}
                activeOpacity={0.75}
              >
                <View style={styles.channelLeft}>
                  <View style={[styles.liveIndicator, { backgroundColor: full ? colors.mutedForeground : "#EF4444" }]}>
                    {!full && <View style={styles.livePulse} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.channelName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                      {channel.name}
                    </Text>
                    <Text style={[styles.channelCategory, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {channel.categoryName}
                    </Text>
                  </View>
                </View>
                <View style={[styles.countBadge, { backgroundColor: full ? colors.muted : colors.primary + "18" }]}>
                  <Feather name="users" size={12} color={full ? colors.mutedForeground : colors.primary} />
                  <Text style={[styles.countText, { color: full ? colors.mutedForeground : colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                    {channel.participantCount}/{MAX_PARTICIPANTS}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Categories */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Browse by Species
        </Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          (categories ?? []).map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/category/${cat.id}` as never)}
              activeOpacity={0.75}
            >
              <View style={[styles.catIconBox, { backgroundColor: colors.primary + "18" }]}>
                <Feather
                  name={(CATEGORY_ICONS[cat.name] as any) ?? "radio"}
                  size={26}
                  color={colors.primary}
                />
              </View>
              <View style={styles.catInfo}>
                <Text style={[styles.catName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {cat.name}
                </Text>
                <Text style={[styles.catDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                  {cat.description}
                </Text>
                <Text style={[styles.catMeta, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                  {cat.channelCount} channels · {cat.activeUsers} online
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    logoText: { fontSize: 22 },
    filterBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    filterText: { fontSize: 12 },
    statsRow: {
      flexDirection: "row",
      marginHorizontal: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      overflow: "hidden",
    },
    statItem: { flex: 1, alignItems: "center" },
    statValue: { fontSize: 28 },
    statLabel: { fontSize: 13, marginTop: 2 },
    statDivider: { width: 1, marginVertical: 4 },
    section: { paddingHorizontal: 20, marginBottom: 28 },
    sectionTitle: { fontSize: 18, marginBottom: 12 },
    channelCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 8,
    },
    channelLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    liveIndicator: {
      width: 10,
      height: 10,
      borderRadius: 5,
      position: "relative",
    },
    livePulse: {
      position: "absolute",
      top: -3,
      left: -3,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: "#EF444430",
    },
    channelName: { fontSize: 15 },
    channelCategory: { fontSize: 12, marginTop: 1 },
    countBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    countText: { fontSize: 12 },
    categoryCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 12,
      gap: 14,
    },
    catIconBox: {
      width: 54,
      height: 54,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    catInfo: { flex: 1, gap: 2 },
    catName: { fontSize: 16 },
    catDesc: { fontSize: 13, lineHeight: 18 },
    catMeta: { fontSize: 12, marginTop: 2 },
  });
}
