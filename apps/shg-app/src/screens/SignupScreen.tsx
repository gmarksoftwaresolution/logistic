import React, { useState, useRef, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Modal, TouchableWithoutFeedback, Image, ActivityIndicator, Keyboard } from "react-native";
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { LanguageContext } from "../context/LanguageContext";
import { useUser } from "../context/UserContext";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { personalDetailsSchema, shgDetailsSchema, addressDetailsSchema, bankDetailsSchema, otherDetailsSchema } from "../utils/validationSchemas";
import { authService } from "../services/authService";
import { signupService } from "../services/signupService";
import { uploadService } from "../services/uploadService";
import Toast from 'react-native-toast-message';
import Button from '../components/Button';
import StepIndicator from '../components/StepIndicator';
import { FormContainer, FormSection, Label, InputField, DropdownField, ToggleButtonGroup, PrimaryButton } from '../components/SignupFormComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storage';
const UNIT_DATA = [{
  full_name_of_measurement: 'BAGS',
  unit_name: 'Quantity',
  uom_code: 'BAG'
}, {
  full_name_of_measurement: 'BALE',
  unit_name: 'Quantity',
  uom_code: 'BAL'
}, {
  full_name_of_measurement: 'BUNDLES',
  unit_name: 'Quantity',
  uom_code: 'BDL'
}, {
  full_name_of_measurement: 'BUCKLES',
  unit_name: 'Quantity',
  uom_code: 'BKL'
}, {
  full_name_of_measurement: 'BILLIONS OF UNITS',
  unit_name: 'Quantity',
  uom_code: 'BOU'
}, {
  full_name_of_measurement: 'BOX',
  unit_name: 'Quantity',
  uom_code: 'BOX'
}, {
  full_name_of_measurement: 'BOTTLES',
  unit_name: 'Quantity',
  uom_code: 'BTL'
}, {
  full_name_of_measurement: 'BUNCHES',
  unit_name: 'Quantity',
  uom_code: 'BUN'
}, {
  full_name_of_measurement: 'CANS',
  unit_name: 'Quantity',
  uom_code: 'CAN'
}, {
  full_name_of_measurement: 'CUBIC METER',
  unit_name: 'Volume',
  uom_code: 'CBM'
}, {
  full_name_of_measurement: 'CUBIC CENTIMETER',
  unit_name: 'Volume',
  uom_code: 'CCM'
}, {
  full_name_of_measurement: 'CENTIMETER',
  unit_name: 'Length',
  uom_code: 'CMS'
}, {
  full_name_of_measurement: 'CARTONS',
  unit_name: 'Quantity',
  uom_code: 'CTN'
}, {
  full_name_of_measurement: 'DOZEN',
  unit_name: 'Quantity',
  uom_code: 'DOZ'
}, {
  full_name_of_measurement: 'DRUM',
  unit_name: 'Quantity',
  uom_code: 'DRM'
}, {
  full_name_of_measurement: 'GREAT GROSS',
  unit_name: 'Quantity',
  uom_code: 'GGR'
}, {
  full_name_of_measurement: 'GRAMS',
  unit_name: 'Weight',
  uom_code: 'GMS'
}, {
  full_name_of_measurement: 'GROSS',
  unit_name: 'Quantity',
  uom_code: 'GRS'
}, {
  full_name_of_measurement: 'GROSS YARDS',
  unit_name: 'Length',
  uom_code: 'GYD'
}, {
  full_name_of_measurement: 'KILOGRAMS',
  unit_name: 'Weight',
  uom_code: 'KGS'
}, {
  full_name_of_measurement: 'KILOLITER',
  unit_name: 'Volume',
  uom_code: 'KLR'
}, {
  full_name_of_measurement: 'KILOMETER',
  unit_name: 'Length',
  uom_code: 'KME'
}, {
  full_name_of_measurement: 'MILLILITER',
  unit_name: 'Volume',
  uom_code: 'MLT'
}, {
  full_name_of_measurement: 'METERS',
  unit_name: 'Length',
  uom_code: 'MTR'
}, {
  full_name_of_measurement: 'METRIC TONS',
  unit_name: 'Weight',
  uom_code: 'MTS'
}, {
  full_name_of_measurement: 'NUMBERS',
  unit_name: 'Quantity',
  uom_code: 'NOS'
}, {
  full_name_of_measurement: 'PACKS',
  unit_name: 'Quantity',
  uom_code: 'PAC'
}, {
  full_name_of_measurement: 'PIECES',
  unit_name: 'Quantity',
  uom_code: 'PCS'
}, {
  full_name_of_measurement: 'PAIRS',
  unit_name: 'Quantity',
  uom_code: 'PRS'
}, {
  full_name_of_measurement: 'QUINTAL',
  unit_name: 'Weight',
  uom_code: 'QTL'
}, {
  full_name_of_measurement: 'ROLLS',
  unit_name: 'Quantity',
  uom_code: 'ROL'
}, {
  full_name_of_measurement: 'SETS',
  unit_name: 'Quantity',
  uom_code: 'SET'
}, {
  full_name_of_measurement: 'TABLETS',
  unit_name: 'Quantity',
  uom_code: 'TBS'
}, {
  full_name_of_measurement: 'TEN GROSS',
  unit_name: 'Quantity',
  uom_code: 'TGM'
}, {
  full_name_of_measurement: 'THOUSANDS',
  unit_name: 'Quantity',
  uom_code: 'THD'
}, {
  full_name_of_measurement: 'TONNES',
  unit_name: 'Weight',
  uom_code: 'TON'
}, {
  full_name_of_measurement: 'TUBES',
  unit_name: 'Quantity',
  uom_code: 'TUB'
}, {
  full_name_of_measurement: 'US GALLONS',
  unit_name: 'Volume',
  uom_code: 'UGS'
}, {
  full_name_of_measurement: 'UNITS',
  unit_name: 'Quantity',
  uom_code: 'UNT'
}, {
  full_name_of_measurement: 'YARDS',
  unit_name: 'Length',
  uom_code: 'YDS'
}, {
  full_name_of_measurement: 'MILLIMETER',
  unit_name: 'Length',
  uom_code: 'MMT'
}, {
  full_name_of_measurement: 'Inch',
  unit_name: 'Length',
  uom_code: 'INH'
}, {
  full_name_of_measurement: 'Foot',
  unit_name: 'Length',
  uom_code: 'FT'
}, {
  full_name_of_measurement: 'MILE',
  unit_name: 'Length',
  uom_code: 'MIL'
}, {
  full_name_of_measurement: 'MILLIGRAM',
  unit_name: 'Weight',
  uom_code: 'MGM'
}, {
  full_name_of_measurement: 'POUND',
  unit_name: 'Weight',
  uom_code: 'LBS'
}, {
  full_name_of_measurement: 'LITER',
  unit_name: 'Volume',
  uom_code: 'LTR'
}, {
  full_name_of_measurement: 'SQUARE MILLIMETER',
  unit_name: 'Area',
  uom_code: 'SQMM'
}, {
  full_name_of_measurement: 'SQUARE CENTIMETER',
  unit_name: 'Area',
  uom_code: 'SQCM'
}, {
  full_name_of_measurement: 'ACRE',
  unit_name: 'Area',
  uom_code: 'ACR'
}, {
  full_name_of_measurement: 'HECTARE',
  unit_name: 'Area',
  uom_code: 'HTR'
}, {
  full_name_of_measurement: 'OTHERS',
  unit_name: '-',
  uom_code: 'OTH'
}];
const PINCODE_DATA = [{
  pincode: "416509",
  state: "Maharashtra",
  district: "Kolhapur",
  taluka: "Chandgad",
  villages: ["Halkarni", "Naganwadi", "Patne"],
  areas: ["Main Road", "Market Area", "School Area"]
}, {
  pincode: "416502",
  state: "Maharashtra",
  district: "Kolhapur",
  taluka: "Gadhinglaj",
  villages: ["Gadhinglaj", "Mahagaon", "Kadgaon"],
  areas: ["Station Road", "Bazaar Peth", "College Road"]
}, {
  pincode: "416507",
  state: "Maharashtra",
  district: "Kolhapur",
  taluka: "Ajara",
  villages: ["Ajara", "Uttur", "Nesari"],
  areas: ["Bus Stand Area", "Market Yard", "Temple Road"]
}, {
  pincode: "416504",
  state: "Maharashtra",
  district: "Kolhapur",
  taluka: "Bhudargad",
  villages: ["Gargoti", "Kadgaon", "Shindewadi"],
  areas: ["Main Chowk", "Hospital Area", "School Road"]
}];

// Validation Helper Functions
const validateRequired = (val: string) => {
  return val.trim().length > 0;
};
const validateAadhaar = (val: string) => {
  return /^\d{12}$/.test(val.replace(/\s/g, ''));
};
const validatePan = (val: string) => {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val.toUpperCase());
};
const validatePincode = (val: string) => {
  return /^\d{6}$/.test(val);
};
const validateMobileNumber = (val: string) => {
  return /^\d{10}$/.test(val);
};
const validateIfsc = (val: string) => {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val.toUpperCase());
};
const validateName = (val: string) => {
  return val.trim().length >= 2;
};
const validateEmail = (val: string) => {
  if (!val.trim()) return true; // Optional fields don't fail if empty
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
};
type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;
export default function SignupScreen({
  navigation
}: Props) {
  const context = useContext(LanguageContext);
  const {
    updateUser,
    login
  } = useUser();
  if (!context) return null;
  const {
    locale,
    changeLanguage,
    t
  } = context;
  const [step, setStep] = useState<number>(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  const getStepDetails = () => {
    const isShg = selectedRole === 'shg';
    const totalSteps = isShg ? 7 : 5;
    let currentStep = 1;
    if (isShg) {
      currentStep = Math.max(1, step - 2);
    } else {
      if (step === 3) currentStep = 1;else if (step === 6) currentStep = 2;else if (step === 7) currentStep = 3;else if (step === 8) currentStep = 4;else if (step === 9) currentStep = 5;
    }
    return {
      currentStep,
      totalSteps
    };
  };
  const getStepIndicator = () => {
    if (step < 3 || step > 9) return null;
    const {
      currentStep,
      totalSteps
    } = getStepDetails();
    return `Step ${currentStep} of ${totalSteps}`;
  };

  // Step 0: Role Selection
  const [selectedRole, setSelectedRole] = useState<'shg' | 'individual' | null>(null);

  // Step 1 & 2: Mobile Auth States
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isMobileFocused, setIsMobileFocused] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Focus refs for keyboard transitions
  const mobileRef = useRef<TextInput>(null);
  const fullNameRef = useRef<TextInput>(null);
  const ageRef = useRef<TextInput>(null);
  const shgNameRef = useRef<TextInput>(null);
  const crpNameRef = useRef<TextInput>(null);
  const crpMobileRef = useRef<TextInput>(null);
  const crpEmailRef = useRef<TextInput>(null);
  const leaderNameRef = useRef<TextInput>(null);
  const leaderMobileRef = useRef<TextInput>(null);
  const shgGroupSizeRef = useRef<TextInput>(null);
  const businessTeamSizeRef = useRef<TextInput>(null);
  const productNameRef = useRef<TextInput>(null);
  const otherCategoryRef = useRef<TextInput>(null);
  const dailyProductionRef = useRef<TextInput>(null);
  const weeklyProductionRef = useRef<TextInput>(null);
  const productPriceRef = useRef<TextInput>(null);
  const pincodeRef = useRef<TextInput>(null);
  const houseNoRef = useRef<TextInput>(null);
  const landmarkRef = useRef<TextInput>(null);
  const villageRef = useRef<TextInput>(null);
  const talukaRef = useRef<TextInput>(null);
  const districtRef = useRef<TextInput>(null);
  const stateNameRef = useRef<TextInput>(null);
  const aadhaarNumberRef = useRef<TextInput>(null);
  const panNumberRef = useRef<TextInput>(null);
  const accountNameRef = useRef<TextInput>(null);
  const accountNumberRef = useRef<TextInput>(null);
  const ifscCodeRef = useRef<TextInput>(null);
  const bankNameRef = useRef<TextInput>(null);
  const branchNameRef = useRef<TextInput>(null);
  const upiIdRef = useRef<TextInput>(null);
  const storageWidthRef = useRef<TextInput>(null);
  const storageLengthRef = useRef<TextInput>(null);
  const storageSpaceRef = useRef<TextInput>(null);
  const vehicleRegNoRef = useRef<TextInput>(null);
  const dlNumberRef = useRef<TextInput>(null);
  const otherOccupationRef = useRef<TextInput>(null);

  // Step 3: Personal Details States
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [fullName, setFullName] = useState('');
  const [fullNameError, setFullNameError] = useState('');
  const [age, setAge] = useState('');
  const [ageError, setAgeError] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [leaderNameError, setLeaderNameError] = useState('');
  const [leaderMobile, setLeaderMobile] = useState('');
  const [leaderMobileError, setLeaderMobileError] = useState('');
  const [shgExperience, setShgExperience] = useState('');
  const [shgExperienceError, setShgExperienceError] = useState('');
  const [showExperienceMenu, setShowExperienceMenu] = useState(false);
  const [shgName, setShgName] = useState('');
  const [shgNameError, setShgNameError] = useState('');
  const [individualRole, setIndividualRole] = useState('');
  const [individualRoleError, setIndividualRoleError] = useState('');
  const [otherOccupation, setOtherOccupation] = useState('');
  const [otherOccupationError, setOtherOccupationError] = useState('');
  const [showIndividualRoleMenu, setShowIndividualRoleMenu] = useState(false);
  const [isRecentlyVerified, setIsRecentlyVerified] = useState(false);
  const [roleSelectionError, setRoleSelectionError] = useState('');
  const [shgRole, setShgRole] = useState('');
  const [shgRoleError, setShgRoleError] = useState('');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isShgLeader, setIsShgLeader] = useState<'yes' | 'no' | null>(null);
  const [isShgLeaderError, setIsShgLeaderError] = useState('');

  // New SHG Details States
  const [crpName, setCrpName] = useState('');
  const [crpNameError, setCrpNameError] = useState('');
  const [crpMobile, setCrpMobile] = useState('');
  const [crpMobileError, setCrpMobileError] = useState('');
  const [crpEmail, setCrpEmail] = useState('');
  const [shgGroupSize, setShgGroupSize] = useState('');
  const [shgGroupSizeError, setShgGroupSizeError] = useState('');

  // Step 4: Product Details States
  const [producesProducts, setProducesProducts] = useState<'yes' | 'no' | null>(null);
  const [producesProductsError, setProducesProductsError] = useState('');
  const [productName, setProductName] = useState('');
  const [productNameError, setProductNameError] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productCategoryError, setProductCategoryError] = useState('');
  const [otherCategory, setOtherCategory] = useState('');
  const [otherCategoryError, setOtherCategoryError] = useState('');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [dailyProduction, setDailyProduction] = useState('');
  const [dailyProductionError, setDailyProductionError] = useState('');
  const [productUnit, setProductUnit] = useState('');
  const [productUnitError, setProductUnitError] = useState('');
  const [showUnitMenu, setShowUnitMenu] = useState(false);
  const [weeklyProduction, setWeeklyProduction] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [businessTeamSize, setBusinessTeamSize] = useState('');
  const [businessTeamSizeError, setBusinessTeamSizeError] = useState('');

  // Step 5: Address Details States
  const [pincode, setPincode] = useState('');
  const [pincodeError, setPincodeError] = useState('');
  const [selectedData, setSelectedData] = useState<any>(null);
  const [showPincodeMenu, setShowPincodeMenu] = useState(false);
  const [showVillageMenu, setShowVillageMenu] = useState(false);
  const [showAreaMenu, setShowAreaMenu] = useState(false);
  const [postOffice, setPostOffice] = useState('');
  const [postOfficeError, setPostOfficeError] = useState('');
  const [postOfficeList, setPostOfficeList] = useState<string[]>([]);
  const [showPostOfficeMenu, setShowPostOfficeMenu] = useState(false);
  const [stateName, setStateName] = useState('');
  const [stateNameError, setStateNameError] = useState('');
  const [district, setDistrict] = useState('');
  const [districtError, setDistrictError] = useState('');
  const [taluka, setTaluka] = useState('');
  const [talukaError, setTalukaError] = useState('');
  const [village, setVillage] = useState('');
  const [villageError, setVillageError] = useState('');
  const [villageList, setVillageList] = useState<string[]>([]);
  const [streetArea, setStreetArea] = useState('');
  const [streetAreaError, setStreetAreaError] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [houseNoError, setHouseNoError] = useState('');
  const [landmark, setLandmark] = useState('');
  const [landmarkError, setLandmarkError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');

  // Step 6: Documents
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarError, setAadhaarError] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [panError, setPanError] = useState('');
  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [panImage, setPanImage] = useState<string | null>(null);
  const [docPhotosError, setDocPhotosError] = useState('');

  // Step 7: Bank Details
  const [accountName, setAccountName] = useState('');
  const [accountNameError, setAccountNameError] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankNameError, setBankNameError] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchNameError, setBranchNameError] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountNumberError, setAccountNumberError] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [ifscError, setIfscError] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isFetchingIfsc, setIsFetchingIfsc] = useState(false);

  // Form handling
  const {
    control,
    setValue,
    watch,
    trigger,
    getValues,
    formState: {
      errors
    }
  } = useForm({
    mode: 'onBlur'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadLoading, setUploadLoading] = useState<string | null>(null);

  // Step 8: Other Details
  const [storageSpace, setStorageSpace] = useState('');
  const [storageSpaceError, setStorageSpaceError] = useState('');
  const [storageWidth, setStorageWidth] = useState('');
  const [storageLength, setStorageLength] = useState('');

  // Auto-calculate SQFT
  useEffect(() => {
    if (storageWidth && storageLength) {
      const area = parseFloat(storageWidth) * parseFloat(storageLength);
      if (!isNaN(area)) {
        setStorageSpace(`${area} sqft`);
        setStorageSpaceError('');
      }
    }
  }, [storageWidth, storageLength]);
  const [hasVehicle, setHasVehicle] = useState<'yes' | 'no' | null>(null);
  const [hasVehicleError, setHasVehicleError] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleTypeError, setVehicleTypeError] = useState('');
  const [showVehicleMenu, setShowVehicleMenu] = useState(false);
  const [vehicleRegNo, setVehicleRegNo] = useState('');
  const [vehicleRegNoError, setVehicleRegNoError] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [dlNumberError, setDlNumberError] = useState('');
  const [dlImage, setDlImage] = useState<string | null>(null);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);

  // Image Upload Type State
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  // General States
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [generatedRequestId, setGeneratedRequestId] = useState('');

  // Helper: Format Aadhaar with spaces
  const formatAadhaar = (val: string) => {
    const numeric = val.replace(/[^0-9]/g, '');
    const trimmed = numeric.slice(0, 12);
    const parts = trimmed.match(/.{1,4}/g);
    return parts ? parts.join(' ') : trimmed;
  };

  // Persistence logic
  // Persistence logic
  const populateSignupState = (data: any) => {
    if (!data) return;
    if (data.selectedRole) setSelectedRole(data.selectedRole);
    if (data.mobile) setMobile(data.mobile);
    if (data.fullName) setFullName(data.fullName);
    if (data.age) setAge(data.age?.toString());
    if (data.profileImage) setProfileImage(data.profileImage);
    if (data.shgRole) setShgRole(data.shgRole);
    if (data.shgName) setShgName(data.shgName);
    if (data.shgExperience) setShgExperience(data.shgExperience);
    if (data.shgGroupSize) setShgGroupSize(data.shgGroupSize?.toString());
    if (data.leaderName) setLeaderName(data.leaderName);
    if (data.leaderMobile) setLeaderMobile(data.leaderMobile);
    if (data.crpName) setCrpName(data.crpName);
    if (data.crpMobile) setCrpMobile(data.crpMobile);
    if (data.crpEmail) setCrpEmail(data.crpEmail);
    if (data.isShgLeader) setIsShgLeader(data.isShgLeader);
    if (data.producesProducts) setProducesProducts(data.producesProducts);
    if (data.businessTeamSize) setBusinessTeamSize(data.businessTeamSize?.toString());
    if (data.productName) setProductName(data.productName);
    if (data.productCategory) setProductCategory(data.productCategory);
    if (data.otherCategory) setOtherCategory(data.otherCategory);
    if (data.dailyProduction) setDailyProduction(data.dailyProduction?.toString());
    if (data.productUnit) setProductUnit(data.productUnit);
    if (data.weeklyProduction) setWeeklyProduction(data.weeklyProduction?.toString());
    if (data.productPrice) setProductPrice(data.productPrice?.toString());
    if (data.pincode) setPincode(data.pincode);
    if (data.stateName) setStateName(data.stateName);
    if (data.district) setDistrict(data.district);
    if (data.taluka) setTaluka(data.taluka);
    if (data.village) setVillage(data.village);
    if (data.postOffice) setPostOffice(data.postOffice);
    if (data.streetArea) setStreetArea(data.streetArea);
    if (data.houseNo) setHouseNo(data.houseNo);
    if (data.landmark) setLandmark(data.landmark);
    if (data.aadhaarNumber) setAadhaarNumber(data.aadhaarNumber);
    if (data.panNumber) setPanNumber(data.panNumber);
    if (data.aadhaarFront) setAadhaarFront(data.aadhaarFront);
    if (data.aadhaarBack) setAadhaarBack(data.aadhaarBack);
    if (data.panImage) setPanImage(data.panImage);
    if (data.accountName) setAccountName(data.accountName);
    if (data.bankName) setBankName(data.bankName);
    if (data.branchName) setBranchName(data.branchName);
    if (data.accountNumber) setAccountNumber(data.accountNumber);
    if (data.ifscCode) setIfscCode(data.ifscCode);
    if (data.upiId) setUpiId(data.upiId);
    if (data.storageSpace) setStorageSpace(data.storageSpace);
    if (data.storageWidth) setStorageWidth(data.storageWidth?.toString());
    if (data.storageLength) setStorageLength(data.storageLength?.toString());
    if (data.hasVehicle) setHasVehicle(data.hasVehicle);
    if (data.vehicleType) setVehicleType(data.vehicleType);
    if (data.vehicleRegNo) setVehicleRegNo(data.vehicleRegNo);
    if (data.dlNumber) setDlNumber(data.dlNumber);
    if (data.dlImage) setDlImage(data.dlImage);
    if (data.vehicleImage) setVehicleImage(data.vehicleImage);
    if (data.generatedRequestId) setGeneratedRequestId(data.generatedRequestId);
    if (data.individualRole) setIndividualRole(data.individualRole);
  };
  const getStorageKeys = (role: string | null) => {
    if (role === 'Individual') {
      return {
        dataKey: STORAGE_KEYS.SIGNUP_DATA_INDIVIDUAL,
        stepKey: STORAGE_KEYS.CURRENT_STEP_INDIVIDUAL
      };
    }
    return {
      dataKey: STORAGE_KEYS.SIGNUP_DATA_SHG,
      stepKey: STORAGE_KEYS.CURRENT_STEP_SHG
    };
  };
  const handleRoleSelection = (role: 'shg' | 'individual') => {
    if (selectedRole !== null && selectedRole !== role) {
      resetSignupState();
      setIsRecentlyVerified(false);
    }
    setSelectedRole(role);
    setRoleSelectionError('');
  };
  const saveSignupProgress = async (currentStep: number) => {
    try {
      const signupData = {
        selectedRole,
        mobile,
        fullName,
        age,
        profileImage,
        shgRole,
        shgName,
        shgExperience,
        shgGroupSize,
        leaderName,
        leaderMobile,
        crpName,
        crpMobile,
        crpEmail,
        isShgLeader,
        producesProducts,
        businessTeamSize,
        productName,
        productCategory,
        otherCategory,
        dailyProduction,
        productUnit,
        weeklyProduction,
        productPrice,
        pincode,
        stateName,
        district,
        taluka,
        village,
        postOffice,
        streetArea,
        houseNo,
        landmark,
        aadhaarNumber,
        panNumber,
        aadhaarFront,
        aadhaarBack,
        panImage,
        accountName,
        bankName,
        branchName,
        accountNumber,
        ifscCode,
        upiId,
        storageSpace,
        storageWidth,
        storageLength,
        hasVehicle,
        vehicleType,
        vehicleRegNo,
        dlNumber,
        dlImage,
        vehicleImage,
        generatedRequestId,
        individualRole
      };
      if (!selectedRole) return;
      const {
        dataKey,
        stepKey
      } = getStorageKeys(selectedRole);
      await AsyncStorage.setItem(dataKey, JSON.stringify(signupData));
      await AsyncStorage.setItem(stepKey, currentStep.toString());
    } catch (error) {
      console.error('Failed to save signup progress:', error);
    }
  };
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const loadSignupProgress = async () => {
    // ALWAYS start fresh on mount. Clear navigation state.
    // Progress is ONLY restored AFTER OTP verification.
    try {
      setStep(0);
      setSelectedRole(null);
      setMobile('');
      setMobileError('');
      setOtpError('');
      setOtp(['', '', '', '', '', '']);
    } catch (error) {
      console.error('Failed to clear signup progress on mount:', error);
    } finally {
      setIsInitialLoading(false);
    }
  };
  useEffect(() => {
    loadSignupProgress();
  }, []);

  // Auto-save whenever step or important data changes
  useEffect(() => {
    if (step > 2) {
      // Only save after OTP is verified
      saveSignupProgress(step);
    }
  }, [step, selectedRole, fullName, age, profileImage, shgRole, shgName, shgExperience, shgGroupSize, leaderName, leaderMobile, crpName, crpMobile, crpEmail, isShgLeader, producesProducts, businessTeamSize, productName, productCategory, otherCategory, dailyProduction, productUnit, weeklyProduction, productPrice, pincode, stateName, district, taluka, village, postOffice, streetArea, houseNo, landmark, aadhaarNumber, panNumber, aadhaarFront, aadhaarBack, panImage, accountName, bankName, branchName, accountNumber, ifscCode, upiId, storageSpace, storageWidth, storageLength, hasVehicle, vehicleType, vehicleRegNo, dlNumber, dlImage, vehicleImage, generatedRequestId, individualRole]);

  // IFSC Auto-fetch Effect
  useEffect(() => {
    const fetchBankDetails = async () => {
      if (ifscCode.length === 11) {
        setIsFetchingIfsc(true);
        try {
          const response = await fetch(`https://ifsc.razorpay.com/${ifscCode}`);
          if (response.ok) {
            const data = await response.json();
            setBankName(data.BANK || '');
            setBranchName(data.BRANCH || '');
            setBankNameError('');
            setBranchNameError('');
          } else {
            setIfscError(t("su_invalid_ifsc_code_1"));
          }
        } catch (error) {
          console.error('Error fetching bank details:', error);
        } finally {
          setIsFetchingIfsc(false);
        }
      }
    };
    fetchBankDetails();
  }, [ifscCode]);

  // Focus helper effect on step transitions
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      switch (step) {
        case 1:
          mobileRef.current?.focus();
          break;
        case 2:
          inputRefs.current[0]?.focus();
          break;
        case 3:
          fullNameRef.current?.focus();
          break;
        case 4:
          if (selectedRole === 'shg') {
            if (shgRole === 'crp') {
              shgNameRef.current?.focus();
            } else {
              shgNameRef.current?.focus();
            }
          } else if (selectedRole === 'individual') {
            otherOccupationRef.current?.focus();
          }
          break;
        case 5:
          if (producesProducts === 'yes') {
            businessTeamSizeRef.current?.focus();
          }
          break;
        case 6:
          pincodeRef.current?.focus();
          break;
        case 7:
          aadhaarNumberRef.current?.focus();
          break;
        case 8:
          accountNameRef.current?.focus();
          break;
        case 9:
          if (selectedRole === 'shg') {
            storageWidthRef.current?.focus();
          } else {
            vehicleRegNoRef.current?.focus();
          }
          break;
        default:
          break;
      }
    }, 150);

    return () => clearTimeout(focusTimer);
  }, [step, selectedRole, shgRole, producesProducts]);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  // Pincode selectedData sync effect (crucial for resuming progress)
  useEffect(() => {
    if (pincode && pincode.length === 6) {
      const localData = PINCODE_DATA.find(p => p.pincode === pincode);
      if (localData) {
        setSelectedData(localData);
        setVillageList(localData.villages || []);
        setPostOfficeList(localData.villages || []);
      } else {
        const fetchPincodeData = async () => {
          try {
            const data = await signupService.getPincodeDetails(pincode);
            if (data) {
              setSelectedData(data);
              setVillageList(data.villages || []);
              setPostOfficeList(data.postOffices || []);
            }
          } catch (err) {
            console.error('Failed to sync pincode details in effect:', err);
          }
        };
        fetchPincodeData();
      }
    }
  }, [pincode]);

  // IFSC Auto-fetch Effect
  useEffect(() => {
    const fetchBank = async () => {
      if (ifscCode.length === 11) {
        setIsFetchingIfsc(true);
        try {
          const data = await signupService.getBankDetails(ifscCode);
          setBankName(data.bankName);
          if (data.branchName) {
            setBranchName(data.branchName);
            setBranchNameError('');
          }
          setIfscError('');
        } catch (error) {
          setIfscError(t("val_invalid_ifsc_code"));
          // Clear dependent fields if invalid
          setBankName('');
          setBranchName('');
        } finally {
          setIsFetchingIfsc(false);
        }
      }
    };
    fetchBank();
  }, [ifscCode]);

  // Auth Functions
  const handleSendOtp = async () => {
    if (!mobile) {
      setMobileError(t('val_mobile_number_required') || 'Mobile number is required');
      return;
    }
    if (mobile.length !== 10) {
      setMobileError(t('su_enter_valid_10_digit_100') || 'Enter a valid 10 digit mobile number');
      return;
    }
    if (!/^[6-9]/.test(mobile)) {
      setMobileError(t('invalid_mobile_start'));
      return;
    }
    setMobileError("");
    setIsSubmitting(true);
    try {
      await authService.sendSignupOtp(mobile);
      setOtp(['', '', '', '', '', '']);
      setStep(2);
      Toast.show({
        type: 'success',
        text1: t("su_otp_sent_successfull_3")
      });
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      if (displayMessage && displayMessage.toLowerCase().includes('already registered')) {
        setMobileError(t("su_this_mobile_number_i_4"));
      } else {
        setMobileError(displayMessage || 'Please check your mobile number and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleResendOtp = async () => {
    setIsSubmitting(true);
    setOtpError('');
    try {
      await authService.sendSignupOtp(mobile);
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      Toast.show({
        type: 'success',
        text1: t("su_otp_resent_successfu_6")
      });
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      setOtpError(displayMessage || t("su_please_try_again_aft_8"));
    } finally {
      setIsSubmitting(false);
    }
  };
  const resetSignupState = () => {
    setSelectedRole(null);
    setMobile('');
    setOtp(['', '', '', '', '', '']);
    setFullName('');
    setAge('');
    setProfileImage(null);
    setShgRole('');
    setShgName('');
    setShgExperience('');
    setShgGroupSize('');
    setLeaderName('');
    setLeaderMobile('');
    setCrpName('');
    setCrpMobile('');
    setCrpEmail('');
    setIsShgLeader(null);
    setProducesProducts(null);
    setBusinessTeamSize('');
    setProductName('');
    setProductCategory('');
    setOtherCategory('');
    setDailyProduction('');
    setProductUnit('');
    setWeeklyProduction('');
    setProductPrice('');
    setPincode('');
    setStateName('');
    setDistrict('');
    setTaluka('');
    setVillage('');
    setPostOffice('');
    setPostOfficeError('');
    setPostOfficeList([]);
    setStreetArea('');
    setHouseNo('');
    setLandmark('');
    setAadhaarNumber('');
    setPanNumber('');
    setAadhaarFront(null);
    setAadhaarBack(null);
    setPanImage(null);
    setAccountName('');
    setBankName('');
    setBranchName('');
    setAccountNumber('');
    setIfscCode('');
    setUpiId('');
    setStorageSpace('');
    setStorageWidth('');
    setStorageLength('');
    setHasVehicle(null);
    setVehicleType('');
    setVehicleRegNo('');
    setDlNumber('');
    setDlImage(null);
    setVehicleImage(null);
    setGeneratedRequestId('');
  };
  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) return;
    setIsSubmitting(true);
    try {
      const languageMap: Record<string, string> = {
        'en': 'English',
        'hi': 'Hindi',
        'mr': 'Marathi'
      };
      const response = await authService.verifySignupOtp(mobile, otpString, languageMap[locale] || 'English');
      // Store token / Login
      const token = response.token || response.accessToken;
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEYS.JWT_TOKEN, token);
        await login(token, {
          name: '',
          mobile: mobile,
          profileImage: null,
          gmuId: '',
          role: '',
          dob: '',
          aadhaar: '',
          joiningDate: '',
          pincode: '',
          stateName: '',
          district: '',
          taluka: '',
          village: '',
          homeAddress: ''
        });
      }

      // Check for saved progress
      try {
        const progressRes = await signupService.getProgress();
        if (progressRes.success && progressRes.frontendStep && progressRes.frontendStep >= 3 && progressRes.frontendStep <= 9) {
          if (progressRes.signupData.selectedRole === selectedRole) {
            populateSignupState(progressRes.signupData);
            setStep(progressRes.frontendStep);
            const {
              dataKey,
              stepKey
            } = getStorageKeys(selectedRole);
            await AsyncStorage.setItem(stepKey, progressRes.frontendStep.toString());
            await AsyncStorage.setItem(dataKey, JSON.stringify({
              ...progressRes.signupData,
              mobile
            }));
            Toast.show({
              type: 'success',
              text1: t("su_mobile_verified_9"),
              text2: t("su_resuming_your_regist_10")
            });
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch signup progress on verification:', err);
      }
      const {
        dataKey,
        stepKey
      } = getStorageKeys(selectedRole);
      const savedStep = await AsyncStorage.getItem(stepKey);
      const savedData = await AsyncStorage.getItem(dataKey);
      if (savedData && savedStep) {
        const data = JSON.parse(savedData);
        // Only resume if the verified mobile number matches the saved progress AND the selected role matches
        if (data.mobile === mobile && data.selectedRole === selectedRole && parseInt(savedStep, 10) > 2) {
          populateSignupState(data);
          setStep(parseInt(savedStep, 10));
          Toast.show({
            type: 'success',
            text1: t("su_mobile_verified_9"),
            text2: t("su_resuming_your_progre_12")
          });
          return;
        } else {
          // Different user, role, or no progress beyond OTP, clear stale data and start fresh
          const backupRole = selectedRole;
          resetSignupState();
          setSelectedRole(backupRole);
          setMobile(mobile); // Keep the new number
          setIsRecentlyVerified(true);
          setStep(3); // Start from personal details step after verification
          await AsyncStorage.removeItem(dataKey);
          await AsyncStorage.removeItem(stepKey);
          Toast.show({
            type: 'success',
            text1: t("su_mobile_verified_9"),
            text2: t("su_starting_new_signup_14")
          });
          return;
        }
      }

      // If no saved progress at all
      setStep(3);
      setIsRecentlyVerified(true);
      Toast.show({
        type: 'success',
        text1: t("su_mobile_verified_9"),
        text2: t("su_starting_new_signup_14")
      });
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      setOtpError(displayMessage || t("su_the_otp_you_entered__18") || 'Verification Failed');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleOtpChange = (val: string, index: number) => {
    setOtpError('');
    let newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  const isOtpComplete = otp.every(d => d !== '');

  // Image Picker Logic
  const handleImagePicked = async (uri: string) => {
    setIsSubmitting(true);
    setUploadLoading(uploadTarget);
    try {
      // const baseUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace('/api', '');
      const baseUrl = (process.env.EXPO_PUBLIC_API_URL || 'https://immodest-duchess-tibia.ngrok-free.dev/api').replace('/api', '');
      let response;
      switch (uploadTarget) {
        case 'profile':
          response = await uploadService.uploadProfilePhoto(uri);
          setProfileImage(baseUrl + response.url);
          break;
        case 'aadhaarFront':
          response = await uploadService.uploadAadhaarFront(uri);
          setAadhaarFront(baseUrl + response.url);
          setDocPhotosError('');
          break;
        case 'aadhaarBack':
          response = await uploadService.uploadAadhaarBack(uri);
          setAadhaarBack(baseUrl + response.url);
          setDocPhotosError('');
          break;
        case 'panImage':
          response = await uploadService.uploadPanCard(uri);
          setPanImage(baseUrl + response.url);
          setDocPhotosError('');
          break;
        case 'dlImage':
          response = await uploadService.uploadDrivingLicense(uri);
          setDlImage(baseUrl + response.url);
          break;
        case 'vehicleImage':
          response = await uploadService.uploadVehiclePhoto(uri);
          setVehicleImage(baseUrl + response.url);
          break;
      }
      Toast.show({
        type: 'success',
        text1: t("su_photo_uploaded_19")
      });
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({
        type: 'error',
        text1: t("su_upload_failed_20"),
        text2: displayMessage
      });
    } finally {
      setIsSubmitting(false);
      setUploadLoading(null);
    }
  };
  const pickFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.5
    });
    if (!result.canceled) {
      handleImagePicked(result.assets[0].uri);
    }
    setShowPhotoMenu(false);
  };
  const takeSelfie = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.5
    });
    if (!result.canceled) {
      handleImagePicked(result.assets[0].uri);
    }
    setShowPhotoMenu(false);
  };

  // Validations & Submission Logic
  const handleNextStep3 = async () => {
    let isValid = true;
    let firstInvalidRef: any = null;
    setFullNameError('');
    setAgeError('');
    setIndividualRoleError('');
    setOtherOccupationError('');
    if (!fullName.trim()) {
      setFullNameError(t("val_full_name_required"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = fullNameRef;
    }
    if (!age.trim()) {
      setAgeError(t("val_age_required"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = ageRef;
    } else {
      const ageNum = Number(age);
      if (isNaN(ageNum)) {
        setAgeError(t("su_age_must_be_a_valid__23"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = ageRef;
      } else if (ageNum < 18) {
        setAgeError(t("su_you_must_be_at_least_24"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = ageRef;
      } else if (ageNum > 99) {
        setAgeError(t("val_age_max_99"));
        isValid = false;
      }
    }
    if (selectedRole === 'individual') {
      if (!individualRole) {
        setIndividualRoleError(t("su_please_select_your_r_26"));
        isValid = false;
      } else if (individualRole === 'other' && !validateRequired(otherOccupation)) {
        setOtherOccupationError(t("su_please_specify_your__27"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = otherOccupationRef;
      }
    }
    if (!isValid) {
      if (firstInvalidRef && firstInvalidRef.current && typeof firstInvalidRef.current.focus === 'function') {
        firstInvalidRef.current.focus();
      }
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Submit Profile
      const response = await signupService.submitProfile({
        userType: selectedRole === 'individual' ? 'INDIVIDUAL' : 'SHG',
        fullName,
        age: parseInt(age, 10),
        photoUrl: profileImage || undefined
      });

      // Capture shgUniqueId and update context
      if (response.user?.shgUniqueId) {
        setGeneratedRequestId(response.user.shgUniqueId);
        updateUser({
          shgUniqueId: response.user.shgUniqueId
        });
      }

      // 2. Submit Role for Individual users
      if (selectedRole === 'individual') {
        const roleMap: Record<string, string> = {
          'delivery_partner': 'DELIVERY_PARTNER',
          'driver': 'DRIVER',
          'shopkeeper___business_owner': 'SHOPKEEPER',
          'student___job_seeker': 'STUDENT',
          'farmer': 'FARMER',
          'self_employed': 'SELF_EMPLOYED',
          'other': 'OTHER'
        };
        await signupService.submitNonShgRole({
          nonShgRole: roleMap[individualRole] || 'OTHER'
        });
      }
      if (selectedRole === 'individual') {
        setStep(6);
      } else {
        setStep(4);
      }
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({
        type: 'error',
        text1: t("su_submission_failed_28"),
        text2: displayMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handlePincodeSelect = (pin: string) => {
    const data = PINCODE_DATA.find(p => p.pincode === pin);
    setPincode(pin);
    setPincodeError('');
    if (data) {
      setSelectedData(data);
      setStateName(data.state);
      setDistrict(data.district);
      setTaluka(data.taluka);
      setVillage('');
      setStreetArea('');
    }
    setShowPincodeMenu(false);
  };
  const handleNextStep4 = async () => {
    let isValid = true;
    let firstInvalidRef: any = null;
    setShgNameError('');
    setCrpNameError('');
    setCrpMobileError('');
    setShgGroupSizeError('');
    setLeaderNameError('');
    setLeaderMobileError('');
    setShgExperienceError('');
    setShgRoleError('');
    setIsShgLeaderError('');
    setShgGroupSizeError('');
    if (!shgRole) {
      setShgRoleError(t("su_please_select_your_r_26"));
      isValid = false;
    }
    if (shgRole === 'crp') {
      if (isShgLeader === null) {
        setIsShgLeaderError(t("su_please_select_if_you_30"));
        isValid = false;
      }
      if (!shgName.trim()) {
        setShgNameError(t("su_shg_name_is_required_31"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = shgNameRef;
      }
      if (!shgExperience) {
        setShgExperienceError(t("su_please_select_experi_32"));
        isValid = false;
      }
      if (!shgGroupSize || isNaN(Number(shgGroupSize))) {
        setShgGroupSizeError(t("su_group_size_is_requir_33"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = shgGroupSizeRef;
      }
      if (!leaderName.trim()) {
        setLeaderNameError(t("su_leader_name_is_requi_34"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = leaderNameRef;
      }
      if (leaderMobile.length !== 10) {
        setLeaderMobileError(t("su_enter_10_digit_mobil_35"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = leaderMobileRef;
      } else if (!/^[6-9]/.test(leaderMobile)) {
        setLeaderMobileError(t("su_mobile_number_must_s_36"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = leaderMobileRef;
      }
    } else if (shgRole && shgRole !== 'crp') {
      if (!shgName.trim()) {
        setShgNameError(t("su_shg_name_is_required_31"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = shgNameRef;
      }
      if (!crpName.trim()) {
        setCrpNameError(t("su_crp_name_is_required_38"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = crpNameRef;
      }
      if (crpMobile.length !== 10) {
        setCrpMobileError(t("su_enter_10_digit_mobil_35"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = crpMobileRef;
      } else if (!/^[6-9]/.test(crpMobile)) {
        setCrpMobileError(t("su_mobile_number_must_s_36"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = crpMobileRef;
      }
      if (!shgGroupSize || isNaN(Number(shgGroupSize))) {
        setShgGroupSizeError(t("su_group_size_is_requir_33"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = shgGroupSizeRef;
      }
      if (!shgExperience) {
        setShgExperienceError(t("su_please_select_experi_32"));
        isValid = false;
      }
      if (shgRole === 'member') {
        if (!leaderName.trim()) {
          setLeaderNameError(t("su_leader_name_is_requi_34"));
          isValid = false;
          if (!firstInvalidRef) firstInvalidRef = leaderNameRef;
        }
        if (leaderMobile.length !== 10) {
          setLeaderMobileError(t("su_enter_10_digit_mobil_35"));
          isValid = false;
          if (!firstInvalidRef) firstInvalidRef = leaderMobileRef;
        } else if (!/^[6-9]/.test(leaderMobile)) {
          setLeaderMobileError(t("su_mobile_number_must_s_36"));
          isValid = false;
          if (!firstInvalidRef) firstInvalidRef = leaderMobileRef;
        }
      }
    }
    if (!isValid) {
      if (firstInvalidRef && firstInvalidRef.current && typeof firstInvalidRef.current.focus === 'function') {
        firstInvalidRef.current.focus();
      }
      return;
    }
    setIsSubmitting(true);
    try {
      const experienceMap: Record<string, string> = {
        '1_2_years': 'ONE_TO_TWO_YEARS',
        '3_5_years': 'THREE_TO_FIVE_YEARS',
        '5__years': 'FIVE_PLUS_YEARS'
      };
      const roleMap: Record<string, string> = {
        'crp': 'CRP',
        'leader': 'LEADER',
        'member': 'MEMBER'
      };
      const shgDetails: any = {
        shgRole: roleMap[shgRole] || 'MEMBER'
      };
      if (shgRole === 'crp') {
        shgDetails.shgName = shgName;
        shgDetails.shgExperience = experienceMap[shgExperience] || 'LESS_THAN_1_YEAR';
        shgDetails.shgGroupSize = parseInt(shgGroupSize, 10);
        shgDetails.shgLeaderName = leaderName;
        shgDetails.shgLeaderContact = leaderMobile;
      } else {
        shgDetails.shgName = shgName;
        shgDetails.crpName = crpName;
        shgDetails.crpMobile = crpMobile;
        shgDetails.crpEmail = crpEmail;
        shgDetails.shgExperience = experienceMap[shgExperience] || 'LESS_THAN_1_YEAR';
        shgDetails.shgGroupSize = parseInt(shgGroupSize, 10);
        if (shgRole === 'member') {
          shgDetails.shgLeaderName = leaderName;
          shgDetails.shgLeaderContact = leaderMobile;
        } else if (shgRole === 'leader') {
          shgDetails.shgLeaderName = fullName;
          shgDetails.shgLeaderContact = mobile;
        }
      }
      await signupService.submitShgDetails(shgDetails);
      setStep(5);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({
        type: 'error',
        text1: t("su_submission_failed_28"),
        text2: displayMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleNextStep5 = async () => {
    let isValid = true;
    let firstInvalidRef: any = null;
    setProducesProductsError('');
    setBusinessTeamSizeError('');
    setProductNameError('');
    setProductCategoryError('');
    setDailyProductionError('');
    setProductUnitError('');
    setOtherCategoryError('');
    if (!producesProducts) {
      setProducesProductsError(t("su_please_select_if_you_47"));
      isValid = false;
    }
    if (producesProducts === 'yes') {
      if (!businessTeamSize || isNaN(Number(businessTeamSize))) {
        setBusinessTeamSizeError(t("su_business_team_size_i_48"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = businessTeamSizeRef;
      }
      if (!productName.trim()) {
        setProductNameError(t("su_product_name_is_requ_49"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = productNameRef;
      }
      if (!productCategory) {
        setProductCategoryError(t("su_please_select_catego_50"));
        isValid = false;
      } else if (productCategory === 'other') {
        if (!otherCategory.trim()) {
          setOtherCategoryError(t("su_category_name_is_req_51"));
          isValid = false;
          if (!firstInvalidRef) firstInvalidRef = otherCategoryRef;
        }
      }
      if (!dailyProduction.trim()) {
        setDailyProductionError(t("su_quantity_is_required_52"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = dailyProductionRef;
      }
      if (!productUnit) {
        setProductUnitError(t("su_please_select_unit_53"));
        isValid = false;
      }
    }
    if (!isValid) {
      if (firstInvalidRef && firstInvalidRef.current && typeof firstInvalidRef.current.focus === 'function') {
        firstInvalidRef.current.focus();
      }
      return;
    }
    setIsSubmitting(true);
    try {
      const categoryMap: Record<string, string> = {
        'food': 'FOOD',
        'handmade': 'HANDMADE',
        'agriculture': 'AGRICULTURE',
        'other': 'OTHER'
      };
      await signupService.submitProducts({
        producesProduct: producesProducts === 'yes',
        businessTeamSize: businessTeamSize ? parseInt(businessTeamSize, 10) : undefined,
        products: producesProducts === 'yes' ? [{
          productName,
          category: categoryMap[productCategory] || 'OTHER',
          dailyProductionQty: parseFloat(dailyProduction),
          unit: productUnit.toUpperCase(),
          weeklyProduction: weeklyProduction ? parseFloat(weeklyProduction) : undefined,
          price: productPrice ? parseFloat(productPrice) : undefined
        }] : []
      });
      setStep(6);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({
        type: 'error',
        text1: t("su_submission_failed_28"),
        text2: displayMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleNextStep6 = async () => {
    let isValid = true;
    let firstInvalidRef: any = null;
    setPincodeError('');
    setVillageError('');
    setPostOfficeError('');
    setStreetAreaError('');
    setTalukaError('');
    setDistrictError('');
    setStateNameError('');
    setHouseNoError('');
    setLandmarkError('');
    if (!pincode) {
      setPincodeError(t("val_pincode_required"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = pincodeRef;
    }
    if (!village) {
      setVillageError(t("su_village_is_required_56"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = villageRef;
    }
    if (!postOffice) {
      setPostOfficeError(t("val_post_office_required"));
      isValid = false;
    }
    if (!landmark) {
      setLandmarkError(t("su_delivery_address_is__57"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = landmarkRef;
    }
    if (!taluka) {
      setTalukaError(t("val_taluka_required"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = talukaRef;
    }
    if (!district) {
      setDistrictError(t("su_please_select_distri_59"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = districtRef;
    }
    if (!stateName) {
      setStateNameError(t("su_please_select_state_60"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = stateNameRef;
    }
    if (!houseNo) {
      setHouseNoError(t("su_house_no_is_required_61"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = houseNoRef;
    }
    if (!isValid) {
      if (firstInvalidRef && firstInvalidRef.current && typeof firstInvalidRef.current.focus === 'function') {
        firstInvalidRef.current.focus();
      }
      return;
    }
    setIsSubmitting(true);
    try {
      await signupService.submitAddress({
        pincode,
        village,
        taluka,
        district,
        state: stateName,
        houseNo,
        landmark,
        postOffice
      });
      setStep(7);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({
        type: 'error',
        text1: t("su_submission_failed_28"),
        text2: displayMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleNextStep7 = async () => {
    let isValid = true;
    let firstInvalidRef: any = null;
    setAadhaarError('');
    setPanError('');
    setDocPhotosError('');
    if (aadhaarNumber.replace(/\s/g, '').length !== 12) {
      setAadhaarError(t("su_enter_12_digit_aadha_63"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = aadhaarNumberRef;
    }
    if (panNumber.length !== 10) {
      setPanError(t("su_enter_10_character_p_64"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = panNumberRef;
    }
    if (!aadhaarFront || !aadhaarBack || !panImage) {
      setDocPhotosError(t("su_please_upload_all_re_65"));
      isValid = false;
    }
    if (!isValid) {
      if (firstInvalidRef && firstInvalidRef.current && typeof firstInvalidRef.current.focus === 'function') {
        firstInvalidRef.current.focus();
      }
      return;
    }
    setIsSubmitting(true);
    try {
      await signupService.submitDocuments({
        aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
        panNumber,
        aadhaarFrontUrl: aadhaarFront || undefined,
        aadhaarBackUrl: aadhaarBack || undefined,
        panCardUrl: panImage || undefined
      });
      setStep(8);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({
        type: 'error',
        text1: t("su_submission_failed_28"),
        text2: displayMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleNextStep8 = async () => {
    let isValid = true;
    let firstInvalidRef: any = null;
    setAccountNameError('');
    setAccountNumberError('');
    setIfscError('');
    setBankNameError('');
    setBranchNameError('');
    if (!accountName.trim()) {
      setAccountNameError(t("val_account_name_required"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = accountNameRef;
    }
    if (!accountNumber.trim()) {
      setAccountNumberError(t("val_account_number_required"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = accountNumberRef;
    }
    if (!ifscCode.trim()) {
      setIfscError(t("val_ifsc_code_required"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = ifscCodeRef;
    }
    if (!bankName.trim()) {
      setBankNameError(t("val_bank_name_required"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = bankNameRef;
    }
    if (!branchName.trim()) {
      setBranchNameError(t("su_branch_name_is_requi_71"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = branchNameRef;
    }
    if (!isValid) {
      if (firstInvalidRef && firstInvalidRef.current && typeof firstInvalidRef.current.focus === 'function') {
        firstInvalidRef.current.focus();
      }
      return;
    }
    setIsSubmitting(true);
    try {
      await signupService.submitBankDetails({
        accountHolderName: accountName,
        accountNumber,
        ifscCode,
        bankName,
        upiId: upiId || undefined
      });
      setStep(9);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({
        type: 'error',
        text1: t("su_submission_failed_28"),
        text2: displayMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleNextStep9 = async () => {
    let isValid = true;
    let firstInvalidRef: any = null;
    setStorageSpaceError('');
    setHasVehicleError('');
    setVehicleTypeError('');
    setVehicleRegNoError('');
    setDlNumberError('');
    setTermsError('');
    let cleanRegNo = '';
    let cleanDl = '';
    if (!storageSpace.trim()) {
      setStorageSpaceError(t("su_storage_space_inform_73"));
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = storageSpaceRef;
    }
    if (!hasVehicle) {
      setHasVehicleError(t("su_please_select_vehicl_74"));
      isValid = false;
    } else if (hasVehicle === 'yes') {
      if (!vehicleType) {
        setVehicleTypeError(t("su_vehicle_type_is_requ_75"));
        isValid = false;
      }
      cleanRegNo = vehicleRegNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (cleanRegNo) {
        const isBH = cleanRegNo.length > 0 && /^[0-9O]/.test(cleanRegNo[0]);
        let normalized = '';
        for (let i = 0; i < cleanRegNo.length; i++) {
          let char = cleanRegNo[i];
          if (isBH) {
            if ((i === 0 || i === 1 || i >= 4 && i <= 7) && char === 'O') {
              char = '0';
            }
          } else {
            if ((i === 2 || i === 3) && char === 'O') {
              char = '0';
            }
            if (cleanRegNo.length >= 6 && i >= cleanRegNo.length - 4 && char === 'O') {
              char = '0';
            }
          }
          normalized += char;
        }
        cleanRegNo = normalized;
        setVehicleRegNo(cleanRegNo);
      }
      const indianVehicleRegRegex = /^(?:(?:[A-Z]{2}[0-9A-Z]{2}[A-Z]{0,3}[0-9]{4})|(?:[0-9]{2}BH[0-9]{4}[A-Z]{2}))$/;
      if (!cleanRegNo) {
        setVehicleRegNoError(t("su_registration_number__76"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = vehicleRegNoRef;
      } else if (!indianVehicleRegRegex.test(cleanRegNo)) {
        setVehicleRegNoError(t("su_invalid_vehicle_numb_77"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = vehicleRegNoRef;
      }
      cleanDl = dlNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (cleanDl) {
        let normalized = '';
        for (let i = 0; i < cleanDl.length; i++) {
          if (i >= 2 && cleanDl[i] === 'O') {
            normalized += '0';
          } else {
            normalized += cleanDl[i];
          }
        }
        cleanDl = normalized;
        setDlNumber(cleanDl);
      }
      const indianDlRegex = /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/;
      if (!cleanDl) {
        setDlNumberError(t("su_driving_license_numb_78"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = dlNumberRef;
      } else if (!indianDlRegex.test(cleanDl)) {
        setDlNumberError(t("su_invalid_driving_lice_79"));
        isValid = false;
        if (!firstInvalidRef) firstInvalidRef = dlNumberRef;
      }
    }
    if (!termsAccepted) {
      setTermsError(t("su_you_must_accept_term_80"));
      isValid = false;
    }
    if (!isValid) {
      if (firstInvalidRef && firstInvalidRef.current && typeof firstInvalidRef.current.focus === 'function') {
        firstInvalidRef.current.focus();
      }
      return;
    }
    setIsSubmitting(true);
    try {
      const vehicleTypeMap: Record<string, string> = {
        'bike___scooty': 'TWO_WHEELER',
        'auto___cargo': 'THREE_WHEELER',
        'car___pickup': 'FOUR_WHEELER',
        'other': 'OTHER'
      };
      const response = await signupService.submitOtherDetails({
        storageSpace: storageSpace.trim(),
        storageWidth: storageWidth ? parseFloat(storageWidth) : undefined,
        storageLength: storageLength ? parseFloat(storageLength) : undefined,
        hasVehicle: hasVehicle === 'yes',
        vehicle: hasVehicle === 'yes' ? {
          vehicleType: vehicleTypeMap[vehicleType] || undefined,
          vehicleRegistrationNo: cleanRegNo || undefined,
          drivingLicenseNumber: cleanDl || undefined,
          drivingLicenseImageUrl: dlImage || undefined,
          vehicleImageUrl: vehicleImage || undefined
        } : undefined
      });
      if (response.shgUniqueId) {
        setGeneratedRequestId(response.shgUniqueId);
      } else if (response.requestId) {
        setGeneratedRequestId(response.requestId);
      }
      updateUser({
        name: fullName,
        mobile: mobile,
        profileImage: profileImage
      });
      setStep(10);
      const {
        dataKey,
        stepKey
      } = getStorageKeys(selectedRole);
      await AsyncStorage.removeItem(dataKey);
      await AsyncStorage.removeItem(stepKey);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      if (serverMessage) {
        const messages = Array.isArray(serverMessage) ? serverMessage : [serverMessage];
        let mappedError = false;
        messages.forEach((msg: string) => {
          if (msg.toLowerCase().includes('driving license') || msg.toLowerCase().includes('dl ')) {
            setDlNumberError(t("su_invalid_driving_lice_79"));
            mappedError = true;
          }
          if (msg.toLowerCase().includes('registration') || msg.toLowerCase().includes('vehicle registration')) {
            setVehicleRegNoError(t("su_invalid_vehicle_numb_77"));
            mappedError = true;
          }
          if (msg.toLowerCase().includes('storage')) {
            setStorageSpaceError(msg);
            mappedError = true;
          }
        });
        if (mappedError) {
          Toast.show({
            type: 'error',
            text1: t("su_validation_error_83"),
            text2: t("su_please_correct_the_h_84")
          });
          return;
        }
      }
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({
        type: 'error',
        text1: t("su_final_submission_fai_85"),
        text2: displayMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  if (isInitialLoading) {
    return <SafeAreaView className="flex-1 bg-[#F5F7FA] justify-center items-center">
        <ActivityIndicator size="large" color="#073318" />
      </SafeAreaView>;
  }
  return <SafeAreaView className="flex-1 bg-background">
      <KeyboardAwareScrollView className="flex-1" contentContainerStyle={{
      flexGrow: 1,
      paddingBottom: 40
    }} bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={80} extraHeight={80} enableAutomaticScroll={true}>

        {/* Header */}
        <View className="px-6 pt-4 pb-4 bg-transparent mt-4">
          <View className="flex-row items-center justify-between mb-6 relative">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => {
              if (step === 10) navigation.navigate("Login");else if (step > 0) {
                if (selectedRole === 'individual' && step === 6) {
                  setStep(3);
                } else {
                  if (step === 2) setOtp(['', '', '', '', '', '']);
                  setStep(step - 1);
                }
              } else navigation.navigate("AuthSelection");
            }} className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm mr-4" style={{
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 2
              },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4
            }}>
                <Ionicons name="chevron-back" size={24} color="#073318" />
              </TouchableOpacity>
              <Text numberOfLines={1} className="text-[24px] font-extrabold text-[#111827]">{t('signup')}</Text>
            </View>
            {step !== 0 && <View className="flex-row items-center z-10">
                <TouchableOpacity onPress={() => navigation.navigate("Help")} className="mr-3 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
                  <Ionicons name="help-outline" size={20} color="#073318" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowLangMenu(true)} className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
                  <Ionicons name="globe-outline" size={20} color="#073318" />
                </TouchableOpacity>
              </View>}
          </View>

          {/* Progress Indicator */}
          {step >= 3 && step <= 9 && <StepIndicator currentStep={getStepDetails().currentStep} totalSteps={getStepDetails().totalSteps} />}
        </View>

        {/* Step 0: Role Selection */}
        {step === 0 && <View className="flex-1 px-6 pt-6 pb-10">
            {/* Massive Branding Section matching Login */}
            <View className="items-center justify-center mb-8 mt-2">
              <Image source={require('../../assets/images/GMU Logo.png')} style={{
            width: 80,
            height: 80
          }} resizeMode="contain" className="mb-2" />
              <Text className="font-extrabold text-[36px] tracking-tight text-center">
                <Text style={{
              color: '#073318'
            }}>{t("gram")}</Text>
                <Text style={{
              color: '#84B827'
            }}>{t("unnati")}</Text>
              </Text>
              <Text className="font-black text-[#073318] text-[18px] tracking-widest uppercase text-center mt-1">{t("delivery_partner")}</Text>
            </View>

            {/* Big Container Card for Actions */}
            <View className="bg-white rounded-[32px] p-6 w-full border border-gray-100" style={{
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 10
          },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 10
        }}>
              <Text className="text-2xl font-extrabold text-[#111827] mb-2 text-center">{t("su_choose_your_role_89")}</Text>
              <Text className="text-[#6B7280] text-[13px] font-semibold mb-6 text-center">{t("su_select_your_user_typ_90")}</Text>

              <View className="space-y-4 mb-4">
                <TouchableOpacity onPress={() => handleRoleSelection('shg')} className={`py-4 px-4 rounded-[20px] border-2 flex-row items-center ${selectedRole === 'shg' ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}>
                  <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${selectedRole === 'shg' ? 'bg-[#073318]' : 'bg-[#EEF5F0]'}`}>
                    <Ionicons name="people" size={24} color={selectedRole === 'shg' ? 'white' : '#073318'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-base font-extrabold mb-1 ${selectedRole === 'shg' ? 'text-[#073318]' : 'text-[#111827]'}`}>{t("su_shg_self_help_group_91")}</Text>
                    <Text className="text-xs text-[#6B7280] font-medium leading-4">{t("su_for_women_working_in_92")}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleRoleSelection('individual')} className={`py-4 px-4 rounded-[20px] border-2 flex-row items-center mt-4 ${selectedRole === 'individual' ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}>
                  <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${selectedRole === 'individual' ? 'bg-[#073318]' : 'bg-[#EEF5F0]'}`}>
                    <Ionicons name="person" size={24} color={selectedRole === 'individual' ? 'white' : '#073318'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-base font-extrabold mb-1 ${selectedRole === 'individual' ? 'text-[#073318]' : 'text-[#111827]'}`}>{t("su_individual_93")}</Text>
                    <Text className="text-xs text-[#6B7280] font-medium leading-4">{t("su_for_personal_or_busi_94")}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {roleSelectionError ? <Text className="text-red-500 text-xs text-center mb-4 font-semibold">{roleSelectionError}</Text> : null}

              <TouchableOpacity onPress={() => {
            if (!selectedRole) {
              setRoleSelectionError(t("su_please_select_your_r_95"));
            } else {
              if (isRecentlyVerified) {
                setStep(3);
              } else {
                setStep(1);
              }
            }
          }} className="bg-[#073318] py-4 rounded-2xl items-center justify-center flex-row w-full mt-4" style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 4
            },
            shadowOpacity: 0.3,
            shadowRadius: 5,
            elevation: 8
          }}>
                <Text className="text-white text-[18px] font-bold tracking-wide mr-2">{t("continue")}</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>}

        {/* Step 1: Mobile Input */}
        {step === 1 && <View className="flex-1 px-6 pt-6 pb-10">
            <View className={`${isKeyboardVisible ? 'mb-4 mt-2' : 'mb-8 mt-2'} items-center justify-center text-center`}>
              <Image
                source={require('../../assets/images/GMU Logo.png')}
                style={isKeyboardVisible ? { width: 50, height: 50 } : { width: 80, height: 80 }}
                resizeMode="contain"
                className={isKeyboardVisible ? 'mb-1' : 'mb-2'}
              />
              <Text className={`font-extrabold tracking-tight text-center px-4 ${isKeyboardVisible ? 'text-[24px]' : 'text-[36px]'}`} adjustsFontSizeToFit numberOfLines={1}>
                <Text style={{ color: '#073318' }}>{t("gram")}</Text>
                <Text style={{ color: '#84B827' }}>{t("unnati")}</Text>
              </Text>
              <Text className={`font-black text-[#073318] tracking-widest uppercase text-center mt-1 ${isKeyboardVisible ? 'text-[12px]' : 'text-[18px]'}`} adjustsFontSizeToFit numberOfLines={1}>{t("delivery_partner")}</Text>
            </View>

            {/* Big Container Card for Actions */}
            <View className="bg-white rounded-[32px] p-6 w-full border border-gray-100" style={{
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 10
          },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 10
        }}>
              <Text className="text-2xl font-extrabold text-[#111827] mb-2 text-center">{t('signup')}</Text>
              <Text className="text-[#6B7280] text-[13px] font-semibold mb-8 text-center">
                {t('enter_mobile')}
              </Text>

              <Text numberOfLines={1} className="text-[10px] font-bold text-[#414651] uppercase tracking-wider mb-2 ml-1">{t('mobile_number')}</Text>
              <View className={`bg-[#F9FAFB] h-[50px] px-4 rounded-[16px] border flex-row items-center ${mobileError ? 'border-[#EF4444]' : isMobileFocused ? 'border-[#073318]' : mobile.length === 10 ? 'border-[#22C55E]' : 'border-gray-200'} mb-2`}>
                <Text className="text-[#073318] text-[15px] font-bold mr-3">+91</Text>
                <View className="w-[1px] h-5 bg-gray-200 mr-3" />
                <TextInput ref={mobileRef} className="flex-1 text-[#111827] text-[15px] font-medium p-0" style={{ padding: 0, height: '100%', textAlignVertical: 'center' }} placeholder="Enter your mobile number" placeholderTextColor="#9CA3AF" keyboardType="number-pad" maxLength={10} value={mobile} onChangeText={val => {
              const cleaned = val.replace(/[^0-9]/g, '');
              setMobile(cleaned);
              setOtp(['', '', '', '', '', '']);
              if (cleaned.length > 0 && cleaned.length < 10) {
                setMobileError(t("su_enter_valid_10_digit_100"));
              } else if (cleaned.length === 0) {
                setMobileError(t("val_mobile_number_required"));
              } else {
                setMobileError("");
              }
            }} onFocus={() => setIsMobileFocused(true)} onBlur={() => {
              setIsMobileFocused(false);
              if (!mobile) setMobileError(t("val_mobile_number_required"));else if (mobile.length < 10) setMobileError(t("su_enter_valid_10_digit_100"));
            }} returnKeyType="done" onSubmitEditing={handleSendOtp} />
              </View>
              {mobileError ? <Text style={{
            color: '#DC2626',
            fontSize: 12,
            marginTop: 4,
            marginLeft: 4,
            marginBottom: 16
          }}>{mobileError}</Text> : <View className="mb-6" />}

              <TouchableOpacity onPress={handleSendOtp} disabled={isSubmitting} className={`${isSubmitting ? 'bg-[#073318]/60' : 'bg-[#073318]'} py-4 rounded-2xl items-center justify-center flex-row mb-5`} style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 4
            },
            shadowOpacity: isSubmitting ? 0 : 0.3,
            shadowRadius: 5,
            elevation: isSubmitting ? 0 : 8
          }}>
                {isSubmitting ? <ActivityIndicator color="white" /> : <>
                    <Text numberOfLines={1} className="text-white text-[18px] font-bold tracking-wide mr-2">{t('send_otp')}</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </>}
              </TouchableOpacity>

              <View className="flex-row justify-center items-center mt-2 flex-wrap">
                <Text className="text-[#6B7280] text-[13px] font-medium">{t('have_account')} </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text numberOfLines={1} className="text-[#073318] font-bold text-[14px] px-1">{t('login')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>}

        {/* Step 2: OTP Verification */}
        {step === 2 && <View className="flex-1 px-6 pt-6 pb-10">
            <View className={`${isKeyboardVisible ? 'mb-4 mt-2' : 'mb-8 mt-2'} items-center justify-center text-center`}>
              <Image
                source={require('../../assets/images/GMU Logo.png')}
                style={isKeyboardVisible ? { width: 50, height: 50 } : { width: 80, height: 80 }}
                resizeMode="contain"
                className={isKeyboardVisible ? 'mb-1' : 'mb-2'}
              />
              <Text className={`font-extrabold tracking-tight text-center px-4 ${isKeyboardVisible ? 'text-[24px]' : 'text-[36px]'}`} adjustsFontSizeToFit numberOfLines={1}>
                <Text style={{ color: '#073318' }}>{t("gram")}</Text>
                <Text style={{ color: '#84B827' }}>{t("unnati")}</Text>
              </Text>
              <Text className={`font-black text-[#073318] tracking-widest uppercase text-center mt-1 ${isKeyboardVisible ? 'text-[12px]' : 'text-[18px]'}`} adjustsFontSizeToFit numberOfLines={1}>{t("delivery_partner")}</Text>
            </View>

            {/* Big Container Card for Actions */}
            <View className="bg-white rounded-[32px] p-6 w-full border border-gray-100" style={{
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 10
          },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 10
        }}>
              <Text className="text-2xl font-extrabold text-[#111827] mb-2 text-center">{t('verify_otp')}</Text>
              <Text className="text-[#6B7280] text-[13px] font-semibold mb-8 text-center">
                {t('enter_otp_sent')} <Text className="text-[#073318] font-bold">+91 {mobile || "XXXXXXXXXX"}</Text>
              </Text>

              <View className="flex-row justify-between w-full mb-4">
                {[0, 1, 2, 3, 4, 5].map(i => <View key={i} className={`w-[14%] aspect-square border-2 rounded-[16px] bg-[#F9FAFB] justify-center items-center relative ${otpError ? 'border-red-500' : focusedIndex === i ? 'border-[#073318]' : 'border-gray-200'}`}>
                    <Text style={{
                textAlign: 'center',
                textAlignVertical: 'center',
                includeFontPadding: false
              }} className="text-xl font-bold text-[#111827]">
                      {otp[i]}
                    </Text>
                    <TextInput ref={el => {
                inputRefs.current[i] = el;
              }} style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0,
                padding: 0
              }} keyboardType="numeric" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={1} value={otp[i]} onChangeText={val => handleOtpChange(val, i)} onKeyPress={e => handleOtpKeyPress(e, i)} onFocus={() => setFocusedIndex(i)} onBlur={() => setFocusedIndex(null)} />
                  </View>)}
              </View>
              {otpError ? (
                <Text className="text-red-500 text-xs mt-1.5 mb-3 text-center font-medium">{otpError}</Text>
              ) : null}

              <View className="flex-row items-center justify-center mb-8">
                <Feather name="clock" size={14} color="#6B7280" className="mr-1.5" />
                <Text numberOfLines={1} className="text-[#6B7280] text-[13px] font-semibold">
                  {timer > 0 ? <>{t('resend_otp_in')} <Text className="text-[#073318] font-bold">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</Text></> : <TouchableOpacity onPress={handleResendOtp} disabled={isSubmitting}>
                      <Text numberOfLines={1} className="text-[#073318] font-bold">{t('resend_otp')}</Text>
                    </TouchableOpacity>}
                </Text>
              </View>

               <TouchableOpacity onPress={handleVerifyOtp} disabled={!isOtpComplete || isSubmitting} className={`${!isOtpComplete ? 'bg-[#073318]/60' : 'bg-[#073318]'} py-4 rounded-2xl items-center justify-center flex-row mb-5`} style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 4
            },
            shadowOpacity: (!isOtpComplete || isSubmitting) ? 0 : 0.3,
            shadowRadius: 5,
            elevation: (!isOtpComplete || isSubmitting) ? 0 : 8
          }}>
                {isSubmitting ? <ActivityIndicator color="white" /> : <>
                    <Text numberOfLines={1} className="text-white text-[18px] font-bold tracking-wide mr-2">{t('verify_otp')}</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </>}
              </TouchableOpacity>

              <View className="items-center mt-2">
                <TouchableOpacity onPress={() => setStep(1)} className="flex-row items-center">
                  <Ionicons name="pencil" size={16} color="#6B7280" className="mr-2" />
                  <Text numberOfLines={1} className="font-semibold text-[#6B7280] text-[14px] px-1">{t('edit_mobile')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>}

        {/* Step 3: Personal Details */}
        {step === 3 && <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection iconName="person-outline" title={t("personal_details")} subtitle={t("su_enter_your_details_t_108")} />

              {/* Profile Image Picker */}
              <View className="items-center mb-6">
                <TouchableOpacity onPress={() => {
              setUploadTarget('profile');
              setShowPhotoMenu(true);
            }} className="w-24 h-24 rounded-full bg-[#F3F4F6] border-2 border-dashed border-[#073318] items-center justify-center overflow-hidden relative">
                  {profileImage ? <Image source={{
                uri: profileImage
              }} className="w-full h-full" /> : <View className="items-center">
                      <Ionicons name="camera" size={32} color="#073318" />
                      <Text className="text-[10px] text-[#073318] font-bold mt-1 uppercase text-center leading-3">{t("select_photo")}</Text>
                    </View>}
                </TouchableOpacity>

                {profileImage && <TouchableOpacity onPress={() => setProfileImage(null)} className="absolute -top-1 -right-1 bg-white rounded-full shadow-md" style={{
              zIndex: 20
            }}>
                    <Ionicons name="close-circle" size={28} color="#B42318" />
                  </TouchableOpacity>}
              </View>

              <View className="w-full">
                <InputField ref={fullNameRef} label={t("su_your_full_name_110")} placeholder={t("su_enter_your_full_name_111")} icon="person-outline" error={fullNameError} required={true} value={fullName} onChangeText={v => {
              const filtered = v.replace(/[^a-zA-Z\s]/g, '');
              setFullName(filtered);
              if (!validateRequired(filtered)) {
                setFullNameError(t("val_full_name_required"));
              } else {
                setFullNameError('');
              }
            }} onBlur={() => {
              if (!validateRequired(fullName)) setFullNameError(t("val_full_name_required"));
            }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => ageRef.current?.focus()} />

                <InputField label={t("mobile_number")} icon="call-outline" required={true} value={mobile} editable={false} suffixIcon="checkmark-circle" />

                <InputField ref={ageRef} label={t("su_your_age_115")} placeholder={t("su_enter_age_e_g_30_116")} icon="person-circle-outline" error={ageError} required={true} keyboardType="numeric" maxLength={2} value={age} onChangeText={v => {
              setAge(v);
              if (!validateRequired(v)) {
                setAgeError(t("val_age_required"));
              } else if (parseInt(v) < 18) {
                setAgeError(t("su_must_be_at_least_18_118"));
              } else {
                setAgeError('');
              }
            }} onBlur={() => {
              if (!validateRequired(age)) setAgeError(t("val_age_required"));else if (parseInt(age) < 18) setAgeError(t("su_must_be_at_least_18_118"));
            }} returnKeyType={selectedRole === 'individual' ? 'next' : 'done'} onSubmitEditing={selectedRole === 'individual' ? () => setShowIndividualRoleMenu(true) : handleNextStep3} />

                {selectedRole === 'individual' && <DropdownField label={t("su_select_your_occupati_121")} placeholder={t("su_select_your_occupati_122")} icon="briefcase-outline" value={individualRole ? t("opt_" + individualRole) : ""} error={individualRoleError} required={true} onPress={() => setShowIndividualRoleMenu(true)} />}

                {selectedRole === 'individual' && individualRole === 'other' && <InputField ref={otherOccupationRef} label={t("su_specify_your_occupat_123")} placeholder={t("su_enter_your_occupatio_124")} icon="briefcase-outline" error={otherOccupationError} required={true} value={otherOccupation} onChangeText={val => {
              setOtherOccupation(val);
              if (!validateRequired(val)) setOtherOccupationError(t("su_please_specify_your__27"));else setOtherOccupationError('');
            }} onBlur={() => {
              if (!validateRequired(otherOccupation)) setOtherOccupationError(t("su_please_specify_your__27"));
            }} returnKeyType="done" blurOnSubmit={true} onSubmitEditing={handleNextStep3} />}
              </View>

              <PrimaryButton title={t("continue")} onPress={handleNextStep3} loading={isSubmitting} />
            </FormContainer>
          </View>}

        {/* Step 4: SHG Details */}
        {step === 4 && <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection iconName="people-outline" title={t("su_shg_details_128")} subtitle={t("su_tell_us_about_your_s_129")} />

              <View className="w-full">
                {/* Your Role Dropdown */}
                <DropdownField label={t("su_your_role_130")} placeholder={t("su_select_your_role_131")} icon="people-circle-outline" value={shgRole ? t("opt_" + shgRole) : ""} error={shgRoleError} required={true} onPress={() => setShowRoleMenu(true)} />

                {shgRole === 'crp' && <View className="w-full">
                    <ToggleButtonGroup label={t("su_are_you_leader_of_th_132")} value={isShgLeader} error={isShgLeaderError} required={true} onSelect={val => {
                setIsShgLeader(val);
                setIsShgLeaderError('');
                if (val === 'yes') {
                  setLeaderName(fullName);
                  setLeaderMobile(mobile);
                } else {
                  setLeaderName('');
                  setLeaderMobile('');
                }
              }} />

                    {isShgLeader !== null && <Animated.View entering={FadeInUp.duration(400).springify()} className="w-full">
                        <InputField ref={shgNameRef} label={t("su_shg_name_133")} placeholder={t("su_enter_shg_name_134")} icon="business-outline" error={shgNameError} required={true} value={shgName} onChangeText={v => {
                  const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                  setShgName(filtered);
                  setShgNameError('');
                }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => shgGroupSizeRef.current?.focus()} />

                        <DropdownField label={t("su_how_long_has_your_sh_135")} placeholder={t("su_select_experience_136")} icon="time-outline" value={shgExperience ? t("opt_" + shgExperience) : ""} error={shgExperienceError} required={true} onPress={() => setShowExperienceMenu(true)} />

                        <InputField ref={shgGroupSizeRef} label={t("su_shg_group_size_137")} placeholder={t("su_enter_number_of_memb_138")} icon="people-outline" error={shgGroupSizeError} required={true} keyboardType="numeric" maxLength={3} value={shgGroupSize} onChangeText={v => {
                  const filtered = v.replace(/[^0-9]/g, '');
                  if (Number(filtered) <= 100) {
                    setShgGroupSize(filtered);
                    setShgGroupSizeError('');
                  }
                }} returnKeyType={isShgLeader === 'no' ? 'next' : 'done'} blurOnSubmit={isShgLeader === 'no' ? false : true} onSubmitEditing={isShgLeader === 'no' ? () => leaderNameRef.current?.focus() : handleNextStep4} />

                        <InputField ref={leaderNameRef} label={t("su_group_leader_name_139")} placeholder={t("su_enter_leader_s_name_140")} icon="person-outline" error={leaderNameError} required={true} value={leaderName} editable={isShgLeader === 'no'} onChangeText={v => {
                  const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                  setLeaderName(filtered);
                  setLeaderNameError('');
                }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => leaderMobileRef.current?.focus()} />

                        <InputField ref={leaderMobileRef} label={t("su_leader_mobile_number_141")} placeholder={t("su_enter_10_digit_mobil_35")} icon="phone-portrait-outline" error={leaderMobileError} required={true} keyboardType="numeric" maxLength={10} value={leaderMobile} editable={isShgLeader === 'no'} onChangeText={v => {
                  const filtered = v.replace(/[^0-9]/g, '');
                  setLeaderMobile(filtered);
                  setLeaderMobileError('');
                }} returnKeyType="done" onSubmitEditing={handleNextStep4} />
                      </Animated.View>}
                  </View>}

                {shgRole && shgRole !== 'crp' && <View className="w-full">
                    <InputField ref={shgNameRef} label={t("su_shg_name_133")} placeholder={t("su_enter_shg_name_134")} icon="business-outline" error={shgNameError} required={true} value={shgName} onChangeText={v => {
                const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                setShgName(filtered);
                 setShgNameError('');
              }} />

                    <InputField ref={crpNameRef} label={t("su_crp_name_145")} placeholder={t("su_enter_crp_name_146")} icon="person-outline" error={crpNameError} required={true} value={crpName} onChangeText={v => {
                const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                setCrpName(filtered);
                setCrpNameError('');
              }} />

                    <InputField ref={crpMobileRef} label={t("su_crp_contact_number_147")} placeholder={t("su_enter_10_digit_mobil_35")} icon="phone-portrait-outline" error={crpMobileError} required={true} keyboardType="numeric" maxLength={10} value={crpMobile} onChangeText={v => {
                const filtered = v.replace(/[^0-9]/g, '');
                setCrpMobile(filtered);
                setCrpMobileError('');
              }} />

                    <InputField ref={crpEmailRef} label={t("su_crp_email_id_optiona_149")} placeholder={t("su_enter_email_address_150")} icon="mail-outline" keyboardType="email-address" autoCapitalize="none" value={crpEmail} onChangeText={v => setCrpEmail(v.replace(/[^a-zA-Z0-9@._-]/g, ''))} />

                    {shgRole === 'member' && <View className="w-full">
                        <InputField ref={leaderNameRef} label={t("su_group_leader_name_139")} placeholder={t("su_enter_leader_s_name_140")} icon="person-outline" error={leaderNameError} required={true} value={leaderName} onChangeText={v => {
                  const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                  setLeaderName(filtered);
                  setLeaderNameError('');
                }} />

                        <InputField ref={leaderMobileRef} label={t("su_leader_mobile_number_141")} placeholder={t("su_enter_10_digit_mobil_35")} icon="phone-portrait-outline" error={leaderMobileError} required={true} keyboardType="numeric" maxLength={10} value={leaderMobile} onChangeText={v => {
                  const filtered = v.replace(/[^0-9]/g, '');
                  setLeaderMobile(filtered);
                  setLeaderMobileError('');
                }} />
                      </View>}

                    <DropdownField label={t("su_how_long_has_your_sh_135")} placeholder={t("su_select_experience_136")} icon="time-outline" value={shgExperience ? t("opt_" + shgExperience) : ""} error={shgExperienceError} required={true} onPress={() => setShowExperienceMenu(true)} />

                    <InputField ref={shgGroupSizeRef} label={t("su_shg_group_size_137")} placeholder={t("su_enter_number_of_memb_138")} icon="people-outline" error={shgGroupSizeError} required={true} keyboardType="numeric" maxLength={3} value={shgGroupSize} onChangeText={v => {
                const filtered = v.replace(/[^0-9]/g, '');
                if (Number(filtered) <= 100) {
                  setShgGroupSize(filtered);
                  setShgGroupSizeError('');
                }
              }} />
                  </View>}
              </View>

              <PrimaryButton title={t("continue")} onPress={handleNextStep4} loading={isSubmitting} />
            </FormContainer>
          </View>}

        {/* Step 5: Business Details */}
        {step === 5 && <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection iconName="cube-outline" title={t("su_business_details_160")} subtitle={t("su_tell_us_about_your_p_161")} />

              <View className="w-full">
                <ToggleButtonGroup label={t("su_do_you_produce_any_p_162")} value={producesProducts} error={producesProductsError} required={true} onSelect={val => {
              setProducesProducts(val);
              setProducesProductsError('');
            }} />

                {producesProducts === 'yes' && <Animated.View entering={FadeInUp.duration(400).springify()} className="w-full">
                    {/* Business Team Size */}
                    <InputField ref={businessTeamSizeRef} label={t("su_business_team_size_163")} placeholder={t("su_enter_total_team_mem_164")} icon="people-outline" error={businessTeamSizeError} required={true} keyboardType="numeric" maxLength={3} value={businessTeamSize} onChangeText={v => {
                const filtered = v.replace(/[^0-9]/g, '');
                if (Number(filtered) <= 100) {
                  setBusinessTeamSize(filtered);
                  setBusinessTeamSizeError('');
                }
              }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => productNameRef.current?.focus()} />

                    <View className="h-[1px] bg-gray-100 my-4" />

                    {/* Product Name */}
                    <InputField ref={productNameRef} label={t("su_product_name_165")} placeholder={t("su_enter_product_name_166")} icon="cube-outline" error={productNameError} required={true} value={productName} onChangeText={v => {
                const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                setProductName(filtered);
                setProductNameError('');
              }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => setShowCategoryMenu(true)} />

                    {/* Category Dropdown */}
                    <DropdownField label={t("su_category_167")} placeholder={t("su_select_category_168")} icon="grid-outline" value={productCategory ? t("opt_" + productCategory) : ""} error={productCategoryError} required={true} onPress={() => setShowCategoryMenu(true)} />

                    {productCategory === 'other' && <Animated.View entering={FadeInUp.duration(400).springify()} className="w-full">
                        <InputField label={t("su_specify_category_nam_169")} placeholder={t("su_enter_category_name_170")} icon="create-outline" error={otherCategoryError} required={true} value={otherCategory} onChangeText={v => {
                  const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                  setOtherCategory(filtered);
                  setOtherCategoryError('');
                }} />
                      </Animated.View>}

                    {/* Daily Production & Unit */}
                    <View className="flex-row w-full mt-4">
                      <View className="flex-1 mr-2">
                        <InputField ref={dailyProductionRef} label={t("su_daily_production_171")} placeholder={t("su_qty_172")} icon="bar-chart-outline" error={dailyProductionError} required={true} keyboardType="numeric" value={dailyProduction} onChangeText={v => {
                    const filtered = v.replace(/[^0-9.]/g, '');
                    setDailyProduction(filtered);
                    setDailyProductionError('');
                  }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => weeklyProductionRef.current?.focus()} />
                      </View>

                      <View className="flex-1 ml-2">
                        <DropdownField label={t("su_unit_173")} placeholder={t("su_unit_173")} icon="options-outline" value={productUnit ? t("unit_" + productUnit.toLowerCase()) : ''} error={productUnitError} required={true} onPress={() => setShowUnitMenu(true)} />
                      </View>
                    </View>

                    {/* Weekly Production & Price per Unit */}
                    <View className="flex-row w-full mt-4">
                      <View className="flex-1 mr-2">
                        <InputField ref={weeklyProductionRef} label={t("su_weekly_production_op_175")} placeholder={t("su_qty_172")} icon="stats-chart-outline" keyboardType="numeric" value={weeklyProduction} onChangeText={v => setWeeklyProduction(v.replace(/[^0-9.]/g, ''))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => productPriceRef.current?.focus()} />
                      </View>

                      <View className="flex-1 ml-2">
                        <InputField ref={productPriceRef} label={t("su_price_per_unit_optio_177")} placeholder={t("su_amount_178")} icon="card-outline" keyboardType="numeric" value={productPrice} onChangeText={v => setProductPrice(v.replace(/[^0-9.]/g, ''))} returnKeyType="done" onSubmitEditing={handleNextStep5} />
                      </View>
                    </View>
                  </Animated.View>}
              </View>

              <PrimaryButton title={t("continue")} onPress={handleNextStep5} loading={isSubmitting} />
            </FormContainer>
          </View>}



        {/* Step 6: Address Details */}
        {step === 6 && <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection iconName="location-outline" title={t("address_details")} subtitle={t("su_enter_your_location__181")} />

              <View className="w-full">
                <InputField ref={pincodeRef} label={t("pincode")} placeholder={t("su_enter_6_digit_pincod_183")} icon="location-outline" error={pincodeError} required={true} keyboardType="numeric" maxLength={6} value={pincode} onChangeText={val => {
              const cleaned = val.replace(/[^0-9]/g, '');
              setPincode(cleaned);
              if (!validateRequired(cleaned)) {
                setPincodeError(t("val_pincode_required"));
              } else if (!validatePincode(cleaned)) {
                setPincodeError(t("su_enter_valid_6_digit__185"));
              } else {
                setPincodeError('');
              }
              if (cleaned.length === 6) {
                const fetchPincode = async () => {
                  try {
                    const data = await signupService.getPincodeDetails(cleaned);
                    if (data) {
                      setStateName(data.state);
                      setDistrict(data.district);
                      setTaluka(data.taluka);
                      if (data.villages && data.villages.length > 0) {
                        setVillageList(data.villages);
                        if (data.villages.length === 1) {
                          setVillage(data.villages[0]);
                        } else {
                          setVillage('');
                        }
                      } else {
                        setVillageList([]);
                        setVillage('');
                      }
                      if (data.postOffices && data.postOffices.length > 0) {
                        setPostOfficeList(data.postOffices);
                        if (data.postOffices.length === 1) {
                          setPostOffice(data.postOffices[0]);
                        } else {
                          setPostOffice('');
                        }
                      } else {
                        setPostOfficeList([]);
                        setPostOffice('');
                      }
                      setStateNameError('');
                      setDistrictError('');
                      setTalukaError('');
                      houseNoRef.current?.focus();
                    }
                  } catch (error) {
                    console.error('Pincode fetch error:', error);
                    setPincodeError(t("su_invalid_pincode_186"));
                  }
                };
                fetchPincode();
              }
            }} onBlur={() => {
              if (!validateRequired(pincode)) setPincodeError(t("val_pincode_required"));else if (!validatePincode(pincode)) setPincodeError(t("su_enter_valid_6_digit__185"));
            }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => houseNoRef.current?.focus()} />

                <InputField ref={houseNoRef} label={t("su_house_no_189")} placeholder={t("su_enter_house_number_190")} icon="home-outline" error={houseNoError} required={true} value={houseNo} onChangeText={val => {
              const cleaned = val.replace(/[^a-zA-Z0-9\s]/g, '');
              setHouseNo(cleaned);
              if (!validateRequired(cleaned)) setHouseNoError(t("su_house_number_is_requ_191"));else setHouseNoError('');
            }} onBlur={() => {
              if (!validateRequired(houseNo)) setHouseNoError(t("su_house_number_is_requ_191"));
            }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => landmarkRef.current?.focus()} />

                <InputField ref={landmarkRef} label={t("su_delivery_address_193")} placeholder={t("su_enter_full_delivery__194")} icon="map-outline" error={landmarkError} required={true} value={landmark} onChangeText={val => {
              setLandmark(val);
              if (landmarkError) setLandmarkError(validateRequired(val) ? '' : 'Landmark is required');
            }} onBlur={() => {
              if (!validateRequired(landmark)) setLandmarkError(t("su_address_is_required_195"));
            }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => talukaRef.current?.focus()} />

                {/* Post Office Row */}
                <View className="w-full mt-4">
                  <DropdownField label={t("post_office")} placeholder={t("post_office")} icon="mail-outline" value={postOffice} error={postOfficeError} required={true} onPress={() => {
                    if (postOfficeList.length > 0) {
                      setShowPostOfficeMenu(true);
                    } else if (postOfficeList.length === 0 && pincode.length === 6) {
                      setPostOfficeError('No post offices found for this pincode');
                    }
                  }} />
                </View>

                {/* Village & Taluka Row */}
                <View className="flex-row w-full mt-4">
                  <View className="flex-1 mr-2">
                    <DropdownField label={t("su_village_city_196")} placeholder={t("su_village_city_197")} icon="flag-outline" value={village} error={villageError} required={true} onPress={() => {
                      if (villageList.length > 0) {
                        setShowVillageMenu(true);
                      } else if (villageList.length === 0 && pincode.length === 6) {
                        setVillageError('No villages found for this pincode');
                      }
                    }} />
                  </View>

                  <View className="flex-1 ml-2">
                    <InputField ref={talukaRef} label={t("taluka")} placeholder={t("taluka")} icon="flag-outline" error={talukaError} required={true} value={taluka} multiline={true} blurOnSubmit={true} onChangeText={val => {
                  setTaluka(val);
                  if (talukaError) setTalukaError(validateRequired(val) ? '' : 'Taluka is required');
                }} onBlur={() => {
                  if (!validateRequired(taluka)) setTalukaError(t("val_taluka_required"));
                }} returnKeyType="next" onSubmitEditing={() => districtRef.current?.focus()} />
                  </View>
                </View>

                {/* District & State Row */}
                <View className="flex-row w-full mt-4">
                  <View className="flex-1 mr-2">
                    <InputField ref={districtRef} label={t("district")} placeholder={t("district")} icon="flag-outline" error={districtError} required={true} value={district} multiline={true} blurOnSubmit={true} onChangeText={val => {
                  setDistrict(val);
                  if (districtError) setDistrictError(validateRequired(val) ? '' : 'Please select district');
                }} onBlur={() => {
                  if (!validateRequired(district)) setDistrictError(t("val_district_required"));
                }} returnKeyType="next" onSubmitEditing={() => stateNameRef.current?.focus()} />
                  </View>

                  <View className="flex-1 ml-2">
                    <InputField ref={stateNameRef} label={t("state")} placeholder={t("state")} icon="flag-outline" error={stateNameError} required={true} value={stateName} multiline={true} blurOnSubmit={true} onChangeText={val => {
                  setStateName(val);
                  if (stateNameError) setStateNameError(validateRequired(val) ? '' : 'Please select state');
                }} onBlur={() => {
                  if (!validateRequired(stateName)) setStateNameError(t("val_state_required"));
                }} returnKeyType="done" onSubmitEditing={handleNextStep6} />
                  </View>
                </View>
              </View>

              <PrimaryButton title={t("continue")} onPress={handleNextStep6} loading={isSubmitting} />
            </FormContainer>
          </View>}

        {/* Step 7: Documents */}
        {step === 7 && <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection iconName="card-outline" title={t("su_documents_209")} subtitle={t("su_verify_your_identity_210")} />

              <View className="w-full">
                <InputField ref={aadhaarNumberRef} label={t("su_aadhaar_number_211")} placeholder={t("su_xxxx_xxxx_xxxx_212")} icon="finger-print-outline" error={aadhaarError} required={true} keyboardType="number-pad" maxLength={14} value={aadhaarNumber} onChangeText={val => {
              const formatted = formatAadhaar(val);
              setAadhaarNumber(formatted);
              if (!validateRequired(formatted)) {
                setAadhaarError(t("su_aadhaar_number_is_re_213"));
              } else if (!validateAadhaar(formatted)) {
                setAadhaarError(t("su_enter_valid_12_digit_214"));
              } else {
                setAadhaarError('');
              }
            }} onBlur={() => {
              if (!validateRequired(aadhaarNumber)) setAadhaarError(t("su_aadhaar_number_is_re_213"));else if (!validateAadhaar(aadhaarNumber)) setAadhaarError(t("su_enter_valid_12_digit_214"));
            }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => panNumberRef.current?.focus()} />

                <InputField ref={panNumberRef} label={t("su_pan_number_217")} placeholder={t("su_abcde1234f_218")} icon="document-text-outline" error={panError} required={true} autoCapitalize="characters" maxLength={10} value={panNumber} onChangeText={val => {
              const upper = val.toUpperCase();
              setPanNumber(upper);
              if (!validateRequired(upper)) {
                setPanError(t("su_pan_number_is_requir_219"));
              } else if (!validatePan(upper)) {
                setPanError(t("su_enter_valid_pan_numb_220"));
              } else {
                setPanError('');
              }
            }} onBlur={() => {
              if (!validateRequired(panNumber)) setPanError(t("su_pan_number_is_requir_219"));else if (!validatePan(panNumber)) setPanError(t("su_enter_valid_pan_numb_220"));
            }} returnKeyType="done" blurOnSubmit={true} />

                <View className="mt-6 flex-row justify-between space-x-4">
                  <View className="flex-1 mr-2">
                    <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2 ml-1 text-center">{t("su_aadhaar_front_photo_223")}<Text className="text-[#B42318] font-semibold">*</Text>
                    </Text>
                    <TouchableOpacity onPress={() => {
                  setUploadTarget('aadhaarFront');
                  setShowPhotoMenu(true);
                }} className={`bg-[#F9FAFB] rounded-[24px] border border-dashed h-28 items-center justify-center overflow-hidden relative mt-1 ${docPhotosError && !aadhaarFront ? 'border-[#DC2626]' : aadhaarFront ? 'border-[#22C55E]' : 'border-gray-300'}`}>
                      {aadhaarFront ? <>
                          <Image source={{
                      uri: aadhaarFront
                    }} className="w-full h-full" resizeMode="cover" />
                          <TouchableOpacity onPress={e => {
                      e.stopPropagation();
                      setAadhaarFront('');
                    }} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md" style={{
                      zIndex: 10
                    }}>
                            <Ionicons name="close" size={18} color="#B42318" />
                          </TouchableOpacity>
                        </> : <View className="items-center">
                          <Ionicons name="cloud-upload-outline" size={26} color="#073318" className="mb-1" />
                          <Text className="text-[11px] text-gray-400 font-semibold">{t("su_front_side_224")}</Text>
                        </View>}
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2 ml-1 text-center">{t("su_aadhaar_back_photo_225")}<Text className="text-[#B42318] font-semibold">*</Text>
                    </Text>
                    <TouchableOpacity onPress={() => {
                  setUploadTarget('aadhaarBack');
                  setShowPhotoMenu(true);
                }} className={`bg-[#F9FAFB] rounded-[24px] border border-dashed h-28 items-center justify-center overflow-hidden relative mt-1 ${docPhotosError && !aadhaarBack ? 'border-[#DC2626]' : aadhaarBack ? 'border-[#22C55E]' : 'border-gray-300'}`}>
                      {aadhaarBack ? <>
                          <Image source={{
                      uri: aadhaarBack
                    }} className="w-full h-full" resizeMode="cover" />
                          <TouchableOpacity onPress={e => {
                      e.stopPropagation();
                      setAadhaarBack('');
                    }} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md" style={{
                      zIndex: 10
                    }}>
                            <Ionicons name="close" size={18} color="#B42318" />
                          </TouchableOpacity>
                        </> : <View className="items-center">
                          <Ionicons name="cloud-upload-outline" size={26} color="#073318" className="mb-1" />
                          <Text className="text-[11px] text-gray-400 font-semibold">{t("su_back_side_226")}</Text>
                        </View>}
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mt-6">
                  <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2 ml-1">{t("su_pan_card_photo_227")}<Text className="text-[#B42318] font-semibold">*</Text>
                  </Text>
                  <TouchableOpacity onPress={() => {
                setUploadTarget('panImage');
                setShowPhotoMenu(true);
              }} className={`bg-[#F9FAFB] rounded-[24px] border border-dashed h-32 items-center justify-center overflow-hidden relative mt-1 ${docPhotosError && !panImage ? 'border-[#DC2626]' : panImage ? 'border-[#22C55E]' : 'border-gray-300'}`}>
                    {panImage ? <>
                        <Image source={{
                    uri: panImage
                  }} className="w-full h-full" resizeMode="cover" />
                        <TouchableOpacity onPress={e => {
                    e.stopPropagation();
                    setPanImage('');
                  }} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md" style={{
                    zIndex: 10
                  }}>
                          <Ionicons name="close" size={18} color="#B42318" />
                        </TouchableOpacity>
                      </> : <View className="items-center">
                        <Ionicons name="image-outline" size={32} color="#073318" className="mb-2" />
                        <Text className="text-xs text-[#073318] font-bold">{t("su_upload_pan_card_imag_228")}</Text>
                        <Text className="text-[11px] text-gray-400 font-medium mt-1">{t("su_png_jpg_up_to_5mb_229")}</Text>
                      </View>}
                  </TouchableOpacity>
                </View>
              </View>

              {docPhotosError ? <Text className="text-red-500 text-xs mt-4 text-center font-semibold">{docPhotosError}</Text> : null}

              <PrimaryButton title={t("continue")} onPress={handleNextStep7} loading={isSubmitting} />
            </FormContainer>
          </View>}

        {/* Step 8: Bank Details */}
        {step === 8 && <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection iconName="card-outline" title={t("su_bank_details_231")} subtitle={t("su_where_should_we_send_232")} />

              <View className="w-full">
                <InputField ref={accountNameRef} label={t("su_account_holder_name_233")} placeholder={t("su_enter_account_holder_234")} icon="person-outline" error={accountNameError} required={true} value={accountName} onChangeText={val => {
              const filtered = val.replace(/[^a-zA-Z\s]/g, '');
              setAccountName(filtered);
              if (!validateRequired(filtered)) {
                setAccountNameError(t("su_account_name_is_requ_235"));
              } else {
                setAccountNameError('');
              }
            }} onBlur={() => {
              if (!validateRequired(accountName)) setAccountNameError(t("su_account_name_is_requ_235"));
            }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => accountNumberRef.current?.focus()} />

                <InputField ref={accountNumberRef} label={t("su_account_number_237")} placeholder={t("su_enter_account_number_238")} icon="card-outline" error={accountNumberError} required={true} keyboardType="number-pad" maxLength={16} value={accountNumber} onChangeText={val => {
              const filtered = val.replace(/[^0-9]/g, '');
              setAccountNumber(filtered);
              if (!validateRequired(filtered)) {
                setAccountNumberError(t("val_account_number_required"));
              } else if (filtered.length < 8) {
                setAccountNumberError(t("su_enter_valid_account__240"));
              } else {
                setAccountNumberError('');
              }
            }} onBlur={() => {
              if (!validateRequired(accountNumber)) setAccountNumberError(t("val_account_number_required"));else if (accountNumber.length < 8) setAccountNumberError(t("su_enter_valid_account__240"));
            }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => ifscCodeRef.current?.focus()} />

                <InputField ref={ifscCodeRef} label={t("su_ifsc_code_243")} placeholder={t("su_e_g_sbin0001234_244")} icon="pricetag-outline" error={ifscError} required={true} autoCapitalize="characters" maxLength={11} value={ifscCode} onChangeText={val => {
              const upper = val.toUpperCase();
              setIfscCode(upper);
              if (!validateRequired(upper)) {
                setIfscError(t("val_ifsc_code_required"));
              } else if (!validateIfsc(upper)) {
                setIfscError(t("su_enter_valid_ifsc_cod_246"));
              } else {
                setIfscError('');
              }
            }} onBlur={() => {
              if (!validateRequired(ifscCode)) setIfscError(t("val_ifsc_code_required"));else if (!validateIfsc(ifscCode)) setIfscError(t("su_enter_valid_ifsc_cod_246"));
            }} loading={isFetchingIfsc} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => bankNameRef.current?.focus()} />

                <InputField ref={bankNameRef} label={isFetchingIfsc ? "Bank Name (Auto-fetching...)" : "Bank Name"} placeholder={t("su_enter_bank_name_or_a_249")} icon="business-outline" error={bankNameError} required={true} value={bankName} onChangeText={val => {
              setBankName(val);
              if (!validateRequired(val)) {
                setBankNameError(t("val_bank_name_required"));
              } else {
                setBankNameError('');
              }
            }} onBlur={() => {
              if (!validateRequired(bankName)) setBankNameError(t("val_bank_name_required"));
            }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => branchNameRef.current?.focus()} />

                <InputField ref={branchNameRef} label={isFetchingIfsc ? "Branch Name (Auto-fetching...)" : "Branch Name"} placeholder={t("su_enter_branch_name_252")} icon="location-outline" error={branchNameError} required={true} value={branchName} onChangeText={val => {
              const filtered = val.replace(/[^a-zA-Z\s]/g, '');
              setBranchName(filtered);
              setBranchNameError('');
            }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => upiIdRef.current?.focus()} />

                <InputField ref={upiIdRef} label={t("su_upi_id_optional_253")} placeholder={t("su_example_upi_254")} icon="wallet-outline" autoCapitalize="none" value={upiId} onChangeText={val => setUpiId(val.replace(/[^a-zA-Z0-9@.-]/g, ''))} suffixIcon={upiId.length > 0 ? /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId) ? "checkmark-circle" : "close-circle" : undefined} returnKeyType="done" onSubmitEditing={handleNextStep8} />
              </View>

              <PrimaryButton title={t("continue")} onPress={handleNextStep8} loading={isSubmitting} />
            </FormContainer>
          </View>}

        {/* Step 9: Other Details */}
        {step === 9 && <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection iconName="options-outline" title={t("su_other_details_256")} subtitle={t("su_help_us_assign_your__257")} />

              <View className="w-full">
                <View className="mb-4">
                  <Label text={t("storage_space_question")} required={true} />

                  {/* Width and Length fields */}
                  <View className="flex-row w-full mb-3 mt-1">
                    <View className="flex-1 mr-2">
                      <InputField ref={storageWidthRef} label={t("su_width_ft_258")} placeholder={t("su_ft_259")} icon="resize-outline" keyboardType="numeric" value={storageWidth} onChangeText={val => setStorageWidth(val.replace(/[^0-9.]/g, ''))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => storageLengthRef.current?.focus()} />
                    </View>
                    <View className="flex-1 ml-2">
                      <InputField ref={storageLengthRef} label={t("su_length_ft_260")} placeholder={t("su_ft_259")} icon="resize-outline" keyboardType="numeric" value={storageLength} onChangeText={val => setStorageLength(val.replace(/[^0-9.]/g, ''))} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => storageSpaceRef.current?.focus()} />
                    </View>
                  </View>

                  <InputField ref={storageSpaceRef} label={t("su_storage_space_descri_262")} placeholder={t("su_e_g_100_sqft_1_room__263")} icon="home-outline" error={storageSpaceError} required={false} value={storageSpace} onChangeText={val => {
                setStorageSpace(val);
                setStorageSpaceError('');
              }} returnKeyType="done" blurOnSubmit={true} />
                </View>

                <ToggleButtonGroup label={t("su_do_you_have_a_vehicl_264")} value={hasVehicle} error={hasVehicleError} required={true} onSelect={val => {
              setHasVehicle(val);
              setHasVehicleError('');
            }} />
                {hasVehicle === 'yes' && <Animated.View entering={FadeInUp.duration(400).springify()} className="w-full mt-4">
                    <DropdownField label={t("su_vehicle_type_265")} placeholder={t("su_select_vehicle_type_266")} icon="car-sport-outline" required={true} value={vehicleType ? t("opt_" + vehicleType) : ""} error={vehicleTypeError} onPress={() => setShowVehicleMenu(true)} />

                    <InputField ref={vehicleRegNoRef} label={t("su_vehicle_registration_267")} placeholder={t("su_e_g_mh09ab1234_268")} icon="card-outline" required={true} autoCapitalize="characters" maxLength={10} error={vehicleRegNoError} value={vehicleRegNo} onChangeText={val => {
                let clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const isBH = clean.length > 0 && /^[0-9O]/.test(clean[0]);
                let normalized = '';
                for (let i = 0; i < clean.length; i++) {
                  let char = clean[i];
                  if (isBH) {
                    if ((i === 0 || i === 1 || i >= 4 && i <= 7) && char === 'O') {
                      char = '0';
                    }
                  } else {
                    if ((i === 2 || i === 3) && char === 'O') {
                      char = '0';
                    }
                    if (clean.length >= 6 && i >= clean.length - 4 && char === 'O') {
                      char = '0';
                    }
                  }
                  normalized += char;
                }
                setVehicleRegNo(normalized);
                setVehicleRegNoError('');
              }} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => dlNumberRef.current?.focus()} />

                    <InputField ref={dlNumberRef} label={t("su_driving_license_numb_269")} placeholder={t("su_e_g_mh0920150123456_270")} icon="document-text-outline" required={true} autoCapitalize="characters" maxLength={15} error={dlNumberError} value={dlNumber} onChangeText={val => {
                let clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                let normalized = '';
                for (let i = 0; i < clean.length; i++) {
                  if (i >= 2 && clean[i] === 'O') {
                    normalized += '0';
                  } else {
                    normalized += clean[i];
                  }
                }
                setDlNumber(normalized);
                setDlNumberError('');
              }} returnKeyType="done" blurOnSubmit={true} />

                    <View className="mt-4 flex-row justify-between space-x-4">
                      <View className="flex-1 mr-2">
                        <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2 ml-1 text-center">{t("su_dl_photo_271")}<Text className="text-gray-400 font-normal tracking-normal">{t("su_optional_272")}</Text>
                        </Text>
                        <TouchableOpacity onPress={() => {
                    setUploadTarget('dlImage');
                    setShowPhotoMenu(true);
                  }} className={`bg-[#F9FAFB] rounded-[24px] border border-dashed h-28 items-center justify-center overflow-hidden relative mt-1 ${dlImage ? 'border-[#073318]' : 'border-gray-300'}`}>
                          {dlImage ? <>
                              <Image source={{
                        uri: dlImage
                      }} className="w-full h-full" resizeMode="cover" />
                              <TouchableOpacity onPress={e => {
                        e.stopPropagation();
                        setDlImage('');
                      }} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md" style={{
                        zIndex: 10
                      }}>
                                <Ionicons name="close" size={18} color="#B42318" />
                              </TouchableOpacity>
                            </> : <View className="items-center">
                              <Ionicons name="cloud-upload-outline" size={26} color="#073318" className="mb-1" />
                              <Text className="text-[11px] text-gray-400 font-semibold">{t("su_upload_dl_273")}</Text>
                            </View>}
                        </TouchableOpacity>
                      </View>
                      <View className="flex-1 ml-2">
                        <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2 ml-1 text-center">{t("su_vehicle_photo_274")}<Text className="text-gray-400 font-normal tracking-normal">{t("su_optional_272")}</Text>
                        </Text>
                        <TouchableOpacity onPress={() => {
                    setUploadTarget('vehicleImage');
                    setShowPhotoMenu(true);
                  }} className={`bg-[#F9FAFB] rounded-[24px] border border-dashed h-28 items-center justify-center overflow-hidden relative mt-1 ${vehicleImage ? 'border-[#073318]' : 'border-gray-300'}`}>
                          {vehicleImage ? <>
                              <Image source={{
                        uri: vehicleImage
                      }} className="w-full h-full" resizeMode="cover" />
                              <TouchableOpacity onPress={e => {
                        e.stopPropagation();
                        setVehicleImage('');
                      }} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md" style={{
                        zIndex: 10
                      }}>
                                <Ionicons name="close" size={18} color="#B42318" />
                              </TouchableOpacity>
                            </> : <View className="items-center">
                              <Ionicons name="cloud-upload-outline" size={26} color="#073318" className="mb-1" />
                              <Text className="text-[11px] text-gray-400 font-semibold">{t("su_upload_photo_276")}</Text>
                            </View>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Animated.View>}

                <View className="flex-row items-center mb-6 px-2 mt-6">
                  <TouchableOpacity onPress={() => {
                setTermsAccepted(!termsAccepted);
                setTermsError('');
              }} className={`w-6 h-6 border-2 rounded mr-3 items-center justify-center ${termsAccepted ? 'border-[#073318] bg-[#073318]' : 'border-gray-300 bg-white'}`}>
                    {termsAccepted && <Ionicons name="checkmark" size={16} color="white" />}
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.7} className="flex-1" onPress={() => {
                setTermsAccepted(!termsAccepted);
                setTermsError('');
              }}>
                    <Text className="text-textSecondary text-sm">{t("su_i_accept_the_277")}<Text className="text-[#073318] font-bold" onPress={e => {
                    e.stopPropagation();
                    navigation.navigate("Terms");
                  }}>{t("terms_conditions")}</Text>{t("and")}<Text className="text-[#073318] font-bold" onPress={e => {
                    e.stopPropagation();
                    navigation.navigate("Privacy");
                  }}>{t("privacy_title")}</Text>
                    </Text>
                    {termsError ? <Text className="text-red-500 text-xs mt-1">{termsError}</Text> : null}
                  </TouchableOpacity>
                </View>
              </View>

              <PrimaryButton title={t("submit_application")} onPress={handleNextStep9} loading={isSubmitting} iconName="checkmark-circle" />
            </FormContainer>
          </View>}

        {/* Step 10: Application Pending */}
        {step === 10 && <View className="flex-1 px-6 pt-10">
            <FormContainer style={{
          alignItems: 'center',
          padding: 32
        }}>
              <View className="w-20 h-20 bg-[#FEF3C7] rounded-full items-center justify-center mb-6">
                <Ionicons name="hourglass-outline" size={40} color="#D97706" />
              </View>

              <Text className="text-2xl font-extrabold text-[#111827] mb-3 text-center">{t('application_review')}</Text>

              <Text className="text-[#6B7280] text-sm text-center mb-8 font-semibold leading-5 px-2">
                {t('application_pending_desc')}
              </Text>

              <View className="w-full bg-[#F9FAFB] py-4 px-5 rounded-[24px] border border-gray-200 mb-8">
                <View className="mb-4">
                  <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">{t('request_id')}</Text>
                  <Text className="text-lg font-extrabold text-[#073318]">{generatedRequestId || '#LOG-PENDING'}</Text>
                </View>
                <View className="border-t border-gray-200 pt-3">
                  <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">{t('estimated_time')}</Text>
                  <Text className="text-sm font-bold text-[#111827]">{t("su_24_48_hours_282")}</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => navigation.navigate("Login")} className="bg-[#073318] py-4 rounded-full items-center justify-center flex-row w-full mt-2" style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 4
            },
            shadowOpacity: 0.3,
            shadowRadius: 5,
            elevation: 8
          }}>
                <Text className="text-white text-[18px] font-bold tracking-wide mr-2">{t('login')}</Text>
                <Ionicons name="log-in-outline" size={20} color="white" />
              </TouchableOpacity>
            </FormContainer>
          </View>}

        {/* Footer (Only for Step 0 and 1) */}
        {(step === 0 || step === 1) && <View className="items-center px-6 mb-6 mt-auto">
            <Text className="text-textSecondary text-xs text-center">
              {t('i_accept')}
              <Text className="text-primary font-bold" onPress={() => navigation.navigate("Terms")}> {t('terms_conditions')} </Text>{t('and')}<Text className="text-primary font-bold" onPress={() => navigation.navigate("Privacy")}> {t('privacy_title')}</Text>
            </Text>
          </View>}

      </KeyboardAwareScrollView>

      {/* Language Menu Modal */}
      <Modal visible={showLangMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowLangMenu(false)}>
          <View className="flex-1" style={{
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
            <TouchableWithoutFeedback>
              <View className="absolute top-20 right-6 bg-white rounded-2xl shadow-lg border border-gray-100 w-44 overflow-hidden">
                <TouchableOpacity className={`p-4 border-b border-gray-100 flex-row items-center justify-between ${locale === "en" ? "bg-[#EEF5F0]" : ""}`} onPress={() => {
                changeLanguage("en");
                setShowLangMenu(false);
              }}>
                  <Text className={`text-base font-bold ${locale === "en" ? "text-primary" : "text-textPrimary"}`}>{t('english')}</Text>
                  {locale === "en" && <Ionicons name="checkmark" size={18} color="#073318" />}
                </TouchableOpacity>
                <TouchableOpacity className={`p-4 border-b border-gray-100 flex-row items-center justify-between ${locale === "hi" ? "bg-[#EEF5F0]" : ""}`} onPress={() => {
                changeLanguage("hi");
                setShowLangMenu(false);
              }}>
                  <Text className={`text-base font-bold ${locale === "hi" ? "text-primary" : "text-textPrimary"}`}>{t('hindi')}</Text>
                  {locale === "hi" && <Ionicons name="checkmark" size={18} color="#073318" />}
                </TouchableOpacity>
                <TouchableOpacity className={`p-4 flex-row items-center justify-between ${locale === "mr" ? "bg-[#EEF5F0]" : ""}`} onPress={() => {
                changeLanguage("mr");
                setShowLangMenu(false);
              }}>
                  <Text className={`text-base font-bold ${locale === "mr" ? "text-primary" : "text-textPrimary"}`}>{t('marathi')}</Text>
                  {locale === "mr" && <Ionicons name="checkmark" size={18} color="#073318" />}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Photo Options Modal */}
      <Modal visible={showPhotoMenu} transparent={true} animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowPhotoMenu(false)}>
          <View className="flex-1 justify-end" style={{
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-lg font-bold text-textPrimary mb-4">{t("su_upload_photo_276")}</Text>
                <TouchableOpacity onPress={takeSelfie} className="flex-row items-center p-4 border-b border-gray-100">
                  <Ionicons name="camera-outline" size={24} color="#073318" />
                  <Text className="text-base font-medium ml-4">{t("su_take_photo_284")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickFromGallery} className="flex-row items-center p-4">
                  <Ionicons name="image-outline" size={24} color="#073318" />
                  <Text className="text-base font-medium ml-4">{t("su_upload_from_gallery_285")}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* SHG Experience Modal */}
      <Modal visible={showExperienceMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => {
        setShowExperienceMenu(false);
        if (!shgExperience) setShgExperienceError(t("su_please_select_experi_32"));
      }}>
          <View className="flex-1 justify-end" style={{
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">{t("su_shg_experience_287")}</Text>
                {['1_2_years', '3_5_years', '5__years'].map(opt => {
                const isSelected = shgExperience === opt;
                return <TouchableOpacity key={opt} onPress={() => {
                  setShgExperience(opt);
                  setShgExperienceError('');
                  setShowExperienceMenu(false);
                }} className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}>
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{t("opt_" + opt)}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>;
              })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Vehicle Type Menu */}
      <Modal visible={showVehicleMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => {
        setShowVehicleMenu(false);
        if (!vehicleType) setVehicleTypeError(t("su_please_select_vehicl_288"));
      }}>
          <View className="flex-1 justify-end" style={{
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">{t("su_select_vehicle_type_289")}</Text>
                {['bike___scooty', 'auto___cargo', 'car___pickup', 'other'].map(opt => {
                const isSelected = vehicleType === opt;
                return <TouchableOpacity key={opt} onPress={() => {
                  setVehicleType(opt);
                  setVehicleTypeError('');
                  setShowVehicleMenu(false);
                }} className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}>
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{t("opt_" + opt)}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>;
              })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* SHG Role Modal */}
      <Modal visible={showRoleMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => {
        setShowRoleMenu(false);
        if (!shgRole) setShgRoleError(t("su_please_select_role_290"));
      }}>
          <View className="flex-1 justify-end" style={{
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">{t("su_your_role_130")}</Text>
                {['crp', 'leader', 'member'].map(opt => {
                const isSelected = shgRole === opt;
                return <TouchableOpacity key={opt} onPress={() => {
                  setShgRole(opt);
                  setShgRoleError('');
                  setShowRoleMenu(false);
                }} className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}>
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{t("opt_" + opt)}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>;
              })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Category Menu */}
      <Modal visible={showCategoryMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => {
        setShowCategoryMenu(false);
        if (!productCategory) setProductCategoryError(t("su_please_select_catego_50"));
      }}>
          <View className="flex-1 justify-end" style={{
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">{t("su_category_167")}</Text>
                {['food', 'handmade', 'agriculture', 'other'].map(opt => {
                const isSelected = productCategory === opt;
                return <TouchableOpacity key={opt} onPress={() => {
                  setProductCategory(opt);
                  setProductCategoryError('');
                  setShowCategoryMenu(false);
                }} className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}>
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{t("opt_" + opt)}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>;
              })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Unit Menu */}
      <Modal visible={showUnitMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => {
        setShowUnitMenu(false);
        if (!productUnit) setProductUnitError(t("su_please_select_unit_53"));
      }}>
          <View className="flex-1 justify-end" style={{
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">{t("su_unit_173")}</Text>
                <ScrollView style={{
                maxHeight: 400
              }} showsVerticalScrollIndicator={false}>
                  {UNIT_DATA.map(opt => {
                  const isSelected = productUnit === opt.uom_code;
                  return <TouchableOpacity key={opt.uom_code} onPress={() => {
                    setProductUnit(opt.uom_code);
                    setProductUnitError('');
                    setShowUnitMenu(false);
                  }} className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}>
                        <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{t("unit_" + opt.uom_code.toLowerCase())}</Text>
                        {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                      </TouchableOpacity>;
                })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Pincode Menu */}
      <Modal visible={showPincodeMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowPincodeMenu(false)}>
          <View className="flex-1 justify-end" style={{
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">{t("su_select_pincode_296")}</Text>
                {PINCODE_DATA.map(opt => {
                const isSelected = pincode === opt.pincode;
                return <TouchableOpacity key={opt.pincode} onPress={() => handlePincodeSelect(opt.pincode)} className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}>
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{opt.pincode}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>;
              })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Post Office Menu */}
      <Modal visible={showPostOfficeMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowPostOfficeMenu(false)}>
          <View className="flex-1 justify-end" style={{
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">{t("post_office")}</Text>
                <ScrollView style={{
                maxHeight: 400
              }} showsVerticalScrollIndicator={false}>
                  {postOfficeList.map(opt => {
                  const isSelected = postOffice === opt;
                  return <TouchableOpacity key={opt} onPress={() => {
                    setPostOffice(opt);
                    setPostOfficeError('');
                    setShowPostOfficeMenu(false);
                  }} className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}>
                        <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{opt}</Text>
                        {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                      </TouchableOpacity>;
                })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Village Menu */}
      <Modal visible={showVillageMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowVillageMenu(false)}>
          <View className="flex-1 justify-end" style={{
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">{t("su_select_village_297")}</Text>
                <ScrollView style={{
                maxHeight: 400
              }} showsVerticalScrollIndicator={false}>
                  {villageList.map(opt => {
                  const isSelected = village === opt;
                  return <TouchableOpacity key={opt} onPress={() => {
                    setVillage(opt);
                    setVillageError('');
                    setShowVillageMenu(false);
                  }} className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}>
                        <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{opt}</Text>
                        {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                      </TouchableOpacity>;
                })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Area Menu */}
      <Modal visible={showAreaMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowAreaMenu(false)}>
          <View className="flex-1 justify-end" style={{
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">{t("su_select_street_area_298")}</Text>
                {selectedData?.areas?.map((opt: string) => {
                const isSelected = streetArea === opt;
                return <TouchableOpacity key={opt} onPress={() => {
                  setStreetArea(opt);
                  setStreetAreaError('');
                  setShowAreaMenu(false);
                }} className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}>
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{t("opt_" + opt)}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>;
              })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Individual Role Modal */}
      <Modal visible={showIndividualRoleMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => {
        setShowIndividualRoleMenu(false);
        if (!individualRole) setIndividualRoleError(t("su_please_select_occupa_299"));
      }}>
          <View className="flex-1 justify-end" style={{
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">{t("su_select_your_occupati_121")}</Text>
                {['driver', 'shopkeeper___business_owner', 'student___job_seeker', 'farmer', 'self_employed', 'other'].map(opt => {
                const isSelected = individualRole === opt;
                return <TouchableOpacity key={opt} onPress={() => {
                  setIndividualRole(opt);
                  setIndividualRoleError('');
                  setShowIndividualRoleMenu(false);
                }} className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}>
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{t("opt_" + opt)}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>;
              })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>;
}