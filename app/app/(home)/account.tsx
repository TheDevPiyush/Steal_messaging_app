import { Text, View } from '@/components/Themed';
import { useAuthStore } from '@/stores/authStore';
import { Pressable, StyleSheet } from 'react-native';

export default function TabAccountScreen() {
  const { user, logout } = useAuthStore();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? "-"}</Text>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{user?.username ?? "-"}</Text>
      </View>

      <Pressable style={styles.logoutBtn} onPress={() => logout()}>
        <Text style={styles.logoutBtnText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
  },

  card: {
    marginTop: 18,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
  },

  label: {
    opacity: 0.7,
    fontWeight: "700",
    marginTop: 12,
  },

  value: {
    fontWeight: "800",
    marginTop: 6,
    fontSize: 15,
  },

  logoutBtn: {
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: "#DA3D20",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },

  logoutBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
});
