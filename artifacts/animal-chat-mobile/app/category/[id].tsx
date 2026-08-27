import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useListChannelsByCategory,
  useListCategories,
  useCreateChannel,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const MAX_PARTICIPANTS = 4;

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: categories } = useListCategories();
  const category = categories?.find((c) => c.id === id);

  const { data: channels, isLoading, refetch } = useListChannelsByCategory(id ?? "", {
    query: { enabled: !!id },
  });

  const createChannel = useCreateChannel();

  const filtered = (channels ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const styles = makeStyles(colors);

  const handleCreate = async () => {
    if (!newName.trim() || !id) return;
    try {
      await createChannel.mutateAsync({
        data: { name: newName.trim(), categoryId: id, description: newDesc.trim() || null },
      });
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      refetch();
    } catch {
      Alert.alert("Error", "Could not create channel. Please try again.");
    }
  };

  const renderChannel = ({ item: channel }: { item: typeof filtered[0] }) => {
    const full = channel.participantCount >= MAX_PARTICIPANTS;
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: full ? 0.6 : 1 },
        ]}
        onPress={() => !full && router.push(`/channel/${channel.id}` as never)}
        activeOpacity={full ? 1 : 0.75}
        disabled={full}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {channel.name}
          </Text>
          {full ? (
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Feather name="lock" size={10} color={colors.mutedForeground} />
              <Text style={[styles.badgeText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Full</Text>
            </View>
          ) : channel.isActive ? (
            <View style={[styles.liveDot, { backgroundColor: "#EF444420" }]}>
              <View style={[styles.liveDotInner, { backgroundColor: "#EF4444" }]} />
            </View>
          ) : null}
        </View>
        {channel.description ? (
          <Text style={[styles.cardDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
            {channel.description}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <View style={[styles.badge, { backgroundColor: full ? colors.muted : colors.primary + "18" }]}>
            <Feather name="users" size={11} color={full ? colors.mutedForeground : colors.primary} />
            <Text style={[styles.badgeText, { color: full ? colors.mutedForeground : colors.primary, fontFamily: "Inter_500Medium" }]}>
              {channel.participantCount}/{MAX_PARTICIPANTS}
            </Text>
          </View>
          {!full && (
            <View style={styles.joinRow}>
              <Feather name="radio" size={13} color={colors.primary} />
              <Text style={[styles.joinText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Join</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchBar, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          placeholder="Search channels..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category info */}
      {category && (
        <Text style={[styles.catDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {category.description}
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="radio" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            No channels yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Be the first to start a channel here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={renderChannel}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        />
      )}

      {/* FAB: New Channel */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 24 }]}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Create Channel Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              New Channel
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
              placeholder="Channel name"
              placeholderTextColor={colors.mutedForeground}
              value={newName}
              onChangeText={setNewName}
              maxLength={60}
            />
            <TextInput
              style={[styles.input, styles.inputMulti, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => { setShowCreate(false); setNewName(""); setNewDesc(""); }}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: newName.trim() ? colors.primary : colors.muted }]}
                onPress={handleCreate}
                disabled={!newName.trim() || createChannel.isPending}
              >
                <Text style={[styles.modalBtnText, { color: newName.trim() ? "#FFF" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  {createChannel.isPending ? "Creating..." : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      margin: 16,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: 15 },
    catDesc: { paddingHorizontal: 16, fontSize: 14, marginBottom: 4 },
    card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10, gap: 8 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardTitle: { fontSize: 16, flex: 1 },
    liveDot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    liveDotInner: { width: 8, height: 8, borderRadius: 4 },
    cardDesc: { fontSize: 13, lineHeight: 18 },
    cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontSize: 12 },
    joinRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    joinText: { fontSize: 13 },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
    emptyTitle: { fontSize: 20 },
    emptyText: { fontSize: 15, textAlign: "center" },
    fab: {
      position: "absolute",
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
    modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#ccc", alignSelf: "center", marginBottom: 8 },
    modalTitle: { fontSize: 20 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
    inputMulti: { height: 80, textAlignVertical: "top" },
    modalButtons: { flexDirection: "row", gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
    modalBtnText: { fontSize: 16 },
  });
}
