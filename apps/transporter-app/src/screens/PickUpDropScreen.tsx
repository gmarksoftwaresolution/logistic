import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import ScreenHeader from '../components/ScreenHeader';
import UnderDevelopment from '../components/UnderDevelopment';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from '../utils/responsive';

const PickUpDropScreen = () => {
  const { t } = useTranslation();
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader 
        title={t('pickup.title')} 
        subtitle={t('pickup.subtitle')} 
        showBackButton={true} 
        showProfile={false} 
        showHelp={true} 
      />
      
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <UnderDevelopment moduleName={t('modules.pickup')} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  container: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    flexGrow: 1,
  },
});

export default PickUpDropScreen;
