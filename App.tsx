import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

export default function App() {
  const paycheck = 1400;
  const extraIncome = 0;
  const planned = 1250;

  const totalIncome = paycheck + extraIncome;
  const available = totalIncome - planned;
  const percentAllocated = Math.min(
    Math.round((planned / totalIncome) * 100),
    100
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.header}>
          <Text style={styles.logo}>rilo</Text>
          <Text style={styles.tagline}>Your money, in rhythm.</Text>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Good afternoon, Edwin 👋</Text>
          <Text style={styles.subText}>
            Here's the plan for your next paycheck.
          </Text>
        </View>

        {/* Paycheck Card */}
        <View style={styles.mainCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>NEXT PAYCHECK</Text>
            <Text style={styles.link}>View all ›</Text>
          </View>

          <Text style={styles.paycheckAmount}>
            ${paycheck.toLocaleString()}
          </Text>

          <Text style={styles.payDate}>Friday, Oct 2</Text>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Planned</Text>
              <Text style={styles.statValue}>
                ${planned.toLocaleString()}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Available</Text>
              <Text
                style={[
                  styles.statValue,
                  available >= 0 ? styles.green : styles.red,
                ]}
              >
                ${available.toLocaleString()}
              </Text>
            </View>
          </View>

          <Text style={styles.progressLabel}>
            {percentAllocated}% allocated
          </Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${percentAllocated}%` },
              ]}
            />
          </View>
        </View>

        {/* Income */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Income this period</Text>
            <TouchableOpacity>
              <Text style={styles.link}>+ Add income</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.incomeRow}>
            <View>
              <Text style={styles.itemTitle}>Regular paycheck</Text>
              <Text style={styles.itemSubtitle}>Biweekly</Text>
            </View>

            <Text style={styles.itemAmount}>$1,400</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.incomeRow}>
            <View>
              <Text style={styles.itemTitle}>Extra income</Text>
              <Text style={styles.itemSubtitle}>
                Uber, overtime, tips, freelance, etc.
              </Text>
            </View>

            <Text style={styles.extraAmount}>+$0</Text>
          </View>
        </View>

        {/* Bills */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Coming from this check</Text>
            <Text style={styles.link}>See all ›</Text>
          </View>

          <Bill name="Car Payment" subtitle="Auto loan" amount="$378" />
          <Bill name="Rent" subtitle="Housing" amount="$350" />
          <Bill name="Loan" subtitle="Personal loan" amount="$173" />
          <Bill name="Food" subtitle="Budget" amount="$100" />
          <Bill name="Capital One" subtitle="Credit card" amount="$100" />
          <Bill name="Other bills" subtitle="Remaining planned" amount="$149" />
        </View>

        {/* Extra Income Goal */}
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>SIDE-GIG GOAL</Text>
          <Text style={styles.goalTitle}>Need a little extra this period?</Text>
          <Text style={styles.goalText}>
            Add expected side-gig income and Rilo will track how much you've
            actually earned before counting it as spendable.
          </Text>

          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>
              Set an income goal
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Plan my paycheck</Text>
        </TouchableOpacity>

        <Text style={styles.quote}>
          A plan today. A better tomorrow.
        </Text>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <NavItem icon="⌂" label="Home" active />
        <NavItem icon="▣" label="Paychecks" />
        <NavItem icon="▤" label="Bills" />
        <NavItem icon="▥" label="Debt" />
        <NavItem icon="•••" label="More" />
      </View>
    </SafeAreaView>
  );
}

function Bill({
  name,
  subtitle,
  amount,
}: {
  name: string;
  subtitle: string;
  amount: string;
}) {
  return (
    <View style={styles.billRow}>
      <View style={styles.billIcon}>
        <Text style={styles.billIconText}>$</Text>
      </View>

      <View style={styles.billInfo}>
        <Text style={styles.itemTitle}>{name}</Text>
        <Text style={styles.itemSubtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.itemAmount}>{amount}</Text>
    </View>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.navItem}>
      <Text style={[styles.navIcon, active && styles.navActive]}>
        {icon}
      </Text>
      <Text style={[styles.navLabel, active && styles.navActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#06111D",
  },

  container: {
    flex: 1,
    backgroundColor: "#06111D",
  },

  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  header: {
    marginBottom: 34,
  },

  logo: {
    color: "#FFFFFF",
    fontSize: 52,
    fontWeight: "800",
    letterSpacing: -3,
  },

  tagline: {
    color: "#9BD8FF",
    fontSize: 16,
    marginTop: -4,
  },

  greeting: {
    marginBottom: 24,
  },

  greetingText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },

  subText: {
    color: "#91A4B7",
    fontSize: 15,
    marginTop: 6,
  },

  mainCard: {
    backgroundColor: "#0B1B2C",
    borderColor: "#17446D",
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardLabel: {
    color: "#8FD3FF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },

  link: {
    color: "#32A8FF",
    fontSize: 14,
    fontWeight: "600",
  },

  paycheckAmount: {
    color: "#FFFFFF",
    fontSize: 44,
    fontWeight: "800",
    marginTop: 18,
  },

  payDate: {
    color: "#B4C4D4",
    fontSize: 17,
    marginTop: 3,
  },

  statRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },

  statBox: {
    flex: 1,
    backgroundColor: "#10263A",
    borderRadius: 18,
    padding: 16,
  },

  statLabel: {
    color: "#A9BAC9",
    fontSize: 14,
  },

  statValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 5,
  },

  green: {
    color: "#35E59A",
  },

  red: {
    color: "#FF6B6B",
  },

  progressLabel: {
    color: "#B4C4D4",
    textAlign: "right",
    marginTop: 20,
    marginBottom: 8,
  },

  progressTrack: {
    height: 10,
    backgroundColor: "#173049",
    borderRadius: 20,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#279CFF",
    borderRadius: 20,
  },

  section: {
    backgroundColor: "#091725",
    borderColor: "#142A3D",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  incomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 17,
  },

  divider: {
    height: 1,
    backgroundColor: "#15283A",
  },

  itemTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  itemSubtitle: {
    color: "#8297AA",
    fontSize: 13,
    marginTop: 3,
  },

  itemAmount: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  extraAmount: {
    color: "#35E59A",
    fontSize: 17,
    fontWeight: "700",
  },

  billRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 17,
  },

  billIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#123052",
    alignItems: "center",
    justifyContent: "center",
  },

  billIconText: {
    color: "#46B5FF",
    fontSize: 17,
    fontWeight: "800",
  },

  billInfo: {
    flex: 1,
    marginLeft: 13,
  },

  goalCard: {
    backgroundColor: "#0C2134",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
  },

  goalLabel: {
    color: "#35E59A",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  goalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 9,
  },

  goalText: {
    color: "#9FB0C0",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  secondaryButton: {
    borderColor: "#2D9FFF",
    borderWidth: 1,
    borderRadius: 15,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 18,
  },

  secondaryButtonText: {
    color: "#45B0FF",
    fontWeight: "700",
    fontSize: 15,
  },

  primaryButton: {
    backgroundColor: "#249CFF",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 4,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  quote: {
    color: "#8397A9",
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
  },

  navigation: {
    backgroundColor: "#07131F",
    borderTopColor: "#142638",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    paddingBottom: 14,
  },

  navItem: {
    alignItems: "center",
    minWidth: 58,
  },

  navIcon: {
    color: "#71879A",
    fontSize: 21,
    fontWeight: "700",
  },

  navLabel: {
    color: "#71879A",
    fontSize: 11,
    marginTop: 4,
  },

  navActive: {
    color: "#2EA7FF",
  },

  bottomSpace: {
    height: 24,
  },
});