import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={25} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const bg = Colors[colorScheme ?? 'light'].background;

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: bg,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: bg,
          borderTopColor: 'rgba(0,0,0,0.06)',
        },
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: useClientOnlyValue(false, true),
        sceneStyle: { backgroundColor: bg },
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <TabBarIcon name="comment" color={color} />,
        }}
      />

      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          tabBarIcon: ({ color }) => <TabBarIcon name="phone" color={color} />,
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="chat/[chatId]"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="call/new"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
