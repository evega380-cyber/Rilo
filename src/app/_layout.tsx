import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RemindersProvider } from '../state/RemindersProvider';
import { BudgetProvider } from '../state/BudgetProvider';
export default function Layout() {
  return <BudgetProvider><RemindersProvider><StatusBar style="light" /><Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2EA7FF', tabBarInactiveTintColor: '#71879A', tabBarStyle: { backgroundColor: '#07131F', borderTopColor: '#142638' }, sceneStyle: { backgroundColor: '#06111D' } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>⌂</Text> }} />
    <Tabs.Screen name="paychecks" options={{ title: 'Paychecks', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>▣</Text> }} />
    <Tabs.Screen name="income" options={{ title: 'Income', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>＋</Text> }} />
    <Tabs.Screen name="bills" options={{ title: 'Bills', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>▤</Text> }} />
    <Tabs.Screen name="backup" options={{ title: 'Backup', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>↥</Text> }} />
    <Tabs.Screen name="reminders" options={{ href: null, title: 'Bill reminders' }} />
  </Tabs></RemindersProvider></BudgetProvider>;
}
