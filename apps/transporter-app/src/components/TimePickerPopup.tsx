import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
} from 'react-native';
import { Colors, Fonts } from '../constants/Colors';
import { X } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ITEM_HEIGHT = verticalScale(50);
const VISIBLE_ITEMS = 3; // Reduced to 3 to match the image better (center + 1 above/below visible or partially visible)
const PICKER_HEIGHT = ITEM_HEIGHT * 3;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList as any);

interface WheelPickerProps {
  data: string[];
  selectedIndex: number;
  onValueChange: (index: number) => void;
  label?: string;
  visible: boolean;
  infinite?: boolean;
}

const WheelPickerItem = React.memo(({ 
  item, 
  index, 
  scrollY, 
  dataLength 
}: { 
  item: string, 
  index: number, 
  scrollY: Animated.Value, 
  dataLength: number 
}) => {
  const inputRange = [
    (index - 1) * ITEM_HEIGHT,
    index * ITEM_HEIGHT,
    (index + 1) * ITEM_HEIGHT,
  ];

  const scale = scrollY.interpolate({
    inputRange,
    outputRange: [0.85, 1.15, 0.85],
    extrapolate: 'clamp',
  });

  const opacity = scrollY.interpolate({
    inputRange,
    outputRange: [0.3, 1, 0.3],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.itemContainer, { height: ITEM_HEIGHT }]}>
      <Animated.Text
        style={[
          styles.itemText,
          {
            transform: [{ scale }],
            opacity,
            color: '#000000', // Constant color, opacity handles the "gray" effect
          },
        ]}
      >
        {item}
      </Animated.Text>
    </View>
  );
});

const WheelPicker = React.memo<WheelPickerProps>(({ 
  data, 
  selectedIndex, 
  onValueChange, 
  label, 
  visible,
  infinite = true 
}) => {
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Reduced repeat count further for Android performance
  const REPEAT_COUNT = infinite ? 10 : 1; 
  const repeatedData = Array(REPEAT_COUNT).fill(data).flat();
  const centerOffset = infinite ? Math.floor(REPEAT_COUNT / 2) * data.length : 0;

  useEffect(() => {
    if (visible) {
      const initialOffset = (centerOffset + selectedIndex) * ITEM_HEIGHT;
      scrollY.setValue(initialOffset);
      
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: initialOffset,
          animated: false,
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [visible, selectedIndex, data.length, infinite]);

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const realIndex = index % data.length;
    onValueChange(realIndex);
  };

  const renderItem = useCallback(({ item, index }: { item: string, index: number }) => {
    return (
      <WheelPickerItem 
        item={item} 
        index={index} 
        scrollY={scrollY} 
        dataLength={data.length} 
      />
    );
  }, [data.length, scrollY]);

  return (
    <View style={styles.pickerColumn}>
      {label && <Text style={styles.columnLabel}>{label}</Text>}
      <AnimatedFlatList
        ref={flatListRef as any}
        data={repeatedData}
        renderItem={renderItem as any}
        keyExtractor={(item: string, index: number) => index.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true } // Now using native driver for better performance
        )}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        getItemLayout={(_: any, index: number) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT, 
        }}
        removeClippedSubviews={Platform.OS === 'android'} // Explicitly enable for Android
        windowSize={3}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
      />
    </View>
  );
});

interface TimePickerPopupProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (time: string) => void;
  initialTime?: string; // Format "HH:MM AM/PM"
}

const TimePickerPopup: React.FC<TimePickerPopupProps> = ({ visible, onClose, onConfirm, initialTime }) => {
  const { t } = useTranslation();
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const ampm = ['AM', 'PM'];

  const [selectedHourIndex, setSelectedHourIndex] = useState(0);
  const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(0);
  const [selectedAmPmIndex, setSelectedAmPmIndex] = useState(0);

  useEffect(() => {
    if (visible && initialTime) {
      const parts = initialTime.split(' ');
      if (parts.length === 2) {
        const [time, period] = parts;
        const [h, m] = time.split(':');
        const hIdx = hours.indexOf(h);
        const mIdx = minutes.indexOf(m);
        const pIdx = ampm.indexOf(period);
        
        if (hIdx !== -1) setSelectedHourIndex(hIdx);
        if (mIdx !== -1) setSelectedMinuteIndex(mIdx);
        if (pIdx !== -1) setSelectedAmPmIndex(pIdx);
      }
    }
  }, [initialTime, visible]);

  const handleConfirm = () => {
    const time = `${hours[selectedHourIndex]}:${minutes[selectedMinuteIndex]} ${ampm[selectedAmPmIndex]}`;
    onConfirm(time);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.popupContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('common.select_time')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={scale(24)} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            {/* Highlight Strip */}
            <View style={styles.highlightStrip} pointerEvents="none">
               <View style={styles.highlightBorder} />
               <View style={styles.highlightBorder} />
            </View>
            
            <View style={styles.columnsWrapper}>
              <WheelPicker 
                data={hours} 
                selectedIndex={selectedHourIndex} 
                onValueChange={setSelectedHourIndex} 
                label="H"
                visible={visible}
              />
              <WheelPicker 
                data={minutes} 
                selectedIndex={selectedMinuteIndex} 
                onValueChange={setSelectedMinuteIndex} 
                label="M"
                visible={visible}
              />
              <WheelPicker 
                data={ampm} 
                selectedIndex={selectedAmPmIndex} 
                onValueChange={setSelectedAmPmIndex} 
                visible={visible}
                infinite={false}
              />
            </View>

            {/* Fading Overlays */}
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
              style={styles.fadeOverlayTop}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)']}
              style={styles.fadeOverlayBottom}
              pointerEvents="none"
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  popupContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(24),
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: scale(4),
  },
  pickerContainer: {
    height: PICKER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: verticalScale(10),
  },
  columnsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  pickerColumn: {
    flex: 1,
    height: PICKER_HEIGHT,
    alignItems: 'center',
  },
  columnLabel: {
    position: 'absolute',
    top: -verticalScale(20),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  highlightStrip: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: '#F3F4F6',
    borderRadius: scale(12),
    zIndex: -1,
    justifyContent: 'space-between',
  },
  highlightBorder: {
    height: 1,
    backgroundColor: '#E5E7EB',
    width: '100%',
  },
  fadeOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    zIndex: 1,
  },
  fadeOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    zIndex: 1,
  },
  itemContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontFamily: Fonts.bold, // Set to bold by default for better look
    fontSize: moderateScale(22),
    color: '#9CA3AF',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: verticalScale(20),
    gap: scale(20),
  },
  cancelButton: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(15),
  },
  cancelButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: Colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(30),
    borderRadius: scale(12),
  },
  confirmButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: '#FFFFFF',
  },
});

export default TimePickerPopup;
