import React from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles as s } from './styles';
import { useBudget } from '../state/BudgetProvider';
export function Button({ title, onPress, secondary = false }: { title: string; onPress: () => void; secondary?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={secondary ? s.secondaryButton : s.primaryButton}><Text style={secondary ? s.secondaryButtonText : s.primaryButtonText}>{title}</Text></TouchableOpacity>;
}
export function Field({ label, value, onChange, numeric = false }: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean }) {
  return <View style={{ marginTop: 14 }}><Text style={s.itemSubtitle}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType={numeric ? 'decimal-pad' : 'default'} autoCapitalize="none" style={{ color: 'white', backgroundColor: '#10263A', borderColor: '#17446D', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 6, fontSize: 16 }} /></View>;
}
export function Choices({ label, value, options, onChange }: { label: string; value: string; options: {value: string; label: string}[]; onChange: (v: string) => void }) {
  return <View style={{ marginTop: 14 }}><Text style={s.itemSubtitle}>{label}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map(o => <TouchableOpacity key={o.value} accessibilityRole="button" accessibilityState={{ selected: value === o.value }} onPress={() => onChange(o.value)} style={{ padding: 12, backgroundColor: value === o.value ? '#17446D' : '#10263A', borderRadius: 12, marginTop: 6 }}><Text style={s.itemTitle}>{o.label}</Text></TouchableOpacity>)}</View></View>;
}
export function Screen({ children, scrollRef }: { children: React.ReactNode; scrollRef?: React.RefObject<ScrollView | null> }) {
  const { ready, blocked, error, retry, working } = useBudget();
  return <SafeAreaView style={s.safeArea} edges={['top', 'left', 'right']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView ref={scrollRef} style={s.container} contentContainerStyle={[s.content, { paddingBottom: 36 }]} keyboardShouldPersistTaps="handled"><View style={s.header}><Text style={s.logo}>rilo</Text><Text style={s.tagline}>Your money, in rhythm.</Text></View>{!!error && <View style={s.section}><Text accessibilityRole="alert" style={s.red}>{error}</Text><Button title="Retry" secondary onPress={retry} /></View>}{!ready ? <Text style={s.itemTitle}>Loading your budget…</Text> : blocked ? null : working ? <Text style={s.itemTitle}>Saving your restored budget…</Text> : children}</ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
