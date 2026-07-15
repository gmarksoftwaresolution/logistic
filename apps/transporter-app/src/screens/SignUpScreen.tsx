import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  LayoutAnimation,
  PixelRatio,
  Image,
  Keyboard,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Fonts } from '../constants/Colors';
import {
  Phone,
  User,
  Mail,
  MapPin,
  Truck,
  FileText,
  Camera,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Upload,
  CreditCard,
  Building2,
  Clock,
  Calendar,
  ChevronDown,
  Award,
  Shield,
  Navigation,
  Map as MapIcon,
  Briefcase,
  Hash,
  X,
  Plus,
  Trash2,
  Landmark,
  CircleAlert,
  Loader2,
  Check,
  Square,
  CheckSquare
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import TimePickerPopup from '../components/TimePickerPopup';

import api, { uploadFile, BASE_URL } from '../services/api';

const resolveImageUri = (uri: string | null | undefined): string | undefined => {
  if (!uri) return undefined;
  if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }
  if (uri.startsWith('/')) {
    return `${BASE_URL}${uri}`;
  }
  return `${BASE_URL}/${uri}`;
};

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const AnimatedPlaceholderInput = React.forwardRef<TextInput, any>((props, ref) => {
  const { basePlaceholder, placeholderTextColor, style, value, ...rest } = props;
  // Use non-breaking spaces as spacer so the text scrolls seamlessly
  const padding = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
  const fullText = basePlaceholder + padding;
  const [displayText, setDisplayText] = useState(fullText);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayText(basePlaceholder + padding);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplayText((prev: string) => prev.substring(1) + prev[0]);
    }, 150);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [basePlaceholder]);

  return (
    <View style={[{ flex: 1, justifyContent: 'center', overflow: 'hidden' }]}>
      {/* Custom animated placeholder — only visible when input is empty */}
      {!value ? (
        <Text
          numberOfLines={1}
          ellipsizeMode="clip"
          style={[
            style,
            {
              position: 'absolute',
              color: placeholderTextColor || '#9CA3AF',
              pointerEvents: 'none',
            },
          ]}
        >
          {displayText}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        {...rest}
        value={value}
        multiline={false}
        numberOfLines={1}
        placeholder=""
        style={[style, { backgroundColor: 'transparent' }]}
      />
    </View>
  );
});


interface FormData {
  mobile: string;
  firstName: string;
  lastName: string;
  email: string;
  state: string;
  district: string;
  taluka: string;
  village: string;
  address: string;
  pincode: string;
  postOffice: string;
  profilePhoto: string | null;
  licenseNumber: string;
  licensePhoto: string | null;
  licenseExpiry: string;
  experience: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
  vehicleTypeSelection: 'Personal' | 'Milk' | '';
  vehicleWheeler: string;
  vehicleType: string;
  vehicleMake: string;
  minWeight: string;
  maxWeight: string;
  vehicleNumber: string;
  rcPhoto: string | null;
  insurancePhoto: string | null;
  operatingArea: string;
  pickupLocations: string;
  dropLocations: string;
  workingTime: string;
  milkSangathanName: string;
  milkCenterName: string;
  assignedVillages: string[];
  morningShiftTime: string;
  eveningShiftTime: string;
  daysAvailable: string;
}

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateVehicleNumber = (val: string) => /^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/.test(val);
const validateLicenseNumber = (val: string) => /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11}$/.test(val);
const validateIFSC = (val: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val);
const validatePincode = (val: string) => /^\d{6}$/.test(val);
const validateMobile = (val: string) => /^[6789]\d{9}$/.test(val);
const validateOrganization = (val: string) => /^[a-zA-Z0-9\s,.\-\/()]+$/.test(val);
const validateName = (val: string) => /^[a-zA-Z]+$/.test(val);
const validateCity = (val: string) => /^[a-zA-Z0-9\s,.\-\/()]+$/.test(val);
const validateAddress = (val: string) => {
  if (!val) return false;
  const len = val.trim().length;
  return len >= 3 && len <= 500;
};

const formatLicenseNumber = (val: string) => {
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
};

const formatVehicleNumber = (val: string) => {
  const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let formatted = '';
  if (cleaned.length > 0) formatted += cleaned.slice(0, 2);
  if (cleaned.length > 2) formatted += ' ' + cleaned.slice(2, 4);
  
  if (cleaned.length > 4) {
    if (cleaned.length === 10) {
      // 10 chars: MH 12 ES 7650
      formatted += ' ' + cleaned.slice(4, 6);
      formatted += ' ' + cleaned.slice(6, 10);
    } else if (cleaned.length === 9) {
      // 9 chars: MH 12 E 1234
      formatted += ' ' + cleaned.slice(4, 5);
      formatted += ' ' + cleaned.slice(5, 9);
    } else {
      // Intermediate typing
      formatted += ' ' + cleaned.slice(4);
    }
  }
  return formatted.trim();
};

import { scale, verticalScale, moderateScale, SCREEN_WIDTH, SCREEN_HEIGHT } from '../utils/responsive';
import { getBankRule } from '../utils/bankValidation';

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeMode, setTimeMode] = useState<'morning' | 'evening'>('morning');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownType, setDropdownType] = useState<'wheeler' | 'type' | 'make' | 'sangathan' | 'milkCenter' | 'village' | 'residential_village' | 'post_office' | 'replace_assigned_village' | 'replace_operating_area' | null>(null);
  const [areaInput, setAreaInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [sangathans, setSangathans] = useState<string[]>([]);
  const [centers, setCenters] = useState<string[]>([]);
  const [villagePincode, setVillagePincode] = useState('');
  const [pincodeVillages, setPincodeVillages] = useState<string[]>([]);
  const [residentialVillages, setResidentialVillages] = useState<Array<{ name: string; taluka: string }>>([]);
  const [postOffices, setPostOffices] = useState<string[]>([]);
  const [editingVillageIndex, setEditingVillageIndex] = useState<number | null>(null);
  const [isCustomVehicleType, setIsCustomVehicleType] = useState(false);
  const [isCustomVehicleMake, setIsCustomVehicleMake] = useState(false);

  const otpInputs = useRef<Array<TextInput | null>>([]);
  const [dayTimings, setDayTimings] = useState<Record<string, { morning: string; evening: string; workingTime?: string }>>({});
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingTimeMode, setEditingTimeMode] = useState<'morning' | 'evening' | 'working'>('morning');

  const [customHour, setCustomHour] = useState('09');
  const [customMinute, setCustomMinute] = useState('00');
  const [customAmPm, setCustomAmPm] = useState('AM');
  const [villageInput, setVillageInput] = useState('');
  const [isVillageFocused, setIsVillageFocused] = useState(false);
  const [isAreaFocused, setIsAreaFocused] = useState(false);

  const truckAnim = useRef(new Animated.Value(-SCREEN_WIDTH * 0.4)).current;
  const smokeAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  const progressTruckAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const activeSavePromise = useRef<Promise<any>>(Promise.resolve());
  const fieldPositions = useRef<Record<string, number>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [reachedFields, setReachedFields] = useState<Record<string, boolean>>({
    firstName: true,
    licenseNumber: true,
    accountHolderName: true,
    vehicleWheeler: true,
    operatingArea: true,
    milkSangathanName: true,
    assignedVillages: true
  });

  const [formData, setFormData] = useState<FormData>({
    mobile: '',
    firstName: '',
    lastName: '',
    email: '',
    state: '',
    district: '',
    taluka: '',
    village: '',
    address: '',
    pincode: '',
    postOffice: '',
    profilePhoto: null,
    licenseNumber: '',
    licensePhoto: null,
    licenseExpiry: '',
    experience: '',
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    upiId: '',
    vehicleTypeSelection: '',
    vehicleWheeler: '',
    vehicleType: '',
    vehicleMake: '',
    minWeight: '',
    maxWeight: '',
    vehicleNumber: '',
    rcPhoto: null,
    insurancePhoto: null,
    operatingArea: '',
    pickupLocations: '',
    dropLocations: '',
    workingTime: '',
    milkSangathanName: '',
    milkCenterName: '',
    assignedVillages: [],
    morningShiftTime: '',
    eveningShiftTime: '',
    daysAvailable: '',
  });

  const mobileInputRef = useRef<TextInput>(null);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const districtRef = useRef<TextInput>(null);
  const talukaRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const pincodeRef = useRef<TextInput>(null);
  const lastFetchedPincodeRef = useRef<string>('');

  const licenseRef = useRef<TextInput>(null);
  const licenseExpiryRef = useRef<TextInput>(null);
  const experienceRef = useRef<TextInput>(null);

  const accountHolderRef = useRef<TextInput>(null);
  const bankNameRef = useRef<TextInput>(null);
  const accountNumberRef = useRef<TextInput>(null);
  const ifscCodeRef = useRef<TextInput>(null);
  const branchNameRef = useRef<TextInput>(null);
  const upiIdRef = useRef<TextInput>(null);

  const vehicleWheelerRef = useRef<TextInput>(null);
  const vehicleTypeRef = useRef<TextInput>(null);
  const vehicleMakeRef = useRef<TextInput>(null);
  const vehicleNumberRef = useRef<TextInput>(null);

  const operatingAreaRef = useRef<TextInput>(null);
  const pickupLocationsRef = useRef<TextInput>(null);
  const dropLocationsRef = useRef<TextInput>(null);
  const workingTimeRef = useRef<TextInput>(null);

  const sangathanRef = useRef<TextInput>(null);
  const centerNameRef = useRef<TextInput>(null);

  const morningShiftRef = useRef<TextInput>(null);
  const eveningShiftRef = useRef<TextInput>(null);
  const daysAvailableRef = useRef<TextInput>(null);

  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  const handleReach = (field: string) => {
    setReachedFields(prev => ({ ...prev, [field]: true }));
  };

  const autoScroll = (offset: number) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: verticalScale(offset), animated: true });
    }, 100);
  };

  const scrollToAndFocusField = (field: keyof FormData) => {
    const yOffset = fieldPositions.current[field];
    if (yOffset !== undefined) {
      scrollViewRef.current?.scrollTo({ y: yOffset - verticalScale(20), animated: true });
      
      // Give scroll some time to finish before focusing
      setTimeout(() => {
        const fieldRefMap: Record<string, any> = {
          mobile: mobileInputRef,
          firstName: firstNameRef,
          lastName: lastNameRef,
          email: emailRef,
          state: stateRef,
          district: districtRef,
          taluka: talukaRef,
          address: addressRef,
          pincode: pincodeRef,
          licenseNumber: licenseRef,
          experience: experienceRef,
          accountHolderName: accountHolderRef,
          bankName: bankNameRef,
          accountNumber: accountNumberRef,
          ifscCode: ifscCodeRef,
          branchName: branchNameRef,
          upiId: upiIdRef,
          vehicleWheeler: vehicleWheelerRef,
          vehicleType: vehicleTypeRef,
          vehicleMake: vehicleMakeRef,
          vehicleNumber: vehicleNumberRef,
          operatingArea: operatingAreaRef,
          pickupLocations: pickupLocationsRef,
          dropLocations: dropLocationsRef,
          workingTime: workingTimeRef,
          morningShiftTime: morningShiftRef,
          eveningShiftTime: eveningShiftRef,
        };

        const ref = fieldRefMap[field];
        if (ref && ref.current) {
          ref.current.focus();
        }

        // Handle specific non-text fields
        if (field === 'licenseExpiry') {
          setShowDatePicker(true);
        } else if (field === 'milkSangathanName') {
          setDropdownType('sangathan');
          setShowDropdown(true);
        } else if (field === 'milkCenterName') {
          if (formData.milkSangathanName) {
            setDropdownType('milkCenter');
            setShowDropdown(true);
          }
        } else if (field === 'vehicleWheeler') {
          setDropdownType('wheeler');
          setShowDropdown(true);
        } else if (field === 'vehicleType') {
          if (formData.vehicleWheeler) {
            setDropdownType('type');
            setShowDropdown(true);
          }
        } else if (field === 'vehicleMake') {
          if (formData.vehicleWheeler) {
            setDropdownType('make');
            setShowDropdown(true);
          }
        } else if (field === 'vehicleTypeSelection') {
          // It's the first thing in step 4, maybe just scroll is enough
        } else if (field === 'morningShiftTime') {
          setTimeMode('morning');
          setShowTimePicker(true);
        } else if (field === 'eveningShiftTime') {
          setTimeMode('evening');
          setShowTimePicker(true);
        }
      }, 300);
    }
  };

  const updateFormData = (key: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const getError = (field: keyof FormData, force: boolean = false) => {
    if (!touchedFields[field] && !force) return null;

    const val = formData[field];

    const fieldLabelMap: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      address: 'residential_address',
      pincode: 'pincode',
      postOffice: 'post_office',
      village: 'village',
      mobile: 'login.mobile_label',
      licenseNumber: 'license_number',
      licenseExpiry: 'expiry_date',
      experience: 'driving_experience',
      accountHolderName: 'account_holder',
      accountNumber: 'account_number',
      ifscCode: 'ifsc_code',
      vehicleWheeler: 'vehicle_wheeler',
      vehicleType: 'vehicle_type',
      vehicleMake: 'vehicle_make',
      minWeight: 'min_weight',
      maxWeight: 'max_weight',
      vehicleNumber: 'vehicle_number',
      milkSangathanName: 'sangathan_name',
      milkCenterName: 'milk_center_name',
      assignedVillages: 'assigned_villages',
      morningShiftTime: 'morning_shift',
      eveningShiftTime: 'evening_shift',
      daysAvailable: 'days_available',
      operatingArea: 'operating_area',
      pickupLocations: 'pickup_locations',
      dropLocations: 'drop_locations',
      workingTime: 'working_time',
      profilePhoto: 'profile_photo',
      licensePhoto: 'license_photo',
      rcPhoto: 'rc_upload',
      insurancePhoto: 'insurance_upload',
      bankName: 'bank_name',
      branchName: 'branch_name',
      upiId: 'upi_id',
    };

    const labelKey = fieldLabelMap[field] || field;
    let label = labelKey.includes('.') ? t(labelKey) : t(`signup.${labelKey}`);
    if (label === 'signup.min_weight' || (label === `signup.${labelKey}` && labelKey === 'min_weight')) {
      label = 'min weight';
    } else if (label === 'signup.max_weight' || (label === `signup.${labelKey}` && labelKey === 'max_weight')) {
      label = 'max weight';
    }

    if (!val && field !== 'email' && field !== 'state' && field !== 'district' && field !== 'taluka') {
      return t('errors.required_field', { field: label });
    }

    switch (field) {
      case 'mobile':
        return !validateMobile(val as string) ? t('errors.mobile_invalid') : null;
      case 'email':
        return val && !validateEmail(val as string) ? t('errors.invalid_email') : null;
      case 'pincode':
        return !validatePincode(val as string) ? t('errors.pincode_digits') : null;
      case 'licenseNumber':
        if (val && (val as string).length < 15) return t('errors.license_length', 'Driving License must be exactly 15 characters');
        return !validateLicenseNumber(val as string) ? t('errors.license_format', 'Format: MH1420110012345') : null;
      case 'minWeight':
        if (!val) return t('errors.required_field', { field: 'Minimum Weight' });
        if (isNaN(Number(val)) || Number(val) <= 0) return 'Minimum weight must be a positive number';
        return null;
      case 'maxWeight':
        if (!val) return t('errors.required_field', { field: 'Maximum Weight' });
        if (isNaN(Number(val)) || Number(val) <= 0) return 'Maximum weight must be a positive number';
        if (formData.minWeight && Number(val) < Number(formData.minWeight)) {
          return 'Maximum weight cannot be less than minimum weight';
        }
        return null;
      case 'vehicleNumber':
        return !validateVehicleNumber(val as string) ? t('errors.vehicle_format') : null;
      case 'accountNumber':
        if (!val) return t('errors.required_field');
        if ((val as string).length < 9) return t('errors.account_number_length', 'Account number must be at least 9 digits');
        if ((val as string).length > 20) return t('errors.account_number_max', 'Account number cannot exceed 20 digits');
        return null;
      case 'ifscCode':
        if (!validateIFSC(val as string)) return t('errors.invalid_ifsc');
        if ((val as string).length === 11 && !formData.bankName) return t('errors.ifsc_not_found');
        return null;
      case 'firstName':
        return (val as string).length < 2 ? t('errors.first_name_short') : null;
      case 'lastName':
        return (val as string).length < 2 ? t('errors.last_name_short') : null;
      case 'state':
        if (!val) return t('errors.state_required');
        return !/^[a-zA-Z\s]+$/.test(val as string) ? t('errors.state_invalid') : null;
      case 'district':
        if (!val) return t('errors.district_required');
        return !/^[a-zA-Z\s]+$/.test(val as string) ? t('errors.district_invalid') : null;
      case 'taluka':
        if (!val) return t('errors.taluka_required');
        return !/^[a-zA-Z\s]+$/.test(val as string) ? t('errors.taluka_invalid') : null;
      case 'address':
        return val && !validateAddress(val as string) ? t('errors.address_char_count', 'Address must be between 3 and 500 characters') : null;
      case 'operatingArea':
        if (!val) return t('errors.required_field');
        return !validateCity(val as string) ? t('errors.only_alphabets', 'Only alphabets allowed') : null;
      case 'daysAvailable':
        if (!val) return t('errors.required_field');
        return null;
      case 'assignedVillages':
        return (!val || (val as string[]).length === 0) ? t('errors.village_required') : null;
      case 'milkSangathanName':
      case 'milkCenterName':
        return val && !validateOrganization(val as string) ? t('errors.invalid_characters', 'Contains invalid characters') : null;
      default:
        return null;
    }
  };

  const pickImage = async (type: 'profile' | 'license' | 'rc' | 'insurance') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      alert(t('errors.camera_permission'));
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: type === 'profile',
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes

      if (asset.fileSize && asset.fileSize > MAX_SIZE) {
        alert(t('errors.file_too_large'));
        return;
      }

      const fieldMap = {
        profile: 'profilePhoto',
        license: 'licensePhoto',
        rc: 'rcPhoto',
        insurance: 'insurancePhoto'
      } as const;

      // Show the local image immediately for instant UI feedback
      updateFormData(fieldMap[type], asset.uri);

      // Preemptively upload to backend in the background immediately
      (async () => {
        try {
          const uploadRes = await uploadFile(asset.uri, asset.base64 || undefined);
          const uploadedUrl = uploadRes.data.url;
          updateFormData(fieldMap[type], uploadedUrl);
        } catch (err: any) {
          console.error(`Preemptive background upload failed for ${type}:`, err);
          if (err.response) {
            console.error('Upload error response data:', err.response.data);
            console.error('Upload error response status:', err.response.status);
          }
          if (err.message) {
            console.error('Upload error message:', err.message);
          }
          if (err.config) {
            console.error('Upload error config headers:', err.config.headers);
            console.error('Upload error config url:', err.config.url);
          }
        }
      })();
    }
  };

  useEffect(() => {
    const targetValue = (currentStep - 1) * scale(52);
    Animated.spring(progressTruckAnim, {
      toValue: targetValue,
      tension: 25,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    if (isLoading || isVerifying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(truckAnim, {
            toValue: SCREEN_WIDTH * 0.6,
            duration: 3500,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(truckAnim, {
            toValue: -SCREEN_WIDTH * 0.4,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();

      smokeAnims.forEach((anim, index) => {
        const delay = index * 600;
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(anim, {
                toValue: 1,
                duration: 1500,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              })
            ]),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            })
          ])
        ).start();
      });
    } else {
      truckAnim.setValue(-SCREEN_WIDTH * 0.4);
      smokeAnims.forEach(anim => anim.setValue(0));
    }
  }, [isLoading, isVerifying]);

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <Animated.View style={[
        styles.animatedTruckGroup,
        { transform: [{ translateX: truckAnim }] }
      ]}>
        <View style={styles.smokeContainer}>
          {smokeAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.smokeParticle,
                {
                  opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.8, 0] }),
                  transform: [
                    { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, scale(-30)] }) },
                    { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, verticalScale(-10)] }) },
                    { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.8] }) }
                  ]
                }
              ]}
            />
          ))}
        </View>
        <Text style={styles.processingText}>{t('login.processing')}</Text>
        <Truck size={scale(24)} color="#FFFFFF" style={styles.truckIcon} />
      </Animated.View>
    </View>
  );

  const renderProgress = () => {
    const totalSteps = formData.vehicleTypeSelection === 'Milk' ? 7 : 6;
    const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

    return (
      <View style={[styles.progressWrapper, { width: scale(totalSteps * 28 + (totalSteps - 1) * 24) }]}>
        <View style={styles.progressContainer}>
          <Animated.View style={[
            styles.progressTruckOverlay,
            { transform: [{ translateX: progressTruckAnim }] }
          ]}>
            <Truck size={scale(16)} color="#FFFFFF" />
          </Animated.View>

          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <View style={[
                styles.progressCircle,
                currentStep >= step && styles.progressCircleActive,
                currentStep < step && styles.progressCircleInactive
              ]}>
                {currentStep > step ? (
                  <CheckCircle2 size={scale(14)} color="#FFFFFF" />
                ) : currentStep === step ? (
                  null
                ) : (
                  <Text style={[styles.progressText, styles.progressTextInactive]}>{step}</Text>
                )}
              </View>
              {index < steps.length - 1 && (
                <View style={[
                  styles.progressLine,
                  currentStep > step && styles.progressLineActive,
                  currentStep <= step && styles.progressLineInactive
                ]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  const handleVehicleTypeSelection = (selection: 'Personal' | 'Milk') => {
    setFormData(prev => ({
      ...prev,
      vehicleTypeSelection: selection,
      vehicleWheeler: '',
      vehicleType: '',
      vehicleMake: '',
      vehicleNumber: '',
      rcPhoto: null,
      insurancePhoto: null,
      operatingArea: '',
      pickupLocations: '',
      dropLocations: '',
      workingTime: '',
      milkSangathanName: '',
      milkCenterName: '',
      assignedVillages: [],
      morningShiftTime: '',
      eveningShiftTime: '',
      daysAvailable: '',
    }));
  };

  const toggleDay = (day: string) => {
    let currentDays = formData.daysAvailable ? formData.daysAvailable.split(', ') : [];
    if (currentDays.includes(day)) {
      currentDays = currentDays.filter(d => d !== day);
      const newTimings = { ...dayTimings };
      delete newTimings[day];
      setDayTimings(newTimings);
    } else {
      currentDays.push(day);
      setDayTimings(prev => ({
        ...prev,
        [day]: {
          morning: formData.morningShiftTime || (formData.vehicleTypeSelection === 'Milk' ? '05:00 AM' : '09:00 AM'),
          evening: formData.eveningShiftTime || (formData.vehicleTypeSelection === 'Milk' ? '05:00 PM' : '06:00 PM'),
          workingTime: formData.workingTime || '09:00 AM - 06:00 PM'
        }
      }));
    }
    updateFormData('daysAvailable', currentDays.sort((a, b) => {
      const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return order.indexOf(a) - order.indexOf(b);
    }).join(', '));
  };

  const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const selectAllDays = () => {
    const allSelected = ALL_DAYS.every(d => (formData.daysAvailable || '').includes(d));
    if (allSelected) {
      // Deselect all
      updateFormData('daysAvailable', '');
      setDayTimings({});
    } else {
      // Select all — add timings for any newly selected days
      const newTimings = { ...dayTimings };
      ALL_DAYS.forEach(day => {
        if (!newTimings[day]) {
          newTimings[day] = {
            morning: formData.morningShiftTime || (formData.vehicleTypeSelection === 'Milk' ? '05:00 AM' : '09:00 AM'),
            evening: formData.eveningShiftTime || (formData.vehicleTypeSelection === 'Milk' ? '05:00 PM' : '06:00 PM'),
            workingTime: formData.workingTime || '09:00 AM - 06:00 PM',
          };
        }
      });
      setDayTimings(newTimings);
      updateFormData('daysAvailable', ALL_DAYS.join(', '));
    }
  };

  const toggleArea = (area: string) => {
    if (!area.trim()) return;
    let currentAreas = formData.operatingArea ? formData.operatingArea.split(', ') : [];
    if (currentAreas.includes(area.trim())) {
      currentAreas = currentAreas.filter(a => a !== area.trim());
    } else {
      currentAreas.push(area.trim());
    }
    updateFormData('operatingArea', currentAreas.join(', '));
  };

  const handleIfscChange = async (val: string) => {
    const code = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);

    // Reset bank details if IFSC changes
    setFormData(prev => ({
      ...prev,
      ifscCode: code,
      bankName: '',
      branchName: ''
    }));

    if (code.length === 11) {
      try {
        const response = await fetch(`https://ifsc.razorpay.com/${code}`);
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({
            ...prev,
            bankName: data.BANK ? data.BANK.replace(/[^a-zA-Z\s]/g, '') : '',
            branchName: data.BRANCH ? data.BRANCH.replace(/[^a-zA-Z\s]/g, '') : '',
            ifscCode: code
          }));
        }
      } catch (error) {
        console.log('IFSC Fetch Error:', error);
      }
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = selectedDate.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      updateFormData('licenseExpiry', formattedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
  };

  const confirmCustomTime = (formattedTime: string) => {
    if (editingDay) {
      setDayTimings(prev => ({
        ...prev,
        [editingDay]: {
          ...prev[editingDay],
          [editingTimeMode as 'morning' | 'evening']: formattedTime
        }
      }));
      setEditingDay(null);
    } else {
      if (timeMode === 'morning') {
        updateFormData('morningShiftTime', formattedTime);
        // Propagate to all days as default
        setDayTimings(prev => {
          const newTimings = { ...prev };
          Object.keys(newTimings).forEach(day => {
            newTimings[day] = { ...newTimings[day], morning: formattedTime };
          });
          return newTimings;
        });
      } else {
        updateFormData('eveningShiftTime', formattedTime);
        // Propagate to all days as default
        setDayTimings(prev => {
          const newTimings = { ...prev };
          Object.keys(newTimings).forEach(day => {
            newTimings[day] = { ...newTimings[day], evening: formattedTime };
          });
          return newTimings;
        });
      }
    }
    setShowTimePicker(false);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    if (apiError) {
      setApiError(null);
    }
    const numericValue = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = numericValue;
    setOtp(newOtp);

    if (numericValue.length !== 0 && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const resumeRegistration = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/registration/me');
      const data = response.data;

      const newFormData: any = { ...formData };

      if (data.personalDetails) {
        newFormData.firstName = data.personalDetails.firstName;
        newFormData.lastName = data.personalDetails.lastName;
        newFormData.email = data.personalDetails.email || '';
        newFormData.state = data.personalDetails.state || '';
        newFormData.district = data.personalDetails.district || '';
        newFormData.taluka = data.personalDetails.taluka || '';
        newFormData.village = data.personalDetails.village || '';
        newFormData.address = data.personalDetails.residentialAddress;
        newFormData.pincode = data.personalDetails.pinCode;
        newFormData.profilePhoto = data.personalDetails.profilePhoto;
        lastFetchedPincodeRef.current = data.personalDetails.pinCode || '';
      }

      if (data.drivingDetails) {
        newFormData.licenseNumber = data.drivingDetails.licenseNumber || '';
        newFormData.licensePhoto = data.drivingDetails.licensePhoto || '';
        const expVal = data.drivingDetails.experienceYears ?? data.drivingDetails.drivingExperience ?? '';
        newFormData.experience = expVal.toString();
        // Format ISO date back to DD/MM/YYYY
        if (data.drivingDetails.expiryDate) {
          const d = new Date(data.drivingDetails.expiryDate);
          const day = d.getDate().toString().padStart(2, '0');
          const month = (d.getMonth() + 1).toString().padStart(2, '0');
          const year = d.getFullYear();
          newFormData.licenseExpiry = `${day}/${month}/${year}`;
        }
      }

      if (data.bankDetails) {
        newFormData.accountHolderName = data.bankDetails.accountHolderName;
        newFormData.bankName = data.bankDetails.bankName;
        newFormData.accountNumber = data.bankDetails.accountNumber;
        newFormData.ifscCode = data.bankDetails.ifscCode;
        newFormData.branchName = data.bankDetails.branchName || '';
        newFormData.upiId = data.bankDetails.upiId || '';
      }

      if (data.vehicleCategory) {
        newFormData.vehicleTypeSelection = data.vehicleCategory === 'MILK_VAN' ? 'Milk' : 'Personal';
      }

      if (data.milkVanDetails) {
        newFormData.milkSangathanName = data.milkVanDetails.sangathanName;
        newFormData.milkCenterName = data.milkVanDetails.centerName;
      }

      if (data.vehicleDetails) {
        newFormData.vehicleWheeler = data.vehicleDetails.wheeler;
        newFormData.vehicleType = data.vehicleDetails.type;
        newFormData.vehicleMake = data.vehicleDetails.make;
        newFormData.vehicleNumber = data.vehicleDetails.number;
        newFormData.rcPhoto = data.vehicleDetails.rcUpload;
        newFormData.insurancePhoto = data.vehicleDetails.insuranceUpload;
      }

      if (data.routeDetails) {
        newFormData.operatingArea = data.routeDetails.operatingArea;
        newFormData.pickupLocations = data.routeDetails.pickupLocations || '';
        newFormData.dropLocations = data.routeDetails.dropLocations || '';
        newFormData.workingTime = data.routeDetails.workingTime || '';
        if (data.routeDetails.workingDays) {
          newFormData.daysAvailable = Array.isArray(data.routeDetails.workingDays)
            ? data.routeDetails.workingDays.join(', ')
            : '';
        }
        if (Array.isArray(data.routeDetails.workingSchedule)) {
          const savedTimings: any = {};
          data.routeDetails.workingSchedule.forEach((item: any) => {
            if (item && item.day) {
              savedTimings[item.day] = {
                morning: item.startTime || '09:00 AM',
                evening: item.endTime || '06:00 PM',
              };
            }
          });
          setDayTimings(savedTimings);
        }
      }

      if (data.milkVanRoute) {
        newFormData.assignedVillages = data.milkVanRoute.assignedVillages || [];
        newFormData.morningShiftTime = data.milkVanRoute.morningShiftTime;
        newFormData.eveningShiftTime = data.milkVanRoute.eveningShiftTime;
        newFormData.daysAvailable = data.milkVanRoute.daysAvailable || '';
        
        // Rehydrate dayTimings from workingSchedule JSON
        if (Array.isArray(data.milkVanRoute.workingSchedule)) {
          const savedTimings: any = {};
          data.milkVanRoute.workingSchedule.forEach((item: any) => {
            if (item && item.day) {
              savedTimings[item.day] = {
                morning: item.startTime || data.milkVanRoute.morningShiftTime,
                evening: item.endTime || data.milkVanRoute.eveningShiftTime,
              };
            }
          });
          setDayTimings(savedTimings);
        } else if (Array.isArray(data.milkVanRoute.workingDays)) {
          const savedTimings: any = {};
          data.milkVanRoute.workingDays.forEach((item: any) => {
            if (item && item.day) {
              savedTimings[item.day] = {
                morning: item.morning || item.startTime || data.milkVanRoute.morningShiftTime,
                evening: item.evening || item.endTime || data.milkVanRoute.eveningShiftTime,
              };
            }
          });
          setDayTimings(savedTimings);
        }
      }

      setFormData(newFormData);

    } catch (error) {
      console.error('Resume registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (apiError) {
      setApiError(null);
    }
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleSendOTP = async () => {
    if (!/^[6789]\d{9}$/.test(formData.mobile)) {
      setApiError(t('errors.mobile_invalid'));
      return;
    }

    setIsLoading(true);
    setApiError(null);
    try {
      await api.post('/registration/send-otp', {
        mobileNumber: formData.mobile,
        language: i18n.language === 'en' ? 'English' : i18n.language === 'hi' ? 'Hindi' : 'Marathi',
      });
      setOtpSent(true);
      setTimer(30);
    } catch (error: any) {
      console.log('Send OTP error:', error);
      const message = error.response?.data?.message || 'Failed to send OTP. Please try again.';
      let displayMessage = Array.isArray(message) ? message[0] : message;
      const lowerMessage = displayMessage.toLowerCase();
      if (
        lowerMessage.includes('already registered') || 
        lowerMessage.includes('already rgistered') ||
        lowerMessage.includes('already register')
      ) {
        displayMessage = t('errors.already_registered', { defaultValue: 'This number is already registered enter new number' });
      }
      setApiError(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) return;

    setIsLoading(true);
    setApiError(null);
    try {
      const response = await api.post('/registration/verify-otp', {
        mobileNumber: formData.mobile,
        otp: otpCode,
      });

      const { accessToken, user } = response.data;
      await AsyncStorage.setItem('access_token', accessToken);
      await AsyncStorage.setItem('user_phone_number', formData.mobile);

      setIsOtpVerified(true);
      if (user && user.currentStep > 1) {
        setCurrentStep(user.currentStep);
        await resumeRegistration();
      }
    } catch (error: any) {
      console.log('Verify OTP error:', error);
      const message = error.response?.data?.message || 'Invalid OTP. Please try again.';
      const displayMessage = Array.isArray(message) ? message[0] : message;
      setApiError(displayMessage);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputs.current[0]?.focus();
      }, 100);
      Alert.alert('Error', displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (otpSent) {
      setTimeout(() => {
        otpInputs.current[0]?.focus();
      }, 300);
    }
  }, [otpSent]);

  useEffect(() => {
    // Scroll to top on step change
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });

    // Focus first field of each step
    const focusTimeout = setTimeout(() => {
      if (currentStep === 1) {
        if (!otpSent) {
          mobileInputRef.current?.focus();
        } else if (isOtpVerified) {
          firstNameRef.current?.focus();
        }
      } else if (currentStep === 2) {
        licenseRef.current?.focus();
      } else if (currentStep === 3) {
        accountHolderRef.current?.focus();
      } else if (currentStep === 5) {
        if (formData.vehicleTypeSelection === 'Milk') {
          sangathanRef.current?.focus();
        } else {
          vehicleWheelerRef.current?.focus();
        }
      } else if (currentStep === 6) {
        if (formData.vehicleTypeSelection === 'Milk') {
          // villageInput doesn't use a ref right now
        } else {
          operatingAreaRef.current?.focus();
        }
      } else if (currentStep === 7) {
        vehicleWheelerRef.current?.focus();
      }
    }, 800);

    return () => clearTimeout(focusTimeout);
  }, [currentStep, otpSent, isOtpVerified]);

  useEffect(() => {
    if (currentStep === 5 && formData.vehicleTypeSelection === 'Milk') {
      fetchSangathans();
    }
  }, [currentStep, formData.vehicleTypeSelection]);

  useEffect(() => {
    const fetchPincodeDetails = async () => {
      const pin = formData.pincode;
      if (pin && pin.length === 6) {
        try {
          setIsLoading(true);
          const response = await api.get(`/registration/pincode/${pin}`);
          if (response.data && response.data.success) {
            const { state, district, taluka } = response.data;
            const pincodeChanged = lastFetchedPincodeRef.current !== '' && lastFetchedPincodeRef.current !== pin;
            setFormData(prev => ({
              ...prev,
              state: state || prev.state,
              district: district || prev.district,
              taluka: taluka || prev.taluka,
              ...(pincodeChanged ? { village: '' } : {}),
            }));
            setTouchedFields(prev => ({
              ...prev,
              state: false,
              district: false,
              taluka: false,
              village: false,
              postOffice: false,
            }));
            lastFetchedPincodeRef.current = pin;
          }
          const villagesResponse = await api.get(`/registration/pincode/${pin}/villages`);
          if (villagesResponse.data) {
            setResidentialVillages(villagesResponse.data);
            const pOffices = Array.from(new Set(villagesResponse.data.map((v: any) => v.postOffice).filter(Boolean))) as string[];
            setPostOffices(pOffices);
            setFormData(prev => {
              const villageNames = Array.from(new Set(villagesResponse.data.map((v: any) => typeof v === 'string' ? v : v.name))) as string[];
              const pincodeChanged = lastFetchedPincodeRef.current !== '' && lastFetchedPincodeRef.current !== pin;
              let nextVillage = prev.village;
              let nextPostOffice = prev.postOffice;
              if (pincodeChanged) {
                nextVillage = '';
                nextPostOffice = '';
              } else {
                if (prev.village && !villageNames.includes(prev.village)) {
                  nextVillage = '';
                }
                if (prev.postOffice && !pOffices.includes(prev.postOffice)) {
                  nextPostOffice = '';
                }
              }
              if (!nextVillage && villageNames.length === 1) {
                nextVillage = villageNames[0];
              }
              if (!nextPostOffice && pOffices.length === 1) {
                nextPostOffice = pOffices[0];
              }
              return { ...prev, village: nextVillage, postOffice: nextPostOffice };
            });
          }
        } catch (error) {
          console.log('Pincode fetch error:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResidentialVillages([]);
        setPostOffices([]);
        setFormData(prev => ({ ...prev, village: '', postOffice: '' }));
        lastFetchedPincodeRef.current = '';
      }
    };
    fetchPincodeDetails();
  }, [formData.pincode]);

  useEffect(() => {
    const fetchVillages = async () => {
      const pin = villagePincode;
      if (pin && pin.length === 6) {
        try {
          setIsLoading(true);
          const response = await api.get(`/registration/pincode/${pin}/villages`);
          if (response.data) {
            const mapped = response.data.map((v: any) => {
              if (typeof v === 'string') return v;
              return v.name;
            });
            setPincodeVillages(Array.from(new Set(mapped)));
          }
        } catch (error) {
          console.log('Fetch villages error:', error);
          setPincodeVillages([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setPincodeVillages([]);
      }
    };
    fetchVillages();
  }, [villagePincode]);

  const fetchSangathans = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/registration/milk-sangathans');
      setSangathans(response.data);
    } catch (error: any) {
      console.error('Fetch Sangathans error:', error);
      Alert.alert('Error', 'Failed to fetch Milk Sangathans');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCenters = async (sangathanName: string) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/registration/milk-centers/${encodeURIComponent(sangathanName)}`);
      setCenters(response.data);
    } catch (error: any) {
      console.error('Fetch Centers error:', error);
      Alert.alert('Error', 'Failed to fetch Milk Centers');
    } finally {
      setIsLoading(false);
    }
  };

  const performSave = async (step: number, data: FormData, timings: any) => {
    if (step === 1) {
      let photoUrl = data.profilePhoto;
      if (photoUrl && !photoUrl.startsWith('/uploads/')) {
        const uploadRes = await uploadFile(photoUrl);
        photoUrl = uploadRes.data.url;
        updateFormData('profilePhoto', photoUrl);
      }
      return await api.post('/registration/step1', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        state: data.state,
        district: data.district,
        taluka: data.taluka,
        village: data.village,
        postOffice: data.postOffice,
        residentialAddress: data.address,
        pinCode: data.pincode,
        profilePhoto: photoUrl,
      });
    } else if (step === 2) {
      let photoUrl = data.licensePhoto;
      if (photoUrl && !photoUrl.startsWith('/uploads/')) {
        const uploadRes = await uploadFile(photoUrl);
        photoUrl = uploadRes.data.url;
        updateFormData('licensePhoto', photoUrl);
      }
      const [day, month, year] = data.licenseExpiry.split('/');
      const formattedDate = `${year}-${month}-${day}`;
      return await api.post('/registration/step2', {
        licenseNumber: data.licenseNumber,
        licensePhoto: photoUrl,
        expiryDate: formattedDate,
        experienceYears: parseInt(data.experience),
      });
    } else if (step === 3) {
      return await api.post('/registration/step3', {
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        branchName: data.branchName || undefined,
        upiId: data.upiId || undefined,
      });
    } else if (step === 4) {
      return await api.post('/registration/step4', {
        vehicleCategory: data.vehicleTypeSelection === 'Milk' ? 'MILK_VAN' : 'PERSONAL',
      });
    } else if (step === 5) {
      if (data.vehicleTypeSelection === 'Milk') {
        return await api.post('/registration/step5-milk-van', {
          sangathanName: data.milkSangathanName,
          centerName: data.milkCenterName,
        });
      } else {
        let rcUrl = data.rcPhoto;
        let insUrl = data.insurancePhoto;
        const uploadPromises = [];
        let rcIndex = -1;
        let insIndex = -1;

        if (rcUrl && !rcUrl.startsWith('/uploads/')) {
          uploadPromises.push(uploadFile(rcUrl));
          rcIndex = uploadPromises.length - 1;
        }
        if (insUrl && !insUrl.startsWith('/uploads/')) {
          uploadPromises.push(uploadFile(insUrl));
          insIndex = uploadPromises.length - 1;
        }

        if (uploadPromises.length > 0) {
          const results = await Promise.all(uploadPromises);
          if (rcIndex !== -1) {
            rcUrl = results[rcIndex].data.url;
            updateFormData('rcPhoto', rcUrl);
          }
          if (insIndex !== -1) {
            insUrl = results[insIndex].data.url;
            updateFormData('insurancePhoto', insUrl);
          }
        }
        return await api.post('/registration/step5-personal', {
          wheeler: data.vehicleWheeler,
          type: data.vehicleType,
          make: data.vehicleMake,
          number: data.vehicleNumber,
          rcUpload: rcUrl,
          insuranceUpload: insUrl,
          minWeight: data.minWeight ? Number(data.minWeight) : undefined,
          maxWeight: data.maxWeight ? Number(data.maxWeight) : undefined,
        });
      }
    } else if (step === 6) {
      const scheduleArray = Object.keys(timings).map(day => ({
        day,
        startTime: timings[day].morning,
        endTime: timings[day].evening,
      }));

      if (data.vehicleTypeSelection === 'Milk') {
        return await api.post('/registration/step6-milk-van', {
          assignedVillages: data.assignedVillages,
          morningShiftTime: data.morningShiftTime,
          eveningShiftTime: data.eveningShiftTime,
          daysAvailable: data.daysAvailable,
          workingDays: data.daysAvailable ? data.daysAvailable.split(', ') : [],
          workingSchedule: scheduleArray,
        });
      } else {
        return await api.post('/registration/step6-personal', {
          operatingArea: data.operatingArea,
          pickupLocations: data.pickupLocations || undefined,
          dropLocations: data.dropLocations || undefined,
          workingTime: data.workingTime || undefined,
          workingDays: data.daysAvailable ? data.daysAvailable.split(', ') : [],
          workingSchedule: scheduleArray,
        });
      }
    } else if (step === 7) {
      let rcUrl = data.rcPhoto;
      let insUrl = data.insurancePhoto;
      const uploadPromises = [];
      let rcIndex = -1;
      let insIndex = -1;

      if (rcUrl && !rcUrl.startsWith('/uploads/')) {
        uploadPromises.push(uploadFile(rcUrl));
        rcIndex = uploadPromises.length - 1;
      }
      if (insUrl && !insUrl.startsWith('/uploads/')) {
        uploadPromises.push(uploadFile(insUrl));
        insIndex = uploadPromises.length - 1;
      }

      if (uploadPromises.length > 0) {
        const results = await Promise.all(uploadPromises);
        if (rcIndex !== -1) {
          rcUrl = results[rcIndex].data.url;
          updateFormData('rcPhoto', rcUrl);
        }
        if (insIndex !== -1) {
          insUrl = results[insIndex].data.url;
          updateFormData('insurancePhoto', insUrl);
        }
      }
      return await api.post('/registration/step7-milk-van', {
        wheeler: data.vehicleWheeler,
        type: data.vehicleType,
        make: data.vehicleMake,
        number: data.vehicleNumber,
        rcUpload: rcUrl,
        insuranceUpload: insUrl,
        minWeight: data.minWeight ? Number(data.minWeight) : undefined,
        maxWeight: data.maxWeight ? Number(data.maxWeight) : undefined,
      });
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    if (currentStep === 1) {
      if (!isOtpVerified) {
        if (!otpSent) {
          if (!/^[6789]\d{9}$/.test(formData.mobile)) {
            setTouchedFields((prev) => ({ ...prev, mobile: true }));
            return;
          }
          await handleSendOTP();
        } else {
          if (otp.join('').length < 6) return;
          await handleVerifyOTP();
        }
        return;
      }
      fieldsToValidate = ['firstName', 'lastName', 'state', 'district', 'taluka', 'village', 'address', 'pincode', 'profilePhoto'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['licenseNumber', 'licensePhoto', 'licenseExpiry', 'experience'];
    } else if (currentStep === 3) {
      fieldsToValidate = ['accountHolderName', 'bankName', 'accountNumber', 'ifscCode'];
    } else if (currentStep === 4) {
      fieldsToValidate = ['vehicleTypeSelection'];
    } else if (currentStep === 5) {
      if (formData.vehicleTypeSelection === 'Milk') {
        fieldsToValidate = ['milkSangathanName', 'milkCenterName'];
      } else {
        fieldsToValidate = ['vehicleWheeler', 'vehicleType', 'vehicleMake', 'minWeight', 'maxWeight', 'vehicleNumber', 'rcPhoto', 'insurancePhoto'];
      }
    } else if (currentStep === 6) {
      if (formData.vehicleTypeSelection === 'Milk') {
        fieldsToValidate = ['assignedVillages', 'morningShiftTime', 'eveningShiftTime', 'daysAvailable'];
      } else {
        fieldsToValidate = ['operatingArea', 'daysAvailable'];
      }
    } else if (currentStep === 7) {
      fieldsToValidate = ['vehicleWheeler', 'vehicleType', 'vehicleMake', 'minWeight', 'maxWeight', 'vehicleNumber', 'rcPhoto', 'insurancePhoto'];
    }

    const stepErrors = fieldsToValidate.filter((f) => getError(f, true) || !formData[f]);
    if (stepErrors.length > 0) {
      const newTouched = { ...touchedFields };
      fieldsToValidate.forEach((f) => {
        newTouched[f] = true;
      });
      setTouchedFields(newTouched);
      
      // Auto-scroll and focus the first invalid field
      const firstErrorField = stepErrors[0];
      scrollToAndFocusField(firstErrorField);
      return;
    }

    const maxSteps = formData.vehicleTypeSelection === 'Milk' ? 7 : 6;
    const isLast = currentStep === maxSteps;

    if (!isLast) {
      // Transition UI to next step immediately
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTouchedFields({});
      setCurrentStep(currentStep + 1);

      // Start save task in background
      const stepToSave = currentStep;
      const dataSnapshot = { ...formData };
      const timingsSnapshot = { ...dayTimings };

      activeSavePromise.current = (async () => {
        // Wait for any previous background saving to complete
        await activeSavePromise.current;
        try {
          await performSave(stepToSave, dataSnapshot, timingsSnapshot);
        } catch (error: any) {
          console.error(`Step ${stepToSave} background save failed:`, error);
          if (error.response) {
            console.error(`Step ${stepToSave} background save failure details:`, JSON.stringify(error.response.data));
          }
          const errorData = error.response?.data;
          const message = errorData?.message || 'Failed to save details in background. Returning to step ' + stepToSave;
          Alert.alert('Error', Array.isArray(message) ? message[0] : message);
          // Revert back to the step that failed
          setCurrentStep(stepToSave);
          throw error;
        }
      })();
    } else {
      // If it is the last step, wait for all saving to finish and submit the final step
      setIsLoading(true);
      setApiError(null);
      try {
        await activeSavePromise.current;
        const finalRes = await performSave(currentStep, formData, dayTimings);

        const uniqueId = finalRes?.data?.transporterUniqueId;
        const reqId = finalRes?.data?.requestId;
        
        try {
          await AsyncStorage.removeItem('HAS_COMPLETED_ONBOARDING');
          await AsyncStorage.setItem('IS_FIRST_TIME_REGISTER', 'true');
        } catch (storageErr) {
          console.warn('Failed to set onboarding registration state during signup:', storageErr);
        }

        navigation.navigate('ApprovalPending', {
          transporterUniqueId: uniqueId,
          requestId: reqId,
        });
      } catch (error: any) {
        console.error(`Final step save failed:`, error);
        if (error.response) {
          console.error(`Final step save failure details:`, JSON.stringify(error.response.data));
        }
        const errorData = error.response?.data;
        const message = errorData?.message || 'Something went wrong. Please try again.';
        const field = errorData?.field;

        setApiError(Array.isArray(message) ? message[0] : message);
        if (field) {
          setTouchedFields(prev => ({ ...prev, [field]: true }));
          scrollToAndFocusField(field as keyof FormData);
        } else {
          Alert.alert('Error', Array.isArray(message) ? message[0] : message);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const isStepValid = () => {
    let fields: (keyof FormData)[] = [];
    if (currentStep === 1) {
      if (!isOtpVerified) return false;
      fields = ['firstName', 'lastName', 'state', 'district', 'taluka', 'village', 'address', 'pincode', 'profilePhoto'];
    } else if (currentStep === 2) {
      fields = ['licenseNumber', 'licenseExpiry', 'experience'];
      if (!formData.licensePhoto) return false;
    } else if (currentStep === 3) {
      fields = ['accountHolderName', 'accountNumber', 'ifscCode', 'bankName'];
    } else if (currentStep === 4) {
      return !!formData.vehicleTypeSelection;
    } else if (currentStep === 5) {
      if (formData.vehicleTypeSelection === 'Milk') {
        fields = ['milkSangathanName', 'milkCenterName'];
      } else {
        fields = ['vehicleWheeler', 'vehicleType', 'vehicleMake', 'minWeight', 'maxWeight', 'vehicleNumber'];
        if (!formData.rcPhoto || !formData.insurancePhoto) return false;
      }
    } else if (currentStep === 6) {
      if (formData.vehicleTypeSelection === 'Milk') {
        fields = ['assignedVillages', 'morningShiftTime', 'eveningShiftTime', 'daysAvailable'];
      } else {
        fields = ['operatingArea', 'daysAvailable'];
      }
    } else if (currentStep === 7) {
      fields = ['vehicleWheeler', 'vehicleType', 'vehicleMake', 'minWeight', 'maxWeight', 'vehicleNumber'];
      if (!formData.rcPhoto || !formData.insurancePhoto) return false;
    }

    return fields.every(f => !!formData[f] && !getError(f, true));
  };

  const prevStep = () => {
    if (currentStep === 1) {
      if (isOtpVerified) {
        setIsOtpVerified(false);
        setOtp(['', '', '', '', '', '']);
      } else if (otpSent) {
        setOtpSent(false);
        setOtp(['', '', '', '', '', '']);
      } else {
        navigation.goBack();
      }
      return;
    }

    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };


  const renderStep1 = () => {
    if (!isOtpVerified) {
      return (
        <View style={styles.stepContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{otpSent ? t('signup.verify_otp') : t('signup.verify_mobile')}</Text>
            <Text style={styles.subtitle}>
              {otpSent
                ? t('signup.enter_otp_desc', { mobile: formData.mobile })
                : t('signup.enter_mobile_desc')}
            </Text>
          </View>

          {!otpSent ? (
            <View style={[styles.inputContainer, { marginBottom: verticalScale(24) }]}>
              <Text style={styles.label}>{t('login.mobile_label')}</Text>
              <View style={[styles.mobileInputWrapper, (getError('mobile') || apiError) && styles.inputError]}>
                <Text style={styles.prefix}>+91</Text>
                <TextInput
                  ref={mobileInputRef}
                  style={styles.mobileInput}
                  placeholder={t('signup.enter_your', { field: t('login.mobile_label') })}
                  placeholderTextColor={Colors.textPlaceholder}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={formData.mobile}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9]/g, '');
                    updateFormData('mobile', cleaned);
                    setApiError(null);
                    if (cleaned.length === 0) {
                      setTouchedFields(prev => ({ ...prev, mobile: true }));
                    } else if (cleaned.length > 0 && !/^[6789]/.test(cleaned)) {
                      setTouchedFields(prev => ({ ...prev, mobile: true }));
                    }
                    if (cleaned.length === 10) {
                      Keyboard.dismiss();
                    }
                  }}
                  onBlur={() => handleBlur('mobile')}
                />
              </View>
              {(getError('mobile') || apiError) && <Text style={styles.errorText}>{getError('mobile') || apiError}</Text>}
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('login.enter_otp_label')}</Text>
              <View style={[styles.otpRow, apiError ? { marginBottom: verticalScale(16) } : null]}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { otpInputs.current[index] = ref; }}
                    style={[
                      styles.otpBox,
                      apiError ? styles.otpBoxError : null
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(val) => handleOtpChange(val, index)}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  />
                ))}
              </View>
              {apiError && (
                <Text style={[styles.errorText, { marginBottom: verticalScale(16), textAlign: 'center' }]}>
                  {apiError}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, (!otpSent ? !/^[6789]\d{9}$/.test(formData.mobile) : otp.join('').length < 6) && styles.primaryButtonDisabled]}
            onPress={nextStep}
            disabled={!otpSent ? !/^[6789]\d{9}$/.test(formData.mobile) : otp.join('').length < 6}
          >
            {isLoading ? renderProcessing() : (
              <Text style={styles.primaryButtonText}>
                {otpSent ? t('login.verify_otp') : t('login.get_otp')}
              </Text>
            )}
          </TouchableOpacity>

          {otpSent && (
            <View style={styles.otpLinks}>
              <TouchableOpacity disabled={timer > 0} onPress={handleSendOTP}>
                <Text style={[styles.linkText, timer > 0 && { color: Colors.textPlaceholder }]}>
                  {timer > 0 ? t('login.resend_in', { timer: formatTimer(timer) }) : "Resend OTP"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setOtpSent(false);
                setOtp(['', '', '', '', '', '']);
              }}>
                <Text style={styles.linkText}>{t('login.change_mobile')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    // After OTP verified, show rest of Step 1
    const totalSteps = formData.vehicleTypeSelection === 'Milk' ? 7 : 6;

    return (
      <View style={styles.stepContent}>
        <View style={styles.header}>
          <Text style={styles.stepBadge}>{t('signup.step_label', { step: 1, total: totalSteps })}</Text>
          <Text style={styles.title}>{t('signup.personal_details')}</Text>
          <Text style={styles.subtitle}>{t('signup.personal_desc')}</Text>
        </View>

        {/* Profile Photo Upload */}
        <View 
          style={styles.profileUploadContainer}
          onLayout={(e) => { fieldPositions.current['profilePhoto'] = e.nativeEvent.layout.y; }}
        >
          <TouchableOpacity
            style={[styles.profileUploadCircle, formData.profilePhoto && styles.profileUploadCircleActive]}
            onPress={() => pickImage('profile')}
            activeOpacity={0.8}
          >
            {formData.profilePhoto ? (
              <Image source={{ uri: resolveImageUri(formData.profilePhoto) }} style={styles.profilePreview} />
            ) : (
              <View style={styles.profileUploadPlaceholder}>
                <Camera size={scale(32)} color={Colors.primary} />
              </View>
            )}
            <View style={styles.profileEditBadge}>
              {formData.profilePhoto ? <CheckCircle2 size={14} color="#FFFFFF" /> : <Upload size={14} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.profileUploadLabel}>{t('signup.profile_photo')} *</Text>
          <Text style={styles.profileUploadHint}>{t('signup.profile_photo_hint')}</Text>
          {touchedFields.profilePhoto && !formData.profilePhoto && (
            <Text style={[styles.errorText, { textAlign: 'center', marginTop: verticalScale(8), fontWeight: '700' }]}>
              {t('errors.profile_photo_required')}
            </Text>
          )}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['firstName'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.first_name')} *</Text>
          <View style={[styles.inputWrapper, getError('firstName') && styles.inputError]}>
            <User size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={firstNameRef}
              style={styles.input}
              placeholder={t('signup.enter_your', { field: t('signup.first_name') })}
              placeholderTextColor={Colors.textPlaceholder}
              value={formData.firstName}
              onChangeText={(val) => updateFormData('firstName', val.replace(/[^a-zA-Z\s]/g, ''))}
              onFocus={() => {
                autoScroll(250);
              }}
              onBlur={() => handleBlur('firstName')}
              onSubmitEditing={() => lastNameRef.current?.focus()}
              returnKeyType="next"
            />
          </View>
          {getError('firstName') && <Text style={styles.errorText}>{getError('firstName')}</Text>}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['lastName'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.last_name')} *</Text>
          <View style={[styles.inputWrapper, getError('lastName') && styles.inputError]}>
            <User size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={lastNameRef}
              style={styles.input}
              placeholder={t('signup.enter_your', { field: t('signup.last_name') })}
              placeholderTextColor={Colors.textPlaceholder}
              value={formData.lastName}
              onChangeText={(val) => updateFormData('lastName', val.replace(/[^a-zA-Z\s]/g, ''))}
              onFocus={() => autoScroll(350)}
              onBlur={() => handleBlur('lastName')}
              onSubmitEditing={() => emailRef.current?.focus()}
              returnKeyType="next"
            />
          </View>
          {getError('lastName') && <Text style={styles.errorText}>{getError('lastName')}</Text>}
        </View>



        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['email'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.email')} ({t('signup.optional')})</Text>
          <View style={[styles.inputWrapper, getError('email') && styles.inputError]}>
            <Mail size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={emailRef}
              style={styles.input}
              placeholder={t('signup.enter_your', { field: t('signup.email') })}
              placeholderTextColor={Colors.textPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(val) => updateFormData('email', val)}
              onFocus={() => autoScroll(450)}
              onBlur={() => handleBlur('email')}
              onSubmitEditing={() => pincodeRef.current?.focus()}
              returnKeyType="next"
            />
          </View>
          {getError('email') && <Text style={styles.errorText}>{getError('email')}</Text>}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['pincode'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.pincode')} *</Text>
          <View style={[styles.inputWrapper, getError('pincode') && styles.inputError]}>
            <Hash size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={pincodeRef}
              style={styles.input}
              placeholder={t('signup.enter_your', { field: t('signup.pincode') })}
              placeholderTextColor={Colors.textPlaceholder}
              keyboardType="number-pad"
              maxLength={6}
              value={formData.pincode}
              onChangeText={(val) => updateFormData('pincode', val.replace(/[^0-9]/g, ''))}
              onFocus={() => autoScroll(475)}
              onBlur={() => handleBlur('pincode')}
              onSubmitEditing={() => stateRef.current?.focus()}
              returnKeyType="next"
            />
          </View>
          {getError('pincode') && <Text style={styles.errorText}>{getError('pincode')}</Text>}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['state'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.state')} *</Text>
          <View style={[styles.inputWrapper, getError('state') && styles.inputError]}>
            <MapIcon size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={stateRef}
              style={styles.input}
              placeholder={t('signup.enter_state')}
              placeholderTextColor={Colors.textPlaceholder}
              value={formData.state}
              onChangeText={(val) => {
                const cleaned = val.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ');
                updateFormData('state', cleaned);
              }}
              onFocus={() => {
                const yOffset = fieldPositions.current['state'];
                if (yOffset !== undefined) {
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: yOffset - verticalScale(40), animated: true }), 100);
                } else {
                  autoScroll(600);
                }
              }}
              onBlur={() => {
                updateFormData('state', formData.state.trim());
                handleBlur('state');
              }}
              onSubmitEditing={() => districtRef.current?.focus()}
              returnKeyType="next"
            />
          </View>
          {getError('state') && <Text style={styles.errorText}>{getError('state')}</Text>}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['district'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.district')} *</Text>
          <View style={[styles.inputWrapper, getError('district') && styles.inputError]}>
            <Navigation size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={districtRef}
              style={styles.input}
              placeholder={t('signup.enter_district')}
              placeholderTextColor={Colors.textPlaceholder}
              value={formData.district}
              onChangeText={(val) => {
                const cleaned = val.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ');
                updateFormData('district', cleaned);
              }}
              onFocus={() => {
                const yOffset = fieldPositions.current['district'];
                if (yOffset !== undefined) {
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: yOffset - verticalScale(40), animated: true }), 100);
                } else {
                  autoScroll(650);
                }
              }}
              onBlur={() => {
                updateFormData('district', formData.district.trim());
                handleBlur('district');
              }}
              onSubmitEditing={() => talukaRef.current?.focus()}
              returnKeyType="next"
            />
          </View>
          {getError('district') && <Text style={styles.errorText}>{getError('district')}</Text>}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['taluka'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.taluka')} *</Text>
          <View style={[styles.inputWrapper, getError('taluka') && styles.inputError]}>
            <Building2 size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={talukaRef}
              style={styles.input}
              placeholder={t('signup.enter_taluka')}
              placeholderTextColor={Colors.textPlaceholder}
              value={formData.taluka}
              onChangeText={(val) => {
                const cleaned = val.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ');
                updateFormData('taluka', cleaned);
              }}
              onFocus={() => {
                const yOffset = fieldPositions.current['taluka'];
                if (yOffset !== undefined) {
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: yOffset - verticalScale(40), animated: true }), 100);
                } else {
                  autoScroll(750);
                }
              }}
              onBlur={() => {
                updateFormData('taluka', formData.taluka.trim());
                handleBlur('taluka');
              }}
              onSubmitEditing={() => addressRef.current?.focus()}
              returnKeyType="next"
            />
          </View>
          {getError('taluka') && <Text style={styles.errorText}>{getError('taluka')}</Text>}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['village'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.village')} *</Text>
          <TouchableOpacity
            style={[
              styles.inputWrapper,
              (!formData.pincode || formData.pincode.length < 6 || residentialVillages.length === 0) && { backgroundColor: '#F3F4F6', opacity: 0.7 },
              getError('village') && styles.inputError
            ]}
            onPress={() => {
              if (formData.pincode && formData.pincode.length === 6) {
                if (residentialVillages.length > 0) {
                  setDropdownType('residential_village');
                  setShowDropdown(true);
                } else {
                  Alert.alert(t('common.info', { defaultValue: 'Info' }), t('errors.no_villages_found', { defaultValue: 'No villages found for this pincode' }));
                }
              } else {
                Alert.alert(t('common.info', { defaultValue: 'Info' }), t('errors.enter_pincode_first', { defaultValue: 'Please enter a 6-digit pincode first' }));
              }
            }}
            activeOpacity={(formData.pincode && formData.pincode.length === 6 && residentialVillages.length > 0) ? 0.7 : 1}
          >
            <MapIcon size={scale(20)} color={(formData.pincode && formData.pincode.length === 6 && residentialVillages.length > 0) ? Colors.iconSecondary : Colors.textPlaceholder} style={styles.inputIcon} />
            <Text style={[
              styles.input,
              { 
                color: formData.village ? Colors.textPrimary : Colors.textPlaceholder, 
                textAlignVertical: 'center', 
                lineHeight: verticalScale(52) 
              }
            ]}>
              {formData.village || (
                formData.pincode.length < 6
                  ? t('signup.enter_pincode_first', { defaultValue: 'Enter 6-digit pincode to load villages' })
                  : residentialVillages.length === 0
                    ? t('signup.no_villages_found', { defaultValue: 'No villages found for this pincode' })
                    : t('signup.select_village', { defaultValue: 'Select Village' })
              )}
            </Text>
            <ChevronDown size={20} color={Colors.iconSecondary} />
          </TouchableOpacity>
          {getError('village') && <Text style={styles.errorText}>{getError('village')}</Text>}
        </View>



        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['address'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.residential_address')} *</Text>
          <View style={[styles.inputWrapper, { height: verticalScale(100), alignItems: 'flex-start', paddingTop: verticalScale(16) }, getError('address') && styles.inputError]}>
            <MapPin size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={addressRef}
              style={[styles.input, { textAlignVertical: 'top', height: '100%', paddingTop: 0, marginTop: Platform.OS === 'ios' ? 0 : -verticalScale(2) }]}
              placeholder={t('signup.enter_your', { field: t('signup.residential_address') })}
              placeholderTextColor={Colors.textPlaceholder}
              multiline
              value={formData.address}
              onChangeText={(val) => updateFormData('address', val)}
              onFocus={() => {
                const yOffset = fieldPositions.current['address'];
                if (yOffset !== undefined) {
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: yOffset - verticalScale(40), animated: true }), 100);
                } else {
                  autoScroll(850);
                }
              }}
              onBlur={() => handleBlur('address')}
              onSubmitEditing={() => Keyboard.dismiss()}
              returnKeyType="done"
            />
          </View>
          {getError('address') && <Text style={styles.errorText}>{getError('address')}</Text>}
        </View>


        <TouchableOpacity
          style={styles.primaryButton}
          onPress={nextStep}
        >
          <Text style={styles.primaryButtonText}>{t('signup.next_step')}</Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep2 = () => {
    const totalSteps = formData.vehicleTypeSelection === 'Milk' ? 7 : 6;
    return (
      <View style={styles.stepContent}>
        <View style={styles.header}>
          <Text style={styles.stepBadge}>{t('signup.step_label', { step: 2, total: totalSteps })}</Text>
          <Text style={styles.title}>{t('signup.driving_details')}</Text>
          <Text style={styles.subtitle}>{t('signup.driving_desc')}</Text>
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['licenseNumber'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.license_number')} *</Text>
          <View style={[styles.inputWrapper, getError('licenseNumber') && styles.inputError]}>
            <CreditCard size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={licenseRef}
              style={styles.input}
              placeholder={t('signup.enter_your', { field: t('signup.license_number') })}
              placeholderTextColor={Colors.textPlaceholder}
              autoCapitalize="characters"
              maxLength={15}
              value={formData.licenseNumber}
              onChangeText={(val) => updateFormData('licenseNumber', formatLicenseNumber(val))}
              onFocus={() => {
                const yOffset = fieldPositions.current['licenseNumber'];
                if (yOffset !== undefined) {
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: yOffset - verticalScale(40), animated: true }), 100);
                } else {
                  autoScroll(200);
                }
              }}
              onBlur={() => handleBlur('licenseNumber')}
              onSubmitEditing={() => {
                licenseExpiryRef.current?.focus();
              }}
              returnKeyType="next"
            />
          </View>
          {getError('licenseNumber') && <Text style={styles.errorText}>{getError('licenseNumber')}</Text>}
        </View>

        <View 
          style={styles.uploadSection}
          onLayout={(e) => { fieldPositions.current['licensePhoto'] = e.nativeEvent.layout.y; }}
        >
          <Text style={[styles.label, { marginBottom: 0 }]}>{t('signup.license_photo')} *</Text>
          <TouchableOpacity
            style={[styles.uploadBox, formData.licensePhoto && styles.uploadBoxActive, touchedFields.licensePhoto && !formData.licensePhoto && styles.uploadBoxError]}
            onPress={() => {
              pickImage('license');
            }}
          >
            <View style={styles.uploadIconWrapper}>
              {formData.licensePhoto ? (
                <Image source={{ uri: resolveImageUri(formData.licensePhoto) }} style={styles.uploadPreview} />
              ) : (
                <Upload size={24} color={Colors.primary} />
              )}
            </View>
            <View style={styles.uploadInfo}>
              <Text style={styles.uploadTitle}>{t('signup.license_photo')} *</Text>
              <Text style={styles.uploadSubtitle}>
                {formData.licensePhoto ? t('signup.uploaded') : t('signup.tap_to_upload')}
              </Text>
            </View>
            {formData.licensePhoto && <CheckCircle2 size={20} color={Colors.success} />}
          </TouchableOpacity>
          {touchedFields.licensePhoto && !formData.licensePhoto && (
            <Text style={styles.errorText}>{t('errors.license_photo_required')}</Text>
          )}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['licenseExpiry'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.expiry_date')} *</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <View pointerEvents="none" style={[styles.inputWrapper, touchedFields.licenseExpiry && !formData.licenseExpiry && styles.inputError]}>
              <Calendar size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={formData.licenseExpiry}
                placeholder={t('signup.enter_your', { field: t('signup.expiry_date') })}
                placeholderTextColor={Colors.textPlaceholder}
                editable={false}
              />
              <ChevronDown size={20} color={Colors.primary} style={{ marginLeft: scale(10) }} />
            </View>
          </TouchableOpacity>
          {showDatePicker && (
            Platform.OS === 'ios' ? (
              <Modal transparent visible={showDatePicker} animationType="slide">
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                  <View style={{ backgroundColor: '#FFFFFF', paddingBottom: verticalScale(20), borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={{ color: '#666', fontFamily: Fonts.medium }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={{ color: Colors.primary, fontFamily: Fonts.bold }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={formData.licenseExpiry ? new Date(formData.licenseExpiry.split('/').reverse().join('-')) : new Date()}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      minimumDate={new Date()}
                      textColor="#000000"
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={formData.licenseExpiry ? new Date(formData.licenseExpiry.split('/').reverse().join('-')) : new Date()}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )
          )}
          {touchedFields.licenseExpiry && !formData.licenseExpiry && (
            <Text style={styles.errorText}>{t('errors.license_expiry_required')}</Text>
          )}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['experience'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.driving_experience')} *</Text>
          <View style={[styles.inputWrapper, getError('experience') && styles.inputError]}>
            <Award size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={experienceRef}
              style={styles.input}
              placeholder={t('signup.enter_your', { field: t('signup.driving_experience') })}
              placeholderTextColor={Colors.textPlaceholder}
              keyboardType="number-pad"
              maxLength={2}
              value={formData.experience}
              onChangeText={(val) => updateFormData('experience', val.replace(/[^0-9]/g, ''))}
              onFocus={() => {
                const yOffset = fieldPositions.current['experience'];
                if (yOffset !== undefined) {
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: yOffset - verticalScale(40), animated: true }), 100);
                } else {
                  autoScroll(450);
                }
              }}
              onBlur={() => handleBlur('experience')}
              onSubmitEditing={() => Keyboard.dismiss()}
              returnKeyType="done"
            />
          </View>
          {getError('experience') && <Text style={styles.errorText}>{getError('experience')}</Text>}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={nextStep}
        >
          <Text style={styles.primaryButtonText}>{t('signup.next_step')}</Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };



  const renderStep3 = () => {
    return (
      <View key="step3" style={styles.stepContent}>
        <View style={styles.header}>
          <Text style={styles.stepBadge}>{t('signup.step_label', { step: 3, total: formData.vehicleTypeSelection === 'Milk' ? 7 : 6 })}</Text>
          <Text style={styles.title}>{t('signup.bank_details')}</Text>
          <Text style={styles.subtitle}>{t('signup.bank_desc')}</Text>
        </View>

        {/* 1. Account Holder Name */}
        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['accountHolderName'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.account_holder')} *</Text>
          <View style={[styles.inputWrapper, getError('accountHolderName') && styles.inputError]}>
            <User size={scale(20)} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={accountHolderRef}
              style={styles.input}
              placeholder={t('signup.account_holder_placeholder')}
              placeholderTextColor={Colors.textPlaceholder}
              value={formData.accountHolderName}
              onChangeText={(val) => updateFormData('accountHolderName', val.replace(/[^a-zA-Z\s]/g, ''))}
              onFocus={() => {
                const yOffset = fieldPositions.current['accountHolderName'];
                if (yOffset !== undefined) {
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: yOffset - verticalScale(40), animated: true }), 100);
                } else {
                  autoScroll(100);
                }
              }}
              onBlur={() => handleBlur('accountHolderName')}
              onSubmitEditing={() => accountNumberRef.current?.focus()}
              returnKeyType="next"
              autoCapitalize="words"
            />
          </View>
          {getError('accountHolderName') && <Text style={styles.errorText}>{getError('accountHolderName')}</Text>}
        </View>

        {/* 2. Account Number */}
        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['accountNumber'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.account_number')} *</Text>
          <View style={[styles.inputWrapper, getError('accountNumber') && styles.inputError]}>
            <CreditCard size={scale(20)} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={accountNumberRef}
              style={styles.input}
              placeholder={t('signup.enter_your', { field: t('signup.account_number') })}
              placeholderTextColor={Colors.textPlaceholder}
              keyboardType="number-pad"
              value={formData.accountNumber}
              onChangeText={(val) => updateFormData('accountNumber', val.replace(/[^0-9]/g, ''))}
              onFocus={() => {
                const yOffset = fieldPositions.current['accountNumber'];
                if (yOffset !== undefined) {
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: yOffset - verticalScale(40), animated: true }), 100);
                } else {
                  autoScroll(200);
                }
              }}
              onBlur={() => handleBlur('accountNumber')}
              onSubmitEditing={() => ifscCodeRef.current?.focus()}
              returnKeyType="next"
              maxLength={20}
            />
          </View>
          {formData.accountNumber.length === 20 && (
            <Text style={styles.errorText}>
              {t('signup.account_max_20', 'Account number must contain a maximum of 20 digits')}
            </Text>
          )}
          {getError('accountNumber') && <Text style={styles.errorText}>{getError('accountNumber')}</Text>}
        </View>

        {/* 3. IFSC Code - Now 3rd for auto-fetch */}
        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['ifscCode'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.ifsc_code')} *</Text>
          <View style={[styles.inputWrapper, getError('ifscCode') && styles.inputError]}>
            <Hash size={scale(20)} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={ifscCodeRef}
              style={styles.input}
              placeholder={t('signup.ifsc_placeholder')}
              placeholderTextColor={Colors.textPlaceholder}
              autoCapitalize="characters"
              maxLength={11}
              value={formData.ifscCode}
              onChangeText={handleIfscChange}
              onFocus={() => {
                const yOffset = fieldPositions.current['ifscCode'];
                if (yOffset !== undefined) {
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: yOffset - verticalScale(40), animated: true }), 100);
                } else {
                  autoScroll(300);
                }
              }}
              onBlur={() => handleBlur('ifscCode')}
              onSubmitEditing={() => Keyboard.dismiss()}
              returnKeyType="done"
            />
          </View>
          {getError('ifscCode') && <Text style={styles.errorText}>{getError('ifscCode')}</Text>}
        </View>

        {/* 4. Bank Name - Auto-filled by IFSC */}
        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['bankName'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.bank_name')} *</Text>
          <View style={styles.inputWrapper}>
            <Building2 size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={bankNameRef}
              style={styles.input}
              placeholder={t('signup.bank_name')}
              placeholderTextColor={Colors.textPlaceholder}
              value={formData.bankName}
              editable={formData.ifscCode.length === 11}
              onChangeText={(val) => updateFormData('bankName', val.replace(/[^a-zA-Z\s]/g, ''))}
              onFocus={() => {
                const yOffset = fieldPositions.current['bankName'];
                if (yOffset !== undefined) {
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: yOffset - verticalScale(40), animated: true }), 100);
                } else {
                  autoScroll(400);
                }
              }}
            />
          </View>
          {getError('bankName') && <Text style={styles.errorText}>{getError('bankName')}</Text>}
        </View>

        {/* 5. Branch Name - Auto-filled by IFSC */}
        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['branchName'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.branch_name')}</Text>
          <View style={styles.inputWrapper}>
            <MapPin size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={branchNameRef}
              style={styles.input}
              placeholder={t('signup.branch_name_placeholder')}
              placeholderTextColor={Colors.textPlaceholder}
              value={formData.branchName}
              editable={formData.ifscCode.length === 11}
              onChangeText={(val) => updateFormData('branchName', val.replace(/[^a-zA-Z\s]/g, ''))}
              onFocus={() => {
                const yOffset = fieldPositions.current['branchName'];
                if (yOffset !== undefined) {
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: yOffset - verticalScale(40), animated: true }), 100);
                } else {
                  autoScroll(500);
                }
              }}
            />
          </View>
        </View>



        <TouchableOpacity
          style={styles.primaryButton}
          onPress={nextStep}
        >
          <Text style={styles.primaryButtonText}>{t('signup.next_step')}</Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };


  const renderStep4 = () => {
    return (
      <View 
        style={styles.stepContent}
        onLayout={(e) => { fieldPositions.current['vehicleTypeSelection'] = e.nativeEvent.layout.y; }}
      >
        <View style={styles.header}>
          <Text style={styles.stepBadge}>{t('signup.step_label', { step: 4, total: formData.vehicleTypeSelection === 'Milk' ? 7 : 6 })}</Text>
          <Text style={styles.title}>{t('signup.vehicle_category')}</Text>
          <Text style={styles.subtitle}>{t('signup.vehicle_category_desc')}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.selectionCard,
            formData.vehicleTypeSelection === 'Milk' && styles.selectionCardActive
          ]}
          onPress={() => handleVehicleTypeSelection('Milk')}
        >
          <View style={[styles.selectionIconWrapper, formData.vehicleTypeSelection === 'Milk' && styles.selectionIconWrapperActive]}>
            <Truck size={scale(24)} color={formData.vehicleTypeSelection === 'Milk' ? '#FFFFFF' : Colors.primary} />
          </View>
          <View style={styles.selectionTextContent}>
            <Text style={[styles.selectionTitle, formData.vehicleTypeSelection === 'Milk' && styles.selectionTitleActive]}>
              {t('signup.milk_van')}
            </Text>
            <Text style={styles.selectionDesc}>{t('signup.milk_van_desc')}</Text>
          </View>
          {formData.vehicleTypeSelection === 'Milk' && (
            <CheckCircle2 size={20} color={Colors.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectionCard,
            formData.vehicleTypeSelection === 'Personal' && styles.selectionCardActive
          ]}
          onPress={() => handleVehicleTypeSelection('Personal')}
        >
          <View style={[styles.selectionIconWrapper, formData.vehicleTypeSelection === 'Personal' && styles.selectionIconWrapperActive]}>
            <User size={scale(24)} color={formData.vehicleTypeSelection === 'Personal' ? '#FFFFFF' : Colors.primary} />
          </View>
          <View style={styles.selectionTextContent}>
            <Text style={[styles.selectionTitle, formData.vehicleTypeSelection === 'Personal' && styles.selectionTitleActive]}>
              {t('signup.personal_vehicle')}
            </Text>
            <Text style={styles.selectionDesc}>{t('signup.personal_vehicle_desc')}</Text>
          </View>
          {formData.vehicleTypeSelection === 'Personal' && (
            <CheckCircle2 size={20} color={Colors.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={nextStep}
        >
          <Text style={styles.primaryButtonText}>{t('signup.next_step')}</Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderDropdownModal = () => {
    let options: string[] = [];
    let title = '';
    let key: keyof FormData | 'selectedVillage' | 'replace_assigned_village' = 'vehicleWheeler';

    if (dropdownType === 'wheeler') {
      options = ['2 Wheeler', '3 Wheeler', '4 Wheeler', '6 Wheeler', '8 Wheeler', '10 Wheeler', '12 Wheeler', '14 Wheeler', '16 Wheeler', '18 Wheeler', '22 Wheeler'];
      title = t('signup.select_wheeler');
      key = 'vehicleWheeler';
    } else if (dropdownType === 'type') {
      const wheeler = formData.vehicleWheeler;
      if (wheeler === '2 Wheeler') {
        options = ['Bike', 'Scooter', 'Moped', 'Electric Bike', 'Others'];
      } else if (wheeler === '3 Wheeler') {
        options = ['Auto Rickshaw', 'Mini Van', 'Loading Auto', 'Open Cargo', 'Electric Loader', 'Others'];
      } else if (wheeler === '4 Wheeler') {
        options = ['Mini Truck', 'Pickup', 'Tempo Traveler', 'Refrigerated Van', 'Open Body Truck', 'Closed Container', 'Others'];
      } else {
        // 6 Wheeler and above
        options = ['Open Truck', 'Closed Container', 'Trailer', 'Tanker', 'Tipper', 'Heavy Duty Truck', 'Flatbed', 'Others'];
      }
      title = t('signup.select_vehicle_type');
      key = 'vehicleType';
    } else if (dropdownType === 'make') {
      const wheeler = formData.vehicleWheeler;
      if (wheeler === '2 Wheeler') {
        options = ['Hero', 'Honda', 'TVS', 'Bajaj', 'Yamaha', 'Royal Enfield', 'Suzuki', 'Ola Electric', 'Others'];
      } else if (wheeler === '3 Wheeler') {
        options = ['Piaggio', 'Mahindra', 'Bajaj', 'Atul', 'Lohia', 'TVS', 'Others'];
      } else if (wheeler === '4 Wheeler') {
        options = ['Tata', 'Mahindra', 'Ashok Leyland', 'Eicher', 'Force', 'Isuzu', 'SML Isuzu', 'Maruti Suzuki', 'Others'];
      } else {
        // 6 Wheeler and above
        options = ['Tata', 'Ashok Leyland', 'Eicher', 'BharatBenz', 'Mahindra', 'Volvo', 'Scania', 'AMW', 'Others'];
      }
      title = t('signup.select_vehicle_make');
      key = 'vehicleMake';
    } else if (dropdownType === 'sangathan') {
      options = sangathans;
      title = t('signup.sangathan_name');
      key = 'milkSangathanName';
    } else if (dropdownType === 'milkCenter') {
      options = centers;
      title = t('signup.milk_center_name');
      key = 'milkCenterName';
    } else if (dropdownType === 'village') {
      options = pincodeVillages;
      title = t('signup.select_village', { defaultValue: 'Select Village' });
      key = 'selectedVillage';
    } else if (dropdownType === 'residential_village') {
      options = Array.from(new Set(residentialVillages.map(v => v.name)));
      title = t('signup.select_village', { defaultValue: 'Select Village' });
      key = 'village';
    } else if (dropdownType === 'replace_assigned_village') {
      options = pincodeVillages.filter(v => !formData.assignedVillages.includes(v) || (editingVillageIndex !== null && formData.assignedVillages[editingVillageIndex] === v));
      title = t('signup.replace_village', { defaultValue: 'Replace Village' });
      key = 'replace_assigned_village';
    } else if (dropdownType === 'replace_operating_area') {
      const currentAreas = formData.operatingArea ? formData.operatingArea.split(', ') : [];
      options = pincodeVillages.filter(v => !currentAreas.includes(v) || (editingVillageIndex !== null && currentAreas[editingVillageIndex] === v));
      title = t('signup.replace_village', { defaultValue: 'Replace Village' });
      key = 'replace_assigned_village';
    }

    return (
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowDropdown(false); setEditingVillageIndex(null); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setShowDropdown(false); setEditingVillageIndex(null); }}
        >
          <View style={styles.dropdownContent}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>{title}</Text>
              <TouchableOpacity onPress={() => { setShowDropdown(false); setEditingVillageIndex(null); }}>
                <X size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
              {options.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  {isLoading ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    <Text style={{ color: Colors.textPlaceholder }}>No options available</Text>
                  )}
                </View>
              ) : options.map((option, index) => {
                const isOptionActive = key === 'selectedVillage'
                  ? (formData.vehicleTypeSelection === 'Milk'
                    ? formData.assignedVillages.includes(option)
                    : (formData.operatingArea ? formData.operatingArea.split(', ').map(s => s.trim()).includes(option.trim()) : false))
                  : key === 'replace_assigned_village'
                    ? (editingVillageIndex !== null && (
                      formData.vehicleTypeSelection === 'Milk'
                        ? formData.assignedVillages[editingVillageIndex] === option
                        : (formData.operatingArea ? formData.operatingArea.split(', ')[editingVillageIndex] === option : false)
                    ))
                    : formData[key as keyof FormData] === option;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dropdownOption,
                      isOptionActive && styles.dropdownOptionActive,
                      index === options.length - 1 && { borderBottomWidth: 0 }
                    ]}
                    onPress={() => {
                      if (key === 'replace_assigned_village') {
                        if (editingVillageIndex !== null) {
                          if (formData.vehicleTypeSelection === 'Milk') {
                            const updated = [...formData.assignedVillages];
                            updated[editingVillageIndex] = option;
                            updateFormData('assignedVillages', updated);
                          } else {
                            const currentAreas = formData.operatingArea ? formData.operatingArea.split(', ') : [];
                            currentAreas[editingVillageIndex] = option;
                            updateFormData('operatingArea', currentAreas.filter(Boolean).join(', '));
                          }
                          setEditingVillageIndex(null);
                        }
                        setShowDropdown(false);
                      } else if (key === 'vehicleWheeler') {
                        setIsCustomVehicleType(false);
                        setIsCustomVehicleMake(false);
                        setFormData(prev => ({
                          ...prev,
                          vehicleWheeler: option,
                          vehicleType: '',
                          vehicleMake: ''
                        }));
                      } else if (key === 'milkSangathanName') {
                        setFormData(prev => ({
                          ...prev,
                          milkSangathanName: option,
                          milkCenterName: ''
                        }));
                        fetchCenters(option);
                      } else if (key === 'selectedVillage') {
                        if (formData.vehicleTypeSelection === 'Milk') {
                          if (formData.assignedVillages.includes(option)) {
                            updateFormData('assignedVillages', formData.assignedVillages.filter(v => v !== option));
                          } else {
                            updateFormData('assignedVillages', [...formData.assignedVillages, option]);
                          }
                        } else {
                          toggleArea(option);
                        }
                        setApiError(null);
                      } else {
                        if (key === 'village') {
                          const selectedObj = residentialVillages.find(v => v.name === option);
                          if (selectedObj) {
                            setFormData(prev => ({
                              ...prev,
                              village: option,
                              taluka: selectedObj.taluka || prev.taluka,
                            }));
                          } else {
                            updateFormData(key as keyof FormData, option);
                          }
                        } else {
                          if (key === 'vehicleType') {
                            if (option === 'Others') {
                              setIsCustomVehicleType(true);
                              updateFormData('vehicleType', '');
                            } else {
                              setIsCustomVehicleType(false);
                              updateFormData('vehicleType', option);
                            }
                          } else if (key === 'vehicleMake') {
                            if (option === 'Others') {
                              setIsCustomVehicleMake(true);
                              updateFormData('vehicleMake', '');
                            } else {
                              setIsCustomVehicleMake(false);
                              updateFormData('vehicleMake', option);
                            }
                          } else {
                            updateFormData(key as keyof FormData, option);
                          }
                        }
                      }
                      if (key !== 'selectedVillage') {
                        setShowDropdown(false);
                      }
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      isOptionActive && styles.dropdownOptionTextActive
                    ]}>
                      {option}
                    </Text>
                    {isOptionActive && (
                      <CheckCircle2 size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderVehicleDetailsStep = () => {
    return (
      <View key="vehicle-details" style={styles.stepContent}>
        <View style={styles.header}>
          <Text style={styles.stepBadge}>
            {t("signup.step_label", {
              step: formData.vehicleTypeSelection === "Milk" ? 7 : 5,
              total: formData.vehicleTypeSelection === "Milk" ? 7 : 6
            })}
          </Text>
          <Text style={styles.title}>{t("signup.vehicle_details")}</Text>
          <Text style={styles.subtitle}>{t("signup.vehicle_details_desc")}</Text>
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['vehicleWheeler'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t("signup.vehicle_wheeler")} *</Text>
          <TouchableOpacity
            style={styles.inputWrapper}
            onPress={() => {
              setDropdownType("wheeler");
              setShowDropdown(true);
            }}
          >
            <Truck size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
            <Text style={[styles.input, { color: formData.vehicleWheeler ? "#181D27" : Colors.textPlaceholder, textAlignVertical: "center", lineHeight: verticalScale(52) }]}>
              {formData.vehicleWheeler || t("signup.select_wheeler")}
            </Text>
            <ChevronDown size={20} color={Colors.iconSecondary} />
          </TouchableOpacity>
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['vehicleType'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t("signup.vehicle_type")} *</Text>
          {isCustomVehicleType ? (
            <View style={[styles.inputWrapper, getError('vehicleType') && styles.inputError]}>
              <Truck size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={t("signup.custom_vehicle_type_placeholder", { defaultValue: 'Enter custom vehicle type' })}
                placeholderTextColor={Colors.textPlaceholder}
                value={formData.vehicleType}
                onChangeText={(val) => updateFormData("vehicleType", val)}
                onBlur={() => handleBlur("vehicleType")}
                autoFocus
              />
              <TouchableOpacity 
                style={{ padding: scale(4), marginRight: scale(4) }} 
                onPress={() => {
                  setIsCustomVehicleType(false);
                  updateFormData('vehicleType', '');
                }}
              >
                <X size={18} color={Colors.iconSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.inputWrapper, getError('vehicleType') && styles.inputError]}
              onPress={() => {
                if (!formData.vehicleWheeler) {
                  alert(t('errors.select_wheeler_first'));
                  return;
                }
                setDropdownType("type");
                setShowDropdown(true);
              }}
            >
              <Truck size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
              <Text style={[styles.input, { color: formData.vehicleType ? "#181D27" : Colors.textPlaceholder, textAlignVertical: "center", lineHeight: verticalScale(52) }]}>
                {formData.vehicleType || t("signup.select_vehicle_type")}
              </Text>
              <ChevronDown size={20} color={Colors.iconSecondary} />
            </TouchableOpacity>
          )}
          {getError('vehicleType') && <Text style={styles.errorText}>{getError('vehicleType')}</Text>}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['vehicleMake'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t("signup.vehicle_make")} *</Text>
          {isCustomVehicleMake ? (
            <View style={[styles.inputWrapper, getError('vehicleMake') && styles.inputError]}>
              <Building2 size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={t("signup.custom_vehicle_make_placeholder", { defaultValue: 'Enter custom vehicle make' })}
                placeholderTextColor={Colors.textPlaceholder}
                value={formData.vehicleMake}
                onChangeText={(val) => updateFormData("vehicleMake", val)}
                onBlur={() => handleBlur("vehicleMake")}
                autoFocus
              />
              <TouchableOpacity 
                style={{ padding: scale(4), marginRight: scale(4) }} 
                onPress={() => {
                  setIsCustomVehicleMake(false);
                  updateFormData('vehicleMake', '');
                }}
              >
                <X size={18} color={Colors.iconSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.inputWrapper, getError('vehicleMake') && styles.inputError]}
              onPress={() => {
                if (!formData.vehicleWheeler) {
                  alert(t('errors.select_wheeler_first'));
                  return;
                }
                setDropdownType("make");
                setShowDropdown(true);
              }}
            >
              <Building2 size={20} color={Colors.iconSecondary} style={styles.inputIcon} />
              <Text style={[styles.input, { color: formData.vehicleMake ? "#181D27" : Colors.textPlaceholder, textAlignVertical: "center", lineHeight: verticalScale(52) }]}>
                {formData.vehicleMake || t("signup.select_vehicle_make")}
              </Text>
              <ChevronDown size={20} color={Colors.iconSecondary} />
            </TouchableOpacity>
          )}
          {getError('vehicleMake') && <Text style={styles.errorText}>{getError('vehicleMake')}</Text>}
        </View>

        <View style={{ flexDirection: 'row', gap: scale(12), marginBottom: verticalScale(12) }}>
          <View 
            style={{ flex: 1 }}
            onLayout={(e) => { fieldPositions.current['minWeight'] = e.nativeEvent.layout.y; }}
          >
            <Text style={styles.label}>{t("signup.min_weight", { defaultValue: 'Min Weight (kg)' })} *</Text>
            <View style={[styles.inputWrapper, getError('minWeight') && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder={t("signup.min_weight_placeholder", { defaultValue: 'e.g. 500' })}
                placeholderTextColor={Colors.textPlaceholder}
                keyboardType="numeric"
                value={formData.minWeight}
                onChangeText={(val) => updateFormData("minWeight", val.replace(/[^0-9]/g, ''))}
                onBlur={() => handleBlur("minWeight")}
              />
            </View>
            {getError('minWeight') && <Text style={styles.errorText}>{getError('minWeight')}</Text>}
          </View>

          <View 
            style={{ flex: 1 }}
            onLayout={(e) => { fieldPositions.current['maxWeight'] = e.nativeEvent.layout.y; }}
          >
            <Text style={styles.label}>{t("signup.max_weight", { defaultValue: 'Max Weight (kg)' })} *</Text>
            <View style={[styles.inputWrapper, getError('maxWeight') && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder={t("signup.max_weight_placeholder", { defaultValue: 'e.g. 2000' })}
                placeholderTextColor={Colors.textPlaceholder}
                keyboardType="numeric"
                value={formData.maxWeight}
                onChangeText={(val) => updateFormData("maxWeight", val.replace(/[^0-9]/g, ''))}
                onBlur={() => handleBlur("maxWeight")}
              />
            </View>
            {getError('maxWeight') && <Text style={styles.errorText}>{getError('maxWeight')}</Text>}
          </View>
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['vehicleNumber'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t("signup.vehicle_number")} *</Text>
          <View style={[styles.inputWrapper, getError('vehicleNumber') && styles.inputError]}>
            <Truck size={scale(20)} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              ref={vehicleNumberRef}
              style={styles.input}
              placeholder={t("signup.vehicle_number_placeholder")}
              placeholderTextColor={Colors.textPlaceholder}
              autoCapitalize="characters"
              maxLength={13}
              value={formData.vehicleNumber}
              onChangeText={(val) => updateFormData("vehicleNumber", formatVehicleNumber(val))}
              onFocus={() => {
                handleReach("rcPhoto");
                autoScroll(450);
              }}
              onBlur={() => handleBlur("vehicleNumber")}
              onSubmitEditing={() => Keyboard.dismiss()}
              returnKeyType="done"
            />
          </View>
          {getError('vehicleNumber') && <Text style={styles.errorText}>{getError('vehicleNumber')}</Text>}
        </View>

        <View 
          style={styles.uploadSection}
          onLayout={(e) => { fieldPositions.current['rcPhoto'] = e.nativeEvent.layout.y; }}
        >
          <TouchableOpacity
            style={[styles.uploadBox, formData.rcPhoto && styles.uploadBoxActive]}
            onPress={() => pickImage("rc")}
            activeOpacity={0.7}
          >
            <View style={styles.uploadIconWrapper}>
              {formData.rcPhoto ? (
                <Image source={{ uri: resolveImageUri(formData.rcPhoto) }} style={styles.uploadPreview} />
              ) : (
                <Upload size={24} color={Colors.primary} />
              )}
            </View>
            <View style={styles.uploadInfo}>
              <Text style={styles.uploadTitle}>{t("signup.rc_upload")} *</Text>
              <Text style={styles.uploadSubtitle}>{formData.rcPhoto ? t("signup.photo_selected") : t("signup.tap_to_upload")}</Text>
            </View>
            {formData.rcPhoto && <CheckCircle2 size={20} color={Colors.success} />}
          </TouchableOpacity>


          <TouchableOpacity
            style={[styles.uploadBox, formData.insurancePhoto && styles.uploadBoxActive]}
            onLayout={(e) => { fieldPositions.current['insurancePhoto'] = e.nativeEvent.layout.y; }}
            onPress={() => pickImage("insurance")}
            activeOpacity={0.7}
          >
            <View style={styles.uploadIconWrapper}>
              {formData.insurancePhoto ? (
                <Image source={{ uri: resolveImageUri(formData.insurancePhoto) }} style={styles.uploadPreview} />
              ) : (
                <Upload size={24} color={Colors.primary} />
              )}
            </View>
            <View style={styles.uploadInfo}>
              <Text style={styles.uploadTitle}>{t("signup.insurance_upload")} *</Text>
              <Text style={styles.uploadSubtitle}>{formData.insurancePhoto ? t("signup.photo_selected") : t("signup.tap_to_upload")}</Text>
            </View>
            {formData.insurancePhoto && <CheckCircle2 size={20} color={Colors.success} />}
          </TouchableOpacity>

        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={nextStep}
        >
          <Text style={styles.primaryButtonText}>
            {(formData.vehicleTypeSelection === "Milk" && currentStep === 7)
              ? t("signup.complete_signup")
              : t("signup.next_step")}
          </Text>
          {(formData.vehicleTypeSelection === "Milk" && currentStep === 7) ? (
            <CheckCircle2 size={20} color="#FFFFFF" />
          ) : (
            <ChevronRight size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    );
  };


  const renderDayTimingEditor = () => {
    const selectedDays = formData.daysAvailable ? formData.daysAvailable.split(', ') : [];
    if (selectedDays.length === 0) return null;

    return (
      <View style={styles.perDayContainer}>
        <Text style={styles.subLabel}>{t('signup.customize_timings')}</Text>
        {selectedDays.map((day: string) => (
          <View key={day} style={styles.dayTimingRow}>
            <View style={styles.dayNameContainer}>
              <View style={styles.dayDot} />
              <Text style={styles.dayNameText}>{t(`days.${day}`)}</Text>
            </View>
            <View style={styles.timingControls}>
              {formData.vehicleTypeSelection === 'Milk' ? (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingDay(day);
                      setEditingTimeMode('morning');
                      setShowTimePicker(true);
                    }}
                    style={styles.timeMiniButton}
                  >
                    <Clock size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.timeMiniText}>{dayTimings[day]?.morning || '05:00 AM'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.timingSeparator}>-</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingDay(day);
                      setEditingTimeMode('evening');
                      setShowTimePicker(true);
                    }}
                    style={styles.timeMiniButton}
                  >
                    <Clock size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.timeMiniText}>{dayTimings[day]?.evening || '05:00 PM'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingDay(day);
                      setEditingTimeMode('morning');
                      setShowTimePicker(true);
                    }}
                    style={styles.timeMiniButton}
                  >
                    <Clock size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.timeMiniText}>{dayTimings[day]?.morning || '09:00 AM'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.timingSeparator}>-</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const current = dayTimings[day]?.evening || (formData.vehicleTypeSelection === 'Milk' ? '05:00 PM' : '06:00 PM');
                      const [time, ampm] = current.split(' ');
                      const [h, m] = time.split(':');
                      setCustomHour(h);
                      setCustomMinute(m);
                      setCustomAmPm(ampm);
                      setEditingDay(day);
                      setEditingTimeMode('evening');
                      setShowTimePicker(true);
                    }}
                    style={styles.timeMiniButton}
                  >
                    <Clock size={12} color={Colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.timeMiniText}>{dayTimings[day]?.evening || '06:00 PM'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderRouteDetailsPersonal = () => {
    return (
      <View style={styles.stepContent}>
        <View style={styles.header}>
          <Text style={styles.stepBadge}>{t('signup.step_label', { step: 6, total: 6 })}</Text>
          <Text style={styles.title}>{t('signup.route_details')}</Text>
          <Text style={styles.subtitle}>{t('signup.route_desc')}</Text>
        </View>
        {/* Pincode Input for Villages Search */}
        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['villagePincode'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.village_pincode', { defaultValue: 'Village Pincode' })}</Text>
          <View style={styles.inputWrapper}>
            <Hash size={scale(20)} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t('signup.enter_pincode_villages', { defaultValue: 'Enter Pincode to search Villages' })}
              placeholderTextColor={Colors.textPlaceholder}
              keyboardType="number-pad"
              maxLength={6}
              value={villagePincode}
              onChangeText={(val) => {
                setVillagePincode(val.replace(/[^0-9]/g, ''));
              }}
            />
            {isLoading && (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: scale(10) }} />
            )}
          </View>
        </View>

        {/* Dropdown for Villages fetched from Pincode */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('signup.select_village', { defaultValue: 'Select Village' })}</Text>
          <TouchableOpacity
            style={[
              styles.inputWrapper,
              (!villagePincode || villagePincode.length < 6 || pincodeVillages.length === 0) && { backgroundColor: '#F3F4F6', opacity: 0.7 }
            ]}
            onPress={() => {
              if (villagePincode && villagePincode.length === 6) {
                if (pincodeVillages.length > 0) {
                  setDropdownType('village');
                  setShowDropdown(true);
                } else {
                  Alert.alert(t('common.info', { defaultValue: 'Info' }), t('errors.no_villages_found', { defaultValue: 'No villages found for this pincode' }));
                }
              } else {
                Alert.alert(t('common.info', { defaultValue: 'Info' }), t('errors.enter_pincode_first', { defaultValue: 'Please enter a 6-digit pincode first' }));
              }
            }}
            activeOpacity={(villagePincode && villagePincode.length === 6 && pincodeVillages.length > 0) ? 0.7 : 1}
          >
            <MapIcon size={scale(20)} color={(villagePincode && villagePincode.length === 6 && pincodeVillages.length > 0) ? Colors.iconSecondary : Colors.textPlaceholder} style={styles.inputIcon} />
            <Text style={[
              styles.input,
              { 
                color: (villagePincode && villagePincode.length === 6 && pincodeVillages.length > 0) ? Colors.textPrimary : Colors.textPlaceholder, 
                textAlignVertical: 'center', 
                lineHeight: verticalScale(52) 
              }
            ]}>
              {isLoading 
                ? t('common.loading', { defaultValue: 'Loading villages...' }) 
                : villagePincode.length < 6 
                  ? t('signup.enter_pincode_first', { defaultValue: 'Enter 6-digit pincode to load villages' })
                  : pincodeVillages.length === 0 
                    ? t('signup.no_villages_found', { defaultValue: 'No villages found for this pincode' })
                    : t('signup.select_village_dropdown', { defaultValue: 'Select Village ({{count}} available)', count: pincodeVillages.length })
              }
            </Text>
            <ChevronDown size={20} color={Colors.iconSecondary} />
          </TouchableOpacity>
        </View>

        {/* Operating Area display box (showing selected villages in sequence timeline) */}
        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['operatingArea'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.operating_area_city')} *</Text>
          <View style={[
            {
              flexDirection: 'column',
              alignItems: 'stretch',
              borderWidth: moderateScale(1),
              borderColor: '#D0D5DD',
              borderRadius: moderateScale(14),
              backgroundColor: '#F9FAFB',
              paddingHorizontal: moderateScale(16),
              minHeight: verticalScale(56),
              paddingVertical: verticalScale(12),
            },
            getError('operatingArea') && styles.inputError
          ]}>
            {(!formData.operatingArea || formData.operatingArea.split(', ').filter(Boolean).length === 0) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MapIcon size={scale(20)} color={Colors.iconSecondary} style={styles.inputIcon} />
                <Text style={[styles.input, { color: Colors.textPlaceholder, textAlignVertical: 'center', lineHeight: verticalScale(38) }]}>
                  {t('signup.no_villages_assigned_placeholder', { defaultValue: 'Selected villages will appear here' })}
                </Text>
              </View>
            ) : (
              <View style={{ flex: 1, paddingVertical: verticalScale(2) }}>
                {formData.operatingArea.split(', ').filter(Boolean).map((area, index, arr) => {
                  const isLast = index === arr.length - 1;
                  return (
                    <View key={index} style={{ flexDirection: 'row', minHeight: verticalScale(36), alignItems: 'center', marginBottom: isLast ? 0 : verticalScale(6) }}>
                      {/* Timeline dot and connecting line */}
                      <View style={{ alignItems: 'center', justifyContent: 'center', width: scale(16), marginRight: scale(12), alignSelf: 'stretch' }}>
                        {/* Dot in the exact center */}
                        <View style={{
                          width: scale(8),
                          height: scale(8),
                          borderRadius: scale(4),
                          backgroundColor: Colors.primary,
                          zIndex: 2,
                        }} />

                        {/* Top connector line */}
                        {index > 0 && (
                          <View style={{
                            position: 'absolute',
                            top: 0,
                            bottom: '50%',
                            width: scale(2),
                            backgroundColor: Colors.primary + '50',
                            zIndex: 1,
                          }} />
                        )}

                        {/* Bottom connector line */}
                        {!isLast && (
                          <View style={{
                            position: 'absolute',
                            top: '50%',
                            bottom: -verticalScale(6),
                            width: scale(2),
                            backgroundColor: Colors.primary + '50',
                            zIndex: 1,
                          }} />
                        )}
                      </View>

                      {/* Content block: Village name and delete button */}
                      <View style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <TouchableOpacity
                          style={{ flex: 1, paddingVertical: verticalScale(2) }}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (villagePincode && villagePincode.length === 6) {
                              setEditingVillageIndex(index);
                              setDropdownType('replace_operating_area');
                              setShowDropdown(true);
                            } else {
                              Alert.alert(t('common.info', { defaultValue: 'Info' }), t('errors.enter_pincode_first', { defaultValue: 'Please enter a 6-digit pincode first' }));
                            }
                          }}
                        >
                          <Text style={{
                            fontFamily: Fonts.medium,
                            fontSize: moderateScale(15),
                            color: Colors.textPrimary,
                            textDecorationLine: 'underline',
                          }}>
                            {area}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            padding: scale(6),
                            borderRadius: moderateScale(8),
                            backgroundColor: '#FEE4E2',
                          }}
                          onPress={() => {
                            const updatedVillages = arr.filter((_, i) => i !== index);
                            updateFormData('operatingArea', updatedVillages.join(', '));
                          }}
                        >
                          <Trash2 size={scale(16)} color="#FDA29B" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          {getError('operatingArea') && <Text style={styles.errorText}>{getError('operatingArea')}</Text>}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['daysAvailable'] = e.nativeEvent.layout.y; }}
        >
          <View style={styles.labelRow}>
            <Text style={[styles.label, { marginBottom: 0 }]}>{t('signup.days_available')} *</Text>
            <TouchableOpacity onPress={selectAllDays} activeOpacity={0.7} style={styles.selectAllBtn}>
              {ALL_DAYS.every(d => (formData.daysAvailable || '').includes(d)) ? (
                <CheckSquare size={moderateScale(19)} color={Colors.primary} style={{ marginRight: scale(6) }} />
              ) : (
                <Square size={moderateScale(19)} color={Colors.primary} style={{ marginRight: scale(6) }} />
              )}
              <Text style={styles.selectAllBtnText}>
                {ALL_DAYS.every(d => (formData.daysAvailable || '').includes(d))
                  ? t('common.deselect_all')
                  : t('common.select_all')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.daysContainer}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
              const isSelected = (formData.daysAvailable || '').includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    isSelected && styles.dayChipActive
                  ]}
                  onPress={() => toggleDay(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayChipText,
                    isSelected && styles.dayChipTextActive
                  ]}>
                    {t(`days.${day}`)}
                  </Text>
                  {isSelected && (
                    <CheckCircle2 size={moderateScale(12)} color="#FFFFFF" style={styles.dayCheck} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {getError('daysAvailable') && <Text style={styles.errorText}>{getError('daysAvailable')}</Text>}
        </View>

        {renderDayTimingEditor()}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={nextStep}
        >
          <Text style={styles.primaryButtonText}>{t('signup.complete_signup')}</Text>
          <CheckCircle2 size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderMilkOrgDetails = () => {
    return (
      <View style={styles.stepContent}>
        <View style={styles.header}>
          <Text style={styles.stepBadge}>{t('signup.step_label', { step: 5, total: 7 })}</Text>
          <Text style={styles.title}>{t('signup.milk_org_details')}</Text>
          <Text style={styles.subtitle}>{t('signup.milk_org_desc')}</Text>
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['milkSangathanName'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.sangathan_name')} *</Text>
          <TouchableOpacity
            style={[styles.inputWrapper, getError('milkSangathanName') && styles.inputError]}
            onPress={() => {
              setDropdownType('sangathan');
              setShowDropdown(true);
            }}
            activeOpacity={0.7}
          >
            <Briefcase size={scale(20)} color={Colors.iconSecondary} style={styles.inputIcon} />
            <Text style={[
              styles.input,
              { color: formData.milkSangathanName ? Colors.textPrimary : Colors.textPlaceholder, textAlignVertical: 'center', lineHeight: verticalScale(52) }
            ]}>
              {formData.milkSangathanName || t('signup.enter_your', { field: t('signup.sangathan_name') })}
            </Text>
            <ChevronDown size={20} color={Colors.iconSecondary} />
          </TouchableOpacity>
          {getError('milkSangathanName') && <Text style={styles.errorText}>{getError('milkSangathanName')}</Text>}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['milkCenterName'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.milk_center_name')} *</Text>
          <TouchableOpacity
            style={[
              styles.inputWrapper,
              getError('milkCenterName') && styles.inputError,
              !formData.milkSangathanName && { backgroundColor: '#F3F4F6', opacity: 0.7 }
            ]}
            onPress={() => {
              if (formData.milkSangathanName) {
                setDropdownType('milkCenter');
                setShowDropdown(true);
              } else {
                alert(t('errors.select_sangathan_first'));
              }
            }}
            activeOpacity={formData.milkSangathanName ? 0.7 : 1}
          >
            <Building2 size={scale(20)} color={formData.milkSangathanName ? Colors.iconSecondary : Colors.textPlaceholder} style={styles.inputIcon} />
            <Text style={[
              styles.input,
              { color: formData.milkCenterName ? Colors.textPrimary : Colors.textPlaceholder, textAlignVertical: 'center', lineHeight: verticalScale(52) }
            ]}>
              {formData.milkCenterName || t('signup.enter_your', { field: t('signup.milk_center_name') })}
            </Text>
            <ChevronDown size={20} color={Colors.iconSecondary} />
          </TouchableOpacity>
          {getError('milkCenterName') && <Text style={styles.errorText}>{getError('milkCenterName')}</Text>}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={nextStep}
        >
          <Text style={styles.primaryButtonText}>{t('signup.next_step')}</Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderRouteDetailsMilk = () => {
    return (
      <View style={styles.stepContent}>
        <View style={styles.header}>
          <Text style={styles.stepBadge}>{t('signup.step_label', { step: 6, total: 7 })}</Text>
          <Text style={styles.title}>{t('signup.route_details')}</Text>
          <Text style={styles.subtitle}>{t('signup.route_desc')}</Text>
        </View>

        {/* Pincode Input for Villages Search */}
        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['villagePincode'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.village_pincode', { defaultValue: 'Village Pincode' })}</Text>
          <View style={styles.inputWrapper}>
            <Hash size={scale(20)} color={Colors.iconSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t('signup.enter_pincode_villages', { defaultValue: 'Enter Pincode to search Villages' })}
              placeholderTextColor={Colors.textPlaceholder}
              keyboardType="number-pad"
              maxLength={6}
              value={villagePincode}
              onChangeText={(val) => {
                setVillagePincode(val.replace(/[^0-9]/g, ''));
              }}
            />
            {isLoading && (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: scale(10) }} />
            )}
          </View>
        </View>

        {/* Dropdown for Villages fetched from Pincode */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('signup.select_village', { defaultValue: 'Select Village' })}</Text>
          <TouchableOpacity
            style={[
              styles.inputWrapper,
              (!villagePincode || villagePincode.length < 6 || pincodeVillages.length === 0) && { backgroundColor: '#F3F4F6', opacity: 0.7 }
            ]}
            onPress={() => {
              if (villagePincode && villagePincode.length === 6) {
                if (pincodeVillages.length > 0) {
                  setDropdownType('village');
                  setShowDropdown(true);
                } else {
                  Alert.alert(t('common.info', { defaultValue: 'Info' }), t('errors.no_villages_found', { defaultValue: 'No villages found for this pincode' }));
                }
              } else {
                Alert.alert(t('common.info', { defaultValue: 'Info' }), t('errors.enter_pincode_first', { defaultValue: 'Please enter a 6-digit pincode first' }));
              }
            }}
            activeOpacity={(villagePincode && villagePincode.length === 6 && pincodeVillages.length > 0) ? 0.7 : 1}
          >
            <MapIcon size={scale(20)} color={(villagePincode && villagePincode.length === 6 && pincodeVillages.length > 0) ? Colors.iconSecondary : Colors.textPlaceholder} style={styles.inputIcon} />
            <Text style={[
              styles.input,
              { 
                color: (villagePincode && villagePincode.length === 6 && pincodeVillages.length > 0) ? Colors.textPrimary : Colors.textPlaceholder, 
                textAlignVertical: 'center', 
                lineHeight: verticalScale(52) 
              }
            ]}>
              {isLoading 
                ? t('common.loading', { defaultValue: 'Loading villages...' }) 
                : villagePincode.length < 6 
                  ? t('signup.enter_pincode_first', { defaultValue: 'Enter 6-digit pincode to load villages' })
                  : pincodeVillages.length === 0 
                    ? t('signup.no_villages_found', { defaultValue: 'No villages found for this pincode' })
                    : t('signup.select_village_dropdown', { defaultValue: 'Select Village ({{count}} available)', count: pincodeVillages.length })
              }
            </Text>
            <ChevronDown size={20} color={Colors.iconSecondary} />
          </TouchableOpacity>
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['assignedVillages'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.assigned_villages')} *</Text>
          <View style={[
            {
              flexDirection: 'column',
              alignItems: 'stretch',
              borderWidth: moderateScale(1),
              borderColor: '#D0D5DD',
              borderRadius: moderateScale(14),
              backgroundColor: '#F9FAFB',
              paddingHorizontal: moderateScale(16),
              minHeight: verticalScale(56),
              paddingVertical: verticalScale(12),
            },
            getError('assignedVillages') && styles.inputError
          ]}>
            {formData.assignedVillages.length === 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MapIcon size={scale(20)} color={Colors.iconSecondary} style={styles.inputIcon} />
                <Text style={[styles.input, { color: Colors.textPlaceholder, textAlignVertical: 'center', lineHeight: verticalScale(38) }]}>
                  {t('signup.no_villages_assigned_placeholder', { defaultValue: 'Selected villages will appear here' })}
                </Text>
              </View>
            ) : (
              <View style={{ flex: 1, paddingVertical: verticalScale(2) }}>
                {formData.assignedVillages.map((village, index) => {
                  const isLast = index === formData.assignedVillages.length - 1;
                  return (
                    <View key={index} style={{ flexDirection: 'row', minHeight: verticalScale(36), alignItems: 'center', marginBottom: isLast ? 0 : verticalScale(6) }}>
                      {/* Timeline dot and connecting line */}
                      <View style={{ alignItems: 'center', justifyContent: 'center', width: scale(16), marginRight: scale(12), alignSelf: 'stretch' }}>
                        {/* Dot in the exact center */}
                        <View style={{
                          width: scale(8),
                          height: scale(8),
                          borderRadius: scale(4),
                          backgroundColor: Colors.primary,
                          zIndex: 2,
                        }} />

                        {/* Top connector line (from top of row to center of dot) */}
                        {index > 0 && (
                          <View style={{
                            position: 'absolute',
                            top: 0,
                            bottom: '50%',
                            width: scale(2),
                            backgroundColor: Colors.primary + '50',
                            zIndex: 1,
                          }} />
                        )}

                        {/* Bottom connector line (from center of dot, extending through the bottom margin to the next row) */}
                        {!isLast && (
                          <View style={{
                            position: 'absolute',
                            top: '50%',
                            bottom: -verticalScale(6),
                            width: scale(2),
                            backgroundColor: Colors.primary + '50',
                            zIndex: 1,
                          }} />
                        )}
                      </View>

                      {/* Content block: Village name and delete button */}
                      <View style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <TouchableOpacity
                          style={{ flex: 1, paddingVertical: verticalScale(2) }}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (villagePincode && villagePincode.length === 6) {
                              setEditingVillageIndex(index);
                              setDropdownType('replace_assigned_village');
                              setShowDropdown(true);
                            } else {
                              Alert.alert(t('common.info', { defaultValue: 'Info' }), t('errors.enter_pincode_first', { defaultValue: 'Please enter a 6-digit pincode first' }));
                            }
                          }}
                        >
                          <Text style={{
                            fontFamily: Fonts.medium,
                            fontSize: moderateScale(14),
                            color: Colors.textPrimary
                          }}>
                            {village}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            padding: scale(6),
                            borderRadius: moderateScale(8),
                            backgroundColor: '#FEE4E2',
                          }}
                          onPress={() => {
                            const newVillages = formData.assignedVillages.filter((_, i) => i !== index);
                            updateFormData('assignedVillages', newVillages);
                          }}
                        >
                          <Trash2 size={scale(16)} color="#FDA29B" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          {getError('assignedVillages') && <Text style={styles.errorText}>{getError('assignedVillages')}</Text>}
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['morningShiftTime'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.morning_shift')} *</Text>
          <TouchableOpacity
            onPress={() => {
              setTimeMode('morning');
              setShowTimePicker(true);
            }}
            activeOpacity={0.7}
          >
            <View pointerEvents="none" style={[styles.inputWrapper]}>
              <Clock size={18} color={Colors.iconSecondary} style={styles.inputIcon} />
              <TextInput
                ref={morningShiftRef}
                style={styles.input}
                placeholder={t('signup.morning_shift_placeholder')}
                placeholderTextColor={Colors.textPlaceholder}
                value={formData.morningShiftTime}
                editable={false}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['eveningShiftTime'] = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.label}>{t('signup.evening_shift')} *</Text>
          <TouchableOpacity
            onPress={() => {
              const current = formData.eveningShiftTime || '05:00 PM';
              const [time, ampm] = current.split(' ');
              const [h, m] = time.split(':');
              setCustomHour(h);
              setCustomMinute(m);
              setCustomAmPm(ampm);
              setTimeMode('evening');
              setShowTimePicker(true);
            }}
            activeOpacity={0.7}
          >
            <View pointerEvents="none" style={[styles.inputWrapper]}>
              <Clock size={18} color={Colors.iconSecondary} style={styles.inputIcon} />
              <TextInput
                ref={eveningShiftRef}
                style={styles.input}
                placeholder={t('signup.evening_shift_placeholder')}
                placeholderTextColor={Colors.textPlaceholder}
                value={formData.eveningShiftTime}
                editable={false}
              />
            </View>
          </TouchableOpacity>
        </View>



        <View 
          style={styles.inputContainer}
          onLayout={(e) => { fieldPositions.current['daysAvailable'] = e.nativeEvent.layout.y; }}
        >
          <View style={styles.labelRow}>
            <Text style={[styles.label, { marginBottom: 0 }]}>{t('signup.days_available')} *</Text>
            <TouchableOpacity onPress={selectAllDays} activeOpacity={0.7} style={styles.selectAllBtn}>
              {ALL_DAYS.every(d => (formData.daysAvailable || '').includes(d)) ? (
                <CheckSquare size={moderateScale(19)} color={Colors.primary} style={{ marginRight: scale(6) }} />
              ) : (
                <Square size={moderateScale(19)} color={Colors.primary} style={{ marginRight: scale(6) }} />
              )}
              <Text style={styles.selectAllBtnText}>
                {ALL_DAYS.every(d => (formData.daysAvailable || '').includes(d))
                  ? t('common.deselect_all')
                  : t('common.select_all')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.daysContainer}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
              const isSelected = (formData.daysAvailable || '').includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    isSelected && styles.dayChipActive
                  ]}
                  onPress={() => toggleDay(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayChipText,
                    isSelected && styles.dayChipTextActive
                  ]}>
                    {t(`days.${day}`)}
                  </Text>
                  {isSelected && (
                    <CheckCircle2 size={moderateScale(12)} color="#FFFFFF" style={styles.dayCheck} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {getError('daysAvailable') && <Text style={styles.errorText}>{getError('daysAvailable')}</Text>}
        </View>

        {renderDayTimingEditor()}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={nextStep}
        >
          <Text style={styles.primaryButtonText}>{t('signup.next_step')}</Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5:
        return formData.vehicleTypeSelection === 'Milk'
          ? renderMilkOrgDetails()
          : renderVehicleDetailsStep();
      case 6:
        return formData.vehicleTypeSelection === 'Milk'
          ? renderRouteDetailsMilk()
          : renderRouteDetailsPersonal();
      case 7:
        return renderVehicleDetailsStep();
      default: return renderStep1();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1, backgroundColor: Colors.background }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            (currentStep === 1 && !isOtpVerified) && { paddingBottom: verticalScale(24) }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ backgroundColor: Colors.background }}
        >
          <View style={styles.topNavigation}>
            <View style={styles.backButtonRow}>
              <TouchableOpacity
                style={styles.backArrowButton}
                onPress={prevStep}
                activeOpacity={0.7}
              >
                <ChevronLeft size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.mainTitle}>{t('signup.title')}</Text>
            </View>
            <View style={styles.progressRow}>
              {renderProgress()}
            </View>
          </View>

          <View style={[styles.stepContentWrapper, (currentStep === 1 && !isOtpVerified) && styles.centerContent]}>
            <View style={styles.formCard}>
              {renderCurrentStep()}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('signup.already_account')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>{t('login.login_btn')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {renderDropdownModal()}
      <TimePickerPopup
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onConfirm={confirmCustomTime}
        initialTime={editingDay ? (dayTimings[editingDay]?.[editingTimeMode as 'morning' | 'evening'] || (editingTimeMode === 'morning' ? '09:00 AM' : '06:00 PM')) : (timeMode === 'morning' ? formData.morningShiftTime : formData.eveningShiftTime)}
      />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: scale(24),
    paddingBottom: verticalScale(400),
  },
  topNavigation: {
    marginTop: Platform.OS === 'ios' ? verticalScale(20) : verticalScale(25),
    marginBottom: verticalScale(24),
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  progressRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrowButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(8),
    elevation: moderateScale(4),
  },
  progressWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTruckOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(8),
    elevation: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: '#F3F4F6',
    borderWidth: moderateScale(1.5),
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  progressCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  progressCircleInactive: {
    backgroundColor: 'transparent',
    borderColor: '#D0D5DD',
  },
  progressText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  progressTextActive: {
    color: '#FFFFFF',
  },
  progressTextInactive: {
    color: Colors.textPlaceholder,
  },
  progressLine: {
    width: scale(24),
    height: verticalScale(2),
    backgroundColor: '#E5E7EB',
    position: 'relative',
    zIndex: 1,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  progressLineInactive: {
    backgroundColor: '#D0D5DD',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: moderateScale(24),
    padding: moderateScale(24),
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: verticalScale(12) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(24),
    elevation: moderateScale(4),
  },
  stepContentWrapper: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    marginVertical: verticalScale(20),
  },
  stepContent: {
    width: '100%',
  },
  header: {
    marginBottom: verticalScale(32),
  },
  mainTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(24),
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginRight: scale(44), // To balance the back button width
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: moderateScale(28),
    color: Colors.textPrimary,
    letterSpacing: moderateScale(-0.5),
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(16),
    color: Colors.textSecondary,
    marginTop: verticalScale(8),
    lineHeight: verticalScale(24),
  },
  stepBadge: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12),
    color: Colors.primary,
    backgroundColor: '#F0F9F4',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(20),
    alignSelf: 'flex-start',
    marginBottom: verticalScale(12),
    textTransform: 'uppercase',
    letterSpacing: moderateScale(1),
  },
  inputContainer: {
    marginBottom: verticalScale(12),
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
    marginBottom: verticalScale(12),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: moderateScale(1),
    borderColor: '#D0D5DD',
    borderRadius: moderateScale(14),
    backgroundColor: '#F9FAFB',
    paddingHorizontal: moderateScale(16),
    height: verticalScale(56),
  },
  inputIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: moderateScale(16),
    color: '#181D27', // Explicit dark color for visibility
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
    minHeight: verticalScale(40),
  },
  mobileInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: moderateScale(1.5),
    borderBottomColor: '#E5E7EB',
    paddingBottom: verticalScale(12),
  },
  prefix: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
    marginRight: scale(12),
  },
  mobileInput: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
    padding: 0,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(12),
    marginTop: verticalScale(10),
  },
  otpBox: {
    width: (SCREEN_WIDTH - moderateScale(120)) / 6,
    height: verticalScale(56),
    backgroundColor: Colors.background,
    borderRadius: moderateScale(12),
    borderWidth: moderateScale(1.5),
    borderColor: '#E5E7EB',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: Fonts.bold,
    fontSize: moderateScale(20),
    color: Colors.textPrimary,
    padding: 0,
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: verticalScale(12),
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    height: verticalScale(56),
    borderRadius: moderateScale(16),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(8),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(8),
    elevation: moderateScale(4),
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.buttonDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  otpLinks: {
    marginTop: verticalScale(24),
    alignItems: 'center',
    gap: verticalScale(12),
  },
  linkText: {
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
    fontSize: moderateScale(14),
  },
  primaryButtonText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    marginRight: scale(8),
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  processingContainer: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  errorText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: '#EF4444',
    marginTop: verticalScale(4),
    marginLeft: scale(4),
  },
  inputError: {
    borderColor: '#FF4444',
    borderBottomColor: '#FF4444',
  },
  animatedTruckGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
  },
  truckIcon: {
    marginLeft: scale(8),
  },
  processingText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    letterSpacing: moderateScale(1),
    marginRight: scale(4),
  },
  smokeContainer: {
    position: 'absolute',
    left: scale(-10),
    bottom: verticalScale(2),
    flexDirection: 'row',
  },
  smokeParticle: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginRight: scale(4),
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: moderateScale(1),
    borderColor: '#D0D5DD',
    height: verticalScale(56),
    borderRadius: scale(14),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    marginTop: verticalScale(10),
  },
  secondaryButtonText: {
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
    fontSize: moderateScale(16),
    marginLeft: scale(8),
  },
  uploadBadge: {
    position: 'absolute',
    top: scale(-8),
    right: scale(-8),
    backgroundColor: Colors.primary,
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: moderateScale(2),
    borderColor: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: verticalScale(32),
    marginBottom: verticalScale(20),
  },
  footerText: {
    fontFamily: Fonts.regular,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
  },
  loginLink: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.primary,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileUploadContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  profileUploadCircle: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(12),
    elevation: 6,
    position: 'relative',
    borderWidth: moderateScale(3),
    borderColor: '#FFFFFF',
  },
  profileUploadCircleActive: {
    borderColor: Colors.primary,
  },
  profileUploadPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: scale(55),
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePreview: {
    width: '100%',
    height: '100%',
    borderRadius: scale(55),
  },
  profileEditBadge: {
    position: 'absolute',
    bottom: scale(2),
    right: scale(2),
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: moderateScale(3),
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 4,
  },
  profileUploadLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
    marginTop: verticalScale(12),
  },
  profileUploadHint: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginTop: verticalScale(2),
  },
  uploadSection: {
    flexDirection: 'column',
    gap: verticalScale(8),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(24),
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: moderateScale(1.5),
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    marginVertical: verticalScale(4),
  },
  uploadBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
    borderStyle: 'solid',
  },
  uploadBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    borderStyle: 'solid',
  },
  uploadIconWrapper: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(12),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  uploadPreview: {
    width: '100%',
    height: '100%',
  },
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: moderateScale(1.5),
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
    marginBottom: verticalScale(16),
  },
  uploadInfo: {
    flex: 1,
  },
  uploadTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
  },
  uploadSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginTop: verticalScale(2),
  },
  selectionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F9F4',
  },
  selectionIconWrapper: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(14),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  selectionIconWrapperActive: {
    backgroundColor: Colors.primary,
  },
  selectionTextContent: {
    flex: 1,
    marginLeft: scale(16),
  },
  selectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: Colors.textPrimary,
  },
  selectionTitleActive: {
    color: Colors.primary,
  },
  selectionDesc: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginTop: verticalScale(2),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    maxHeight: '70%',
    paddingBottom: verticalScale(20),
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: moderateScale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownTitle: {
    fontSize: moderateScale(18),
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  dropdownList: {
    paddingHorizontal: moderateScale(10),
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(16),
    paddingHorizontal: moderateScale(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  dropdownOptionActive: {
    backgroundColor: '#F0FDF4',
    borderRadius: moderateScale(12),
  },
  dropdownOptionText: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.medium,
    color: '#4B5563',
  },
  dropdownOptionTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.bold,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginTop: verticalScale(8),
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(2),
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(12),
    color: Colors.primary,
  },
  dayChip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: (SCREEN_WIDTH - scale(64)) / 4,
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayChipText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  dayCheck: {
    marginLeft: scale(4),
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginTop: verticalScale(12),
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(16),
  },
  areaChipText: {
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
    fontSize: moderateScale(12),
    textAlign: 'center',
  },
  removeChip: {
    marginLeft: scale(4),
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 1,
  },
  addChipButton: {
    padding: scale(8),
    marginRight: scale(4),
  },
  perDayContainer: {
    marginTop: verticalScale(20),
    marginBottom: verticalScale(16),
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  timePickerCard: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(24),
    padding: moderateScale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(10) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(20),
    elevation: 10,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  timePickerTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: Colors.textPrimary,
  },
  timePickerBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: verticalScale(200),
    marginBottom: verticalScale(20),
    paddingHorizontal: scale(10),
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  columnLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: '#000000',
    marginBottom: verticalScale(12),
  },
  columnScroll: {
    flex: 1,
    width: '100%',
  },
  timeOption: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeOptionText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(22),
    color: '#D1D5DB', // Light gray for non-selected
  },
  timeOptionTextActive: {
    color: '#000000', // Black for selected
    fontFamily: Fonts.bold,
    fontSize: moderateScale(28),
  },
  ampmColumn: {
    width: scale(60),
    justifyContent: 'center',
    height: '100%',
    paddingTop: verticalScale(26), // Offset for the H/M labels
  },
  ampmOption: {
    paddingVertical: verticalScale(10),
    alignItems: 'center',
  },
  ampmOptionText: {
    fontFamily: Fonts.medium,
    fontSize: moderateScale(18),
    color: '#D1D5DB',
  },
  ampmOptionTextActive: {
    color: '#000000',
    fontFamily: Fonts.bold,
    fontSize: moderateScale(22),
  },
  selectionLinesContainer: {
    position: 'absolute',
    left: scale(60), // After AM/PM column
    right: 0,
    top: verticalScale(30) + verticalScale(60), // LABEL_HEIGHT + PADDING_VERTICAL
    height: verticalScale(50),
    justifyContent: 'space-between',
    zIndex: 1,
  },
  selectionLine: {
    height: 1,
    backgroundColor: '#E5E7EB',
    width: '100%',
  },
  timePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: scale(12),
  },
  cancelButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
  },
  cancelButtonText: {
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    fontSize: moderateScale(14),
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(12),
  },
  confirmButtonText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    fontSize: moderateScale(14),
  },
  subLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    marginBottom: verticalScale(12),
  },
  dayTimingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: scale(60),
  },
  dayDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: Colors.primary,
    marginRight: scale(8),
  },
  dayNameText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
  },
  timingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  timeMiniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: scale(85),
    justifyContent: 'center',
  },
  timeMiniText: {
    fontFamily: Fonts.semiBold,
    fontSize: moderateScale(11),
    color: Colors.textPrimary,
  },
  timingSeparator: {
    marginHorizontal: scale(4),
    color: Colors.textPlaceholder,
    fontFamily: Fonts.medium,
  },
});

// --- Separate Components for Performance ---

interface TimePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hour: string;
  minute: string;
  ampm: string;
  setHour: (h: string) => void;
  setMinute: (m: string) => void;
  setAmPm: (a: string) => void;
}

const TimePickerModal: React.FC<TimePickerProps> = ({
  visible, onClose, onConfirm, hour, minute, ampm, setHour, setMinute, setAmPm
}) => {
  const hoursArr = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutesArr = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const ITEM_HEIGHT = verticalScale(50);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  const PADDING_VERTICAL = verticalScale(60); // (200 - 30 - 50) / 2 = 60

  const handleScroll = (type: 'hour' | 'minute', event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    if (type === 'hour') {
      const val = hoursArr[index];
      if (val && val !== hour) setHour(val);
    } else {
      const val = minutesArr[index];
      if (val && val !== minute) setMinute(val);
    }
  };

  useEffect(() => {
    if (visible) {
      const hIndex = hoursArr.indexOf(hour);
      const mIndex = minutesArr.indexOf(minute);
      setTimeout(() => {
        hourScrollRef.current?.scrollTo({ y: hIndex * ITEM_HEIGHT, animated: false });
        minuteScrollRef.current?.scrollTo({ y: mIndex * ITEM_HEIGHT, animated: false });
      }, 300);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlayCenter} activeOpacity={1} onPress={onClose}>
        <View style={styles.timePickerCard}>
          <View style={styles.timePickerHeader}>
            <Text style={styles.timePickerTitle}>Select Time</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.timePickerBody}>
            <View style={styles.selectionLinesContainer} pointerEvents="none">
              <View style={styles.selectionLine} />
              <View style={[styles.selectionLine, { marginTop: ITEM_HEIGHT }]} />
            </View>
            <View style={styles.ampmColumn}>
              <TouchableOpacity style={styles.ampmOption} onPress={() => setAmPm('AM')}>
                <Text style={[styles.ampmOptionText, ampm === 'AM' && styles.ampmOptionTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ampmOption} onPress={() => setAmPm('PM')}>
                <Text style={[styles.ampmOptionText, ampm === 'PM' && styles.ampmOptionTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timeColumn}>
              <Text style={styles.columnLabel}>H</Text>
              <ScrollView
                ref={hourScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                snapToAlignment="center"
                decelerationRate="fast"
                onMomentumScrollEnd={(e) => handleScroll('hour', e)}
                onScrollEndDrag={(e) => handleScroll('hour', e)}
                contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
              >
                {hoursArr.map(h => (
                  <TouchableOpacity key={h} style={[styles.timeOption, { height: ITEM_HEIGHT }]} onPress={() => {
                    const idx = hoursArr.indexOf(h);
                    hourScrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
                    setHour(h);
                  }}>
                    <Text style={[styles.timeOptionText, hour === h && styles.timeOptionTextActive]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.timeColumn}>
              <Text style={styles.columnLabel}>M</Text>
              <ScrollView
                ref={minuteScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                snapToAlignment="center"
                decelerationRate="fast"
                onMomentumScrollEnd={(e) => handleScroll('minute', e)}
                onScrollEndDrag={(e) => handleScroll('minute', e)}
                contentContainerStyle={{ paddingVertical: PADDING_VERTICAL }}
              >
                {minutesArr.map(m => (
                  <TouchableOpacity key={m} style={[styles.timeOption, { height: ITEM_HEIGHT }]} onPress={() => {
                    const idx = minutesArr.indexOf(m);
                    minuteScrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
                    setMinute(m);
                  }}>
                    <Text style={[styles.timeOptionText, minute === m && styles.timeOptionTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={styles.timePickerFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default SignUpScreen;
