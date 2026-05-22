import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SharedHeader } from '../components/SharedHeader';

const PlaceholderScreen: React.FC<{ route?: any, navigation?: any }> = ({ route, navigation }) => {
  const title = route?.name || 'Screen';
  
  let subtitle = "Manage your information";
  if (title === 'Earning') subtitle = "Track your earnings and income";
  else if (title === 'Profile') subtitle = "Manage your account details";

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader title={title} subtitle={subtitle} navigation={navigation} />
      <View style={styles.content}>
        <Ionicons name="construct-outline" size={64} color="#CBD5E1" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>This screen is currently under development</Text>
      </View>
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

export default PlaceholderScreen;
