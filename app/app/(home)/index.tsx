import { Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuthStore } from '@/stores/authStore';

export default function TabChatsScreen() {

  const { user, token, logout } = useAuthStore();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user?.email}</Text>
      <Text style={styles.title}>{user?.username}</Text>
      <Text style={styles.title}>{token}</Text>
      <TouchableOpacity onPress={() => { logout() }}>
        <Text>
          LogOut
        </Text>
      </TouchableOpacity>
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
