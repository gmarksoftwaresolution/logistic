import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SharedRefreshControl } from '../components/SharedRefreshControl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SharedHeader } from '../components/SharedHeader';

import { LanguageContext } from '../context/LanguageContext';

const EarningsScreen: React.FC<{ route?: any, navigation?: any }> = ({ route, navigation }) => {
  const context = React.useContext(LanguageContext);
  const t = context ? context.t : (k: string) => k;

  const routeName = route?.name || 'Screen';
  const title = routeName === 'Earning' ? (t('earning') || 'Earnings') : (routeName === 'Profile' ? (t('profile') || 'Profile') : routeName);
  
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Simulate API reload for now
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);
  
  let subtitle = "Manage your information";
  if (routeName === 'Earning') subtitle = "Track your earnings and income";
  else if (routeName === 'Profile') subtitle = "Manage your account details";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <SharedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <SharedHeader title={title} subtitle={subtitle} navigation={navigation} />
        <View style={styles.content}>
        <Ionicons name="construct-outline" size={64} color="#CBD5E1" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{t("placeholder_under_dev") || "This screen is currently under development"}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});

export default EarningsScreen;
