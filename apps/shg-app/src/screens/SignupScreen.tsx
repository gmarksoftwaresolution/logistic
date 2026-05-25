import React, { useState, useRef, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Modal, TouchableWithoutFeedback, Image, ActivityIndicator } from "react-native";
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

const UNIT_DATA = [
  { full_name_of_measurement: 'BAGS', unit_name: 'Quantity', uom_code: 'BAG' },
  { full_name_of_measurement: 'BALE', unit_name: 'Quantity', uom_code: 'BAL' },
  { full_name_of_measurement: 'BUNDLES', unit_name: 'Quantity', uom_code: 'BDL' },
  { full_name_of_measurement: 'BUCKLES', unit_name: 'Quantity', uom_code: 'BKL' },
  { full_name_of_measurement: 'BILLIONS OF UNITS', unit_name: 'Quantity', uom_code: 'BOU' },
  { full_name_of_measurement: 'BOX', unit_name: 'Quantity', uom_code: 'BOX' },
  { full_name_of_measurement: 'BOTTLES', unit_name: 'Quantity', uom_code: 'BTL' },
  { full_name_of_measurement: 'BUNCHES', unit_name: 'Quantity', uom_code: 'BUN' },
  { full_name_of_measurement: 'CANS', unit_name: 'Quantity', uom_code: 'CAN' },
  { full_name_of_measurement: 'CUBIC METER', unit_name: 'Volume', uom_code: 'CBM' },
  { full_name_of_measurement: 'CUBIC CENTIMETER', unit_name: 'Volume', uom_code: 'CCM' },
  { full_name_of_measurement: 'CENTIMETER', unit_name: 'Length', uom_code: 'CMS' },
  { full_name_of_measurement: 'CARTONS', unit_name: 'Quantity', uom_code: 'CTN' },
  { full_name_of_measurement: 'DOZEN', unit_name: 'Quantity', uom_code: 'DOZ' },
  { full_name_of_measurement: 'DRUM', unit_name: 'Quantity', uom_code: 'DRM' },
  { full_name_of_measurement: 'GREAT GROSS', unit_name: 'Quantity', uom_code: 'GGR' },
  { full_name_of_measurement: 'GRAMS', unit_name: 'Weight', uom_code: 'GMS' },
  { full_name_of_measurement: 'GROSS', unit_name: 'Quantity', uom_code: 'GRS' },
  { full_name_of_measurement: 'GROSS YARDS', unit_name: 'Length', uom_code: 'GYD' },
  { full_name_of_measurement: 'KILOGRAMS', unit_name: 'Weight', uom_code: 'KGS' },
  { full_name_of_measurement: 'KILOLITER', unit_name: 'Volume', uom_code: 'KLR' },
  { full_name_of_measurement: 'KILOMETER', unit_name: 'Length', uom_code: 'KME' },
  { full_name_of_measurement: 'MILLILITER', unit_name: 'Volume', uom_code: 'MLT' },
  { full_name_of_measurement: 'METERS', unit_name: 'Length', uom_code: 'MTR' },
  { full_name_of_measurement: 'METRIC TONS', unit_name: 'Weight', uom_code: 'MTS' },
  { full_name_of_measurement: 'NUMBERS', unit_name: 'Quantity', uom_code: 'NOS' },
  { full_name_of_measurement: 'PACKS', unit_name: 'Quantity', uom_code: 'PAC' },
  { full_name_of_measurement: 'PIECES', unit_name: 'Quantity', uom_code: 'PCS' },
  { full_name_of_measurement: 'PAIRS', unit_name: 'Quantity', uom_code: 'PRS' },
  { full_name_of_measurement: 'QUINTAL', unit_name: 'Weight', uom_code: 'QTL' },
  { full_name_of_measurement: 'ROLLS', unit_name: 'Quantity', uom_code: 'ROL' },
  { full_name_of_measurement: 'SETS', unit_name: 'Quantity', uom_code: 'SET' },
  { full_name_of_measurement: 'TABLETS', unit_name: 'Quantity', uom_code: 'TBS' },
  { full_name_of_measurement: 'TEN GROSS', unit_name: 'Quantity', uom_code: 'TGM' },
  { full_name_of_measurement: 'THOUSANDS', unit_name: 'Quantity', uom_code: 'THD' },
  { full_name_of_measurement: 'TONNES', unit_name: 'Weight', uom_code: 'TON' },
  { full_name_of_measurement: 'TUBES', unit_name: 'Quantity', uom_code: 'TUB' },
  { full_name_of_measurement: 'US GALLONS', unit_name: 'Volume', uom_code: 'UGS' },
  { full_name_of_measurement: 'UNITS', unit_name: 'Quantity', uom_code: 'UNT' },
  { full_name_of_measurement: 'YARDS', unit_name: 'Length', uom_code: 'YDS' },
  { full_name_of_measurement: 'MILLIMETER', unit_name: 'Length', uom_code: 'MMT' },
  { full_name_of_measurement: 'Inch', unit_name: 'Length', uom_code: 'INH' },
  { full_name_of_measurement: 'Foot', unit_name: 'Length', uom_code: 'FT' },
  { full_name_of_measurement: 'MILE', unit_name: 'Length', uom_code: 'MIL' },
  { full_name_of_measurement: 'MILLIGRAM', unit_name: 'Weight', uom_code: 'MGM' },
  { full_name_of_measurement: 'POUND', unit_name: 'Weight', uom_code: 'LBS' },
  { full_name_of_measurement: 'LITER', unit_name: 'Volume', uom_code: 'LTR' },
  { full_name_of_measurement: 'SQUARE MILLIMETER', unit_name: 'Area', uom_code: 'SQMM' },
  { full_name_of_measurement: 'SQUARE CENTIMETER', unit_name: 'Area', uom_code: 'SQCM' },
  { full_name_of_measurement: 'ACRE', unit_name: 'Area', uom_code: 'ACR' },
  { full_name_of_measurement: 'HECTARE', unit_name: 'Area', uom_code: 'HTR' },
  { full_name_of_measurement: 'OTHERS', unit_name: '-', uom_code: 'OTH' },
];

const PINCODE_DATA = [
  {
    pincode: "416509",
    state: "Maharashtra",
    district: "Kolhapur",
    taluka: "Chandgad",
    villages: ["Halkarni", "Naganwadi", "Patne"],
    areas: ["Main Road", "Market Area", "School Area"]
  },
  {
    pincode: "416502",
    state: "Maharashtra",
    district: "Kolhapur",
    taluka: "Gadhinglaj",
    villages: ["Gadhinglaj", "Mahagaon", "Kadgaon"],
    areas: ["Station Road", "Bazaar Peth", "College Road"]
  },
  {
    pincode: "416507",
    state: "Maharashtra",
    district: "Kolhapur",
    taluka: "Ajara",
    villages: ["Ajara", "Uttur", "Nesari"],
    areas: ["Bus Stand Area", "Market Yard", "Temple Road"]
  },
  {
    pincode: "416504",
    state: "Maharashtra",
    district: "Kolhapur",
    taluka: "Bhudargad",
    villages: ["Gargoti", "Kadgaon", "Shindewadi"],
    areas: ["Main Chowk", "Hospital Area", "School Road"]
  }
];

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

export default function SignupScreen({ navigation }: Props) {
  const context = useContext(LanguageContext);
  const { updateUser, login } = useUser();
  if (!context) return null;
  const { locale, changeLanguage, t } = context;

  const [step, setStep] = useState<number>(0);

  const getStepDetails = () => {
    const isShg = selectedRole === 'SHG';
    const totalSteps = isShg ? 7 : 5;

    let currentStep = 1;
    if (isShg) {
      currentStep = Math.max(1, step - 2);
    } else {
      if (step === 3) currentStep = 1;
      else if (step === 6) currentStep = 2;
      else if (step === 7) currentStep = 3;
      else if (step === 8) currentStep = 4;
      else if (step === 9) currentStep = 5;
    }
    return { currentStep, totalSteps };
  };

  const getStepIndicator = () => {
    if (step < 3 || step > 9) return null;
    const { currentStep, totalSteps } = getStepDetails();
    return `Step ${currentStep} of ${totalSteps}`;
  };

  // Step 0: Role Selection
  const [selectedRole, setSelectedRole] = useState<'SHG' | 'Individual' | null>(null);

  // Step 1 & 2: Mobile Auth States
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
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
  const [isShgLeader, setIsShgLeader] = useState<'Yes' | 'No' | null>(null);
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
  const [producesProducts, setProducesProducts] = useState<'Yes' | 'No' | null>(null);
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
  const [stateName, setStateName] = useState('');
  const [stateNameError, setStateNameError] = useState('');
  const [district, setDistrict] = useState('');
  const [districtError, setDistrictError] = useState('');
  const [taluka, setTaluka] = useState('');
  const [talukaError, setTalukaError] = useState('');
  const [village, setVillage] = useState('');
  const [villageError, setVillageError] = useState('');
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
  const { control, setValue, watch, trigger, getValues, formState: { errors } } = useForm({
    mode: 'onBlur',
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

  const [hasVehicle, setHasVehicle] = useState<'Yes' | 'No' | null>(null);
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
      return { dataKey: STORAGE_KEYS.SIGNUP_DATA_INDIVIDUAL, stepKey: STORAGE_KEYS.CURRENT_STEP_INDIVIDUAL };
    }
    return { dataKey: STORAGE_KEYS.SIGNUP_DATA_SHG, stepKey: STORAGE_KEYS.CURRENT_STEP_SHG };
  };

  const handleRoleSelection = (role: 'SHG' | 'Individual') => {
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
      const { dataKey, stepKey } = getStorageKeys(selectedRole);
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
    if (step > 2) { // Only save after OTP is verified
      saveSignupProgress(step);
    }
  }, [
    step, selectedRole, fullName, age, profileImage, shgRole, shgName, shgExperience,
    shgGroupSize, leaderName, leaderMobile, crpName, crpMobile, crpEmail, isShgLeader,
    producesProducts, businessTeamSize, productName, productCategory, otherCategory,
    dailyProduction, productUnit, weeklyProduction, productPrice, pincode, stateName,
    district, taluka, village, streetArea, houseNo, landmark, aadhaarNumber, panNumber,
    aadhaarFront, aadhaarBack, panImage, accountName, bankName, branchName, accountNumber,
    ifscCode, upiId, storageSpace, storageWidth, storageLength, hasVehicle, vehicleType,
    vehicleRegNo, dlNumber, dlImage, vehicleImage, generatedRequestId, individualRole
  ]);

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
            setIfscError('Invalid IFSC Code');
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

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
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
      } else {
        const fetchPincodeData = async () => {
          try {
            const data = await signupService.getPincodeDetails(pincode);
            if (data) {
              setSelectedData(data);
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
          setIfscError('Invalid IFSC code');
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
    if (mobile.length !== 10) {
      setMobileError(t('enter_10_digit'));
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
      Toast.show({ type: 'success', text1: 'OTP Sent Successfully' });
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      if (displayMessage && displayMessage.toLowerCase().includes('already registered')) {
        setMobileError("This mobile number is already registered. Please log in or use a different number.");
      } else {
        Toast.show({ type: 'error', text1: 'Failed to send OTP', text2: displayMessage || 'Please check your mobile number and try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setIsSubmitting(true);
    try {
      await authService.sendSignupOtp(mobile);
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      Toast.show({ type: 'success', text1: 'OTP Resent Successfully' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to resend OTP', text2: 'Please try again after some time.' });
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
            const { dataKey, stepKey } = getStorageKeys(selectedRole);
            await AsyncStorage.setItem(stepKey, progressRes.frontendStep.toString());
            await AsyncStorage.setItem(dataKey, JSON.stringify({ ...progressRes.signupData, mobile }));
            Toast.show({ type: 'success', text1: 'Mobile Verified', text2: 'Resuming your registration progress' });
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch signup progress on verification:', err);
      }

      const { dataKey, stepKey } = getStorageKeys(selectedRole);
      const savedStep = await AsyncStorage.getItem(stepKey);
      const savedData = await AsyncStorage.getItem(dataKey);

      if (savedData && savedStep) {
        const data = JSON.parse(savedData);
        // Only resume if the verified mobile number matches the saved progress AND the selected role matches
        if (data.mobile === mobile && data.selectedRole === selectedRole && parseInt(savedStep, 10) > 2) {
          populateSignupState(data);
          setStep(parseInt(savedStep, 10));
          Toast.show({ type: 'success', text1: 'Mobile Verified', text2: 'Resuming your progress' });
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
          Toast.show({ type: 'success', text1: 'Mobile Verified', text2: 'Starting new signup' });
          return;
        }
      }

      // If no saved progress at all
      setStep(3);
      setIsRecentlyVerified(true);
      Toast.show({ type: 'success', text1: 'Mobile Verified', text2: 'Starting new signup' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: 'The OTP you entered is incorrect.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (val: string, index: number) => {
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
      Toast.show({ type: 'success', text1: 'Photo Uploaded' });
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: displayMessage });
    } finally {
      setIsSubmitting(false);
      setUploadLoading(null);
    }
  };

  const pickFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.5,
    });
    if (!result.canceled) {
      handleImagePicked(result.assets[0].uri);
    }
    setShowPhotoMenu(false);
  };

  const takeSelfie = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.5,
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
      setFullNameError('Full name is required');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = fullNameRef;
    }

    if (!age.trim()) {
      setAgeError('Age is required');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = ageRef;
    } else {
      const ageNum = Number(age);
      if (isNaN(ageNum)) {
        setAgeError('Age must be a valid number');
        isValid = false;
      if (!firstInvalidRef) firstInvalidRef = ageRef;
      } else if (ageNum < 18) {
        setAgeError('You must be at least 18 years old to create an account and continue using this service.');
        isValid = false;
      if (!firstInvalidRef) firstInvalidRef = ageRef;
      } else if (ageNum > 99) {
        setAgeError('Please enter a valid age (18-99)');
        isValid = false;
      }
    }

    if (selectedRole === 'Individual') {
      if (!individualRole) {
        setIndividualRoleError('Please select your role');
        isValid = false;
      } else if (individualRole === 'Other' && !validateRequired(otherOccupation)) {
        setOtherOccupationError('Please specify your occupation');
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
        userType: selectedRole === 'Individual' ? 'INDIVIDUAL' : 'SHG',
        fullName,
        age: parseInt(age, 10),
        photoUrl: profileImage || undefined,
      });

      // Capture shgUniqueId and update context
      if (response.user?.shgUniqueId) {
        setGeneratedRequestId(response.user.shgUniqueId);
        updateUser({ shgUniqueId: response.user.shgUniqueId });
      }

      // 2. Submit Role for Individual users
      if (selectedRole === 'Individual') {
        const roleMap: Record<string, string> = {
          'Delivery Partner': 'DELIVERY_PARTNER',
          'Driver': 'DRIVER',
          'Shopkeeper / Business Owner': 'SHOPKEEPER',
          'Student / Job Seeker': 'STUDENT',
          'Farmer': 'FARMER',
          'Self-employed': 'SELF_EMPLOYED',
          'Other': 'OTHER'
        };
        await signupService.submitNonShgRole({
          nonShgRole: roleMap[individualRole] || 'OTHER'
        });
      }

      if (selectedRole === 'Individual') {
        setStep(6);
      } else {
        setStep(4);
      }
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({ type: 'error', text1: 'Submission Failed', text2: displayMessage });
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

    if (!shgRole) { setShgRoleError('Please select your role'); isValid = false; }

    if (shgRole === 'CRP') {
      if (isShgLeader === null) { setIsShgLeaderError('Please select if you are the leader'); isValid = false; }
      if (!shgName.trim()) { setShgNameError('SHG name is required'); isValid = false;
      if (!firstInvalidRef) firstInvalidRef = shgNameRef; }
      if (!shgExperience) { setShgExperienceError('Please select experience'); isValid = false; }
      if (!shgGroupSize || isNaN(Number(shgGroupSize))) { setShgGroupSizeError('Group size is required'); isValid = false;
      if (!firstInvalidRef) firstInvalidRef = shgGroupSizeRef; }
      if (!leaderName.trim()) { setLeaderNameError('Leader name is required'); isValid = false;
      if (!firstInvalidRef) firstInvalidRef = leaderNameRef; }
      if (leaderMobile.length !== 10) {
        setLeaderMobileError('Enter 10-digit mobile number');
        isValid = false;
      if (!firstInvalidRef) firstInvalidRef = leaderMobileRef;
      } else if (!/^[6-9]/.test(leaderMobile)) {
        setLeaderMobileError('Mobile number must start from 6');
        isValid = false;
      if (!firstInvalidRef) firstInvalidRef = leaderMobileRef;
      }
    } else if (shgRole && shgRole !== 'CRP') {
      if (!shgName.trim()) { setShgNameError('SHG name is required'); isValid = false;
      if (!firstInvalidRef) firstInvalidRef = shgNameRef; }
      if (!crpName.trim()) { setCrpNameError('CRP name is required'); isValid = false;
      if (!firstInvalidRef) firstInvalidRef = crpNameRef; }
      if (crpMobile.length !== 10) {
        setCrpMobileError('Enter 10-digit mobile number');
        isValid = false;
      if (!firstInvalidRef) firstInvalidRef = crpMobileRef;
      } else if (!/^[6-9]/.test(crpMobile)) {
        setCrpMobileError('Mobile number must start from 6');
        isValid = false;
      if (!firstInvalidRef) firstInvalidRef = crpMobileRef;
      }
      if (!shgGroupSize || isNaN(Number(shgGroupSize))) { setShgGroupSizeError('Group size is required'); isValid = false;
      if (!firstInvalidRef) firstInvalidRef = shgGroupSizeRef; }
      if (!shgExperience) { setShgExperienceError('Please select experience'); isValid = false; }

      if (shgRole === 'Member') {
        if (!leaderName.trim()) { setLeaderNameError('Leader name is required'); isValid = false;
      if (!firstInvalidRef) firstInvalidRef = leaderNameRef; }
        if (leaderMobile.length !== 10) {
          setLeaderMobileError('Enter 10-digit mobile number');
          isValid = false;
      if (!firstInvalidRef) firstInvalidRef = leaderMobileRef;
        } else if (!/^[6-9]/.test(leaderMobile)) {
          setLeaderMobileError('Mobile number must start from 6');
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
        '1-2 years': 'ONE_TO_TWO_YEARS',
        '3-5 years': 'THREE_TO_FIVE_YEARS',
        '5+ years': 'FIVE_PLUS_YEARS'
      };
      const roleMap: Record<string, string> = {
        'CRP': 'CRP',
        'Leader': 'LEADER',
        'Member': 'MEMBER'
      };

      const shgDetails: any = {
        shgRole: roleMap[shgRole] || 'MEMBER',
      };

      if (shgRole === 'CRP') {
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

        if (shgRole === 'Member') {
          shgDetails.shgLeaderName = leaderName;
          shgDetails.shgLeaderContact = leaderMobile;
        } else if (shgRole === 'Leader') {
          shgDetails.shgLeaderName = fullName;
          shgDetails.shgLeaderContact = mobile;
        }
      }

      await signupService.submitShgDetails(shgDetails);

      setStep(5);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({ type: 'error', text1: 'Submission Failed', text2: displayMessage });
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
      setProducesProductsError('Please select if you produce any products');
      isValid = false;
    }

    if (producesProducts === 'Yes') {
      if (!businessTeamSize || isNaN(Number(businessTeamSize))) {
        setBusinessTeamSizeError('Business team size is required');
        isValid = false;
      if (!firstInvalidRef) firstInvalidRef = businessTeamSizeRef;
      }
      if (!productName.trim()) {
        setProductNameError('Product name is required');
        isValid = false;
      if (!firstInvalidRef) firstInvalidRef = productNameRef;
      }
      if (!productCategory) {
        setProductCategoryError('Please select category');
        isValid = false;
      } else if (productCategory === 'Other') {
        if (!otherCategory.trim()) {
          setOtherCategoryError('Category name is required');
          isValid = false;
      if (!firstInvalidRef) firstInvalidRef = otherCategoryRef;
        }
      }
      if (!dailyProduction.trim()) {
        setDailyProductionError('Quantity is required');
        isValid = false;
      if (!firstInvalidRef) firstInvalidRef = dailyProductionRef;
      }
      if (!productUnit) {
        setProductUnitError('Please select unit');
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
        'Food': 'FOOD',
        'Handmade': 'HANDMADE',
        'Agriculture': 'AGRICULTURE',
        'Other': 'OTHER'
      };

      await signupService.submitProducts({
        producesProduct: producesProducts === 'Yes',
        businessTeamSize: businessTeamSize ? parseInt(businessTeamSize, 10) : undefined,
        products: producesProducts === 'Yes' ? [{
          productName,
          category: categoryMap[productCategory] || 'OTHER',
          dailyProductionQty: parseFloat(dailyProduction),
          unit: productUnit.toUpperCase(),
          weeklyProduction: weeklyProduction ? parseFloat(weeklyProduction) : undefined,
          price: productPrice ? parseFloat(productPrice) : undefined,
        }] : [],
      });

      setStep(6);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({ type: 'error', text1: 'Submission Failed', text2: displayMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep6 = async () => {
    let isValid = true;
    let firstInvalidRef: any = null;
    setPincodeError('');
    setVillageError('');
    setStreetAreaError('');
    setTalukaError('');
    setDistrictError('');
    setStateNameError('');
    setHouseNoError('');
    setLandmarkError('');

    if (!pincode) {
      setPincodeError('Pincode is required');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = pincodeRef;
    }
    if (!village) {
      setVillageError('Village is required');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = villageRef;
    }
    if (!landmark) {
      setLandmarkError('Delivery Address is required');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = landmarkRef;
    }
    if (!taluka) {
      setTalukaError('Taluka is required');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = talukaRef;
    }
    if (!district) {
      setDistrictError('Please select district');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = districtRef;
    }
    if (!stateName) {
      setStateNameError('Please select state');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = stateNameRef;
    }
    if (!houseNo) {
      setHouseNoError('House No is required');
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
      });
      setStep(7);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({ type: 'error', text1: 'Submission Failed', text2: displayMessage });
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
      setAadhaarError('Enter 12-digit Aadhaar number');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = aadhaarNumberRef;
    }
    if (panNumber.length !== 10) {
      setPanError('Enter 10-character PAN number');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = panNumberRef;
    }
    if (!aadhaarFront || !aadhaarBack || !panImage) {
      setDocPhotosError('Please upload all required document photos');
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
        panCardUrl: panImage || undefined,
      });
      setStep(8);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({ type: 'error', text1: 'Submission Failed', text2: displayMessage });
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
      setAccountNameError('Account holder name is required');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = accountNameRef;
    }
    if (!accountNumber.trim()) {
      setAccountNumberError('Account number is required');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = accountNumberRef;
    }
    if (!ifscCode.trim()) {
      setIfscError('IFSC code is required');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = ifscCodeRef;
    }
    if (!bankName.trim()) {
      setBankNameError('Bank name is required');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = bankNameRef;
    }
    if (!branchName.trim()) {
      setBranchNameError('Branch name is required');
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
        upiId: upiId || undefined,
      });
      setStep(9);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({ type: 'error', text1: 'Submission Failed', text2: displayMessage });
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
      setStorageSpaceError('Storage space information is required');
      isValid = false;
      if (!firstInvalidRef) firstInvalidRef = storageSpaceRef;
    }
    if (!hasVehicle) {
      setHasVehicleError('Please select vehicle status');
      isValid = false;
    } else if (hasVehicle === 'Yes') {
      if (!vehicleType) {
        setVehicleTypeError('Vehicle type is required');
        isValid = false;
      }

      cleanRegNo = vehicleRegNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (cleanRegNo) {
        const isBH = cleanRegNo.length > 0 && /^[0-9O]/.test(cleanRegNo[0]);
        let normalized = '';
        for (let i = 0; i < cleanRegNo.length; i++) {
          let char = cleanRegNo[i];
          if (isBH) {
            if ((i === 0 || i === 1 || (i >= 4 && i <= 7)) && char === 'O') {
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
        setVehicleRegNoError('Registration number is required');
        isValid = false;
      if (!firstInvalidRef) firstInvalidRef = vehicleRegNoRef;
      } else if (!indianVehicleRegRegex.test(cleanRegNo)) {
        setVehicleRegNoError('Invalid vehicle number. Please enter a valid registration number');
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
        setDlNumberError('Driving License number is required');
        isValid = false;
      if (!firstInvalidRef) firstInvalidRef = dlNumberRef;
      } else if (!indianDlRegex.test(cleanDl)) {
        setDlNumberError('Invalid Driving License format');
        isValid = false;
      if (!firstInvalidRef) firstInvalidRef = dlNumberRef;
      }
    }
    if (!termsAccepted) {
      setTermsError('You must accept terms & conditions');
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
        'Bike / Scooty': 'TWO_WHEELER',
        'Auto / Cargo': 'THREE_WHEELER',
        'Car / Pickup': 'FOUR_WHEELER',
        'Other': 'OTHER'
      };

      const response = await signupService.submitOtherDetails({
        storageSpace: storageSpace.trim(),
        hasVehicle: hasVehicle === 'Yes',
        vehicle: hasVehicle === 'Yes' ? {
          vehicleType: vehicleTypeMap[vehicleType] || undefined,
          vehicleRegistrationNo: cleanRegNo || undefined,
          drivingLicenseNumber: cleanDl || undefined,
          drivingLicenseImageUrl: dlImage || undefined,
          vehicleImageUrl: vehicleImage || undefined,
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
      const { dataKey, stepKey } = getStorageKeys(selectedRole);
      await AsyncStorage.removeItem(dataKey);
      await AsyncStorage.removeItem(stepKey);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      if (serverMessage) {
        const messages = Array.isArray(serverMessage) ? serverMessage : [serverMessage];
        let mappedError = false;
        messages.forEach((msg: string) => {
          if (msg.toLowerCase().includes('driving license') || msg.toLowerCase().includes('dl ')) {
            setDlNumberError('Invalid Driving License format');
            mappedError = true;
          }
          if (msg.toLowerCase().includes('registration') || msg.toLowerCase().includes('vehicle registration')) {
            setVehicleRegNoError('Invalid vehicle number. Please enter a valid registration number');
            mappedError = true;
          }
          if (msg.toLowerCase().includes('storage')) {
            setStorageSpaceError(msg);
            mappedError = true;
          }
        });
        if (mappedError) {
          Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please correct the highlighted errors.' });
          return;
        }
      }
      const displayMessage = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || error.message;
      Toast.show({ type: 'error', text1: 'Final Submission Failed', text2: displayMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitialLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F5F7FA] justify-center items-center">
        <ActivityIndicator size="large" color="#073318" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={160}
        extraHeight={160}
        enableAutomaticScroll={true}
      >

        {/* Header */}
        <View className="px-6 pt-4 pb-4 bg-transparent mt-4">
          <View className="flex-row items-center justify-between mb-6 relative">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => {
                  if (step === 10) navigation.navigate("Login");
                  else if (step > 0) {
                    if (selectedRole === 'Individual' && step === 6) {
                      setStep(3);
                    } else {
                      if (step === 2) setOtp(['', '', '', '', '', '']);
                      setStep(step - 1);
                    }
                  } else navigation.navigate("AuthSelection");
                }}
                className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm mr-4"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 4
                }}
              >
                <Ionicons name="chevron-back" size={24} color="#073318" />
              </TouchableOpacity>
              <Text numberOfLines={1} className="text-[24px] font-extrabold text-[#111827]">{t('signup')}</Text>
            </View>
            {step !== 0 && (
              <View className="flex-row items-center z-10">
                <TouchableOpacity onPress={() => navigation.navigate("Help")} className="mr-3 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
                  <Ionicons name="help-outline" size={20} color="#073318" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowLangMenu(true)} className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
                  <Ionicons name="globe-outline" size={20} color="#073318" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Progress Indicator */}
          {step >= 3 && step <= 9 && (
            <StepIndicator
              currentStep={getStepDetails().currentStep}
              totalSteps={getStepDetails().totalSteps}
            />
          )}
        </View>

        {/* Step 0: Role Selection */}
        {step === 0 && (
          <View className="flex-1 px-6 pt-6 pb-10">
            {/* Massive Branding Section matching Login */}
            <View className="items-center justify-center mb-8 mt-2">
              <Image source={require('../../assets/images/GMU Logo.png')} style={{ width: 80, height: 80 }} resizeMode="contain" className="mb-2" />
              <Text className="font-extrabold text-[36px] tracking-tight text-center">
                <Text style={{ color: '#073318' }}>Gram</Text>
                <Text style={{ color: '#84B827' }}>Unnati</Text>
              </Text>
              <Text className="font-black text-[#073318] text-[18px] tracking-widest uppercase text-center mt-1">Delivery Partner</Text>
            </View>

            {/* Big Container Card for Actions */}
            <View
              className="bg-white rounded-[32px] p-6 w-full border border-gray-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Text className="text-2xl font-extrabold text-[#111827] mb-2 text-center">Choose Your Role</Text>
              <Text className="text-[#6B7280] text-[13px] font-semibold mb-6 text-center">
                Select your user type to continue
              </Text>

              <View className="space-y-4 mb-4">
                <TouchableOpacity
                  onPress={() => handleRoleSelection('SHG')}
                  className={`py-4 px-4 rounded-[20px] border-2 flex-row items-center ${selectedRole === 'SHG' ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}
                >
                  <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${selectedRole === 'SHG' ? 'bg-[#073318]' : 'bg-[#EEF5F0]'}`}>
                    <Ionicons name="people" size={24} color={selectedRole === 'SHG' ? 'white' : '#073318'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-base font-extrabold mb-1 ${selectedRole === 'SHG' ? 'text-[#073318]' : 'text-[#111827]'}`}>SHG (Self Help Group)</Text>
                    <Text className="text-xs text-[#6B7280] font-medium leading-4">For women working in self-help groups and community delivery</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleRoleSelection('Individual')}
                  className={`py-4 px-4 rounded-[20px] border-2 flex-row items-center mt-4 ${selectedRole === 'Individual' ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'}`}
                >
                  <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${selectedRole === 'Individual' ? 'bg-[#073318]' : 'bg-[#EEF5F0]'}`}>
                    <Ionicons name="person" size={24} color={selectedRole === 'Individual' ? 'white' : '#073318'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-base font-extrabold mb-1 ${selectedRole === 'Individual' ? 'text-[#073318]' : 'text-[#111827]'}`}>Individual</Text>
                    <Text className="text-xs text-[#6B7280] font-medium leading-4">For personal or business delivery needs</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {roleSelectionError ? <Text className="text-red-500 text-xs text-center mb-4 font-semibold">{roleSelectionError}</Text> : null}

              <TouchableOpacity
                onPress={() => {
                  if (!selectedRole) {
                    setRoleSelectionError('Please select your role to continue');
                  } else {
                    if (isRecentlyVerified) {
                      setStep(3);
                    } else {
                      setStep(1);
                    }
                  }
                }}
                className="bg-[#073318] py-4 rounded-full items-center justify-center flex-row w-full mt-4"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 5,
                  elevation: 8,
                }}
              >
                <Text className="text-white text-[18px] font-bold tracking-wide mr-2">Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 1: Mobile Input */}
        {step === 1 && (
          <View className="flex-1 px-6 pt-6 pb-10">
            {/* Massive Branding Section matching Login */}
            <View className="items-center justify-center mb-8 mt-2">
              <Image source={require('../../assets/images/GMU Logo.png')} style={{ width: 80, height: 80 }} resizeMode="contain" className="mb-2" />
              <Text className="font-extrabold text-[36px] tracking-tight text-center">
                <Text style={{ color: '#073318' }}>Gram</Text>
                <Text style={{ color: '#84B827' }}>Unnati</Text>
              </Text>
              <Text className="font-black text-[#073318] text-[18px] tracking-widest uppercase text-center mt-1">Delivery Partner</Text>
            </View>

            {/* Big Container Card for Actions */}
            <View
              className="bg-white rounded-[32px] p-6 w-full border border-gray-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Text className="text-2xl font-extrabold text-[#111827] mb-2 text-center">{t('signup')}</Text>
              <Text className="text-[#6B7280] text-[13px] font-semibold mb-8 text-center">
                {t('enter_mobile')}
              </Text>

              <Text numberOfLines={1} className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-2 ml-1">{t('mobile_number')}</Text>
              <View className={`flex-row items-center bg-[#F9FAFB] py-4 px-4 rounded-[20px] shadow-sm border ${mobileError ? 'border-[#DC2626]' : mobile.length === 10 ? 'border-[#22C55E]' : 'border-gray-200'} mb-2`}>
                <Text className="text-[#073318] font-bold mr-3">+91</Text>
                <View className="w-[1px] h-6 bg-gray-300 mr-3" />
                <TextInput
                  ref={mobileRef}
                  className="flex-1 text-[#111827] text-[16px] font-bold"
                  placeholder={t('enter_10_digit')}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={mobile}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9]/g, '');
                    setMobile(cleaned);
                    setOtp(['', '', '', '', '', '']);
                    if (cleaned.length > 0 && cleaned.length < 10) {
                      setMobileError("Enter valid 10-digit mobile number");
                    } else if (cleaned.length === 0) {
                      setMobileError("Mobile number is required");
                    } else {
                      setMobileError("");
                    }
                  }}
                  onBlur={() => {
                    if (!mobile) setMobileError("Mobile number is required");
                    else if (mobile.length < 10) setMobileError("Enter valid 10-digit mobile number");
                  }}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                />
              </View>
              {mobileError ? <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 4, marginLeft: 4, marginBottom: 16 }}>{mobileError}</Text> : <View className="mb-6" />}

              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={mobile.length !== 10 || isSubmitting}
                className={`${mobile.length !== 10 ? 'bg-[#073318]/60' : 'bg-[#073318]'} py-4 rounded-full items-center justify-center flex-row mb-5`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 5,
                  elevation: 8,
                }}
              >
                {isSubmitting ? <ActivityIndicator color="white" /> : (
                  <>
                    <Text numberOfLines={1} className="text-white text-[18px] font-bold tracking-wide mr-2">{t('send_otp')}</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>

              <View className="flex-row justify-center items-center mt-2 flex-wrap">
                <Text className="text-[#6B7280] text-[13px] font-medium">{t('have_account')} </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text numberOfLines={1} className="text-[#073318] font-bold text-[14px] px-1">{t('login')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <View className="flex-1 px-6 pt-6 pb-10">
            {/* Massive Branding Section matching Login */}
            <View className="items-center justify-center mb-8 mt-2">
              <Image source={require('../../assets/images/GMU Logo.png')} style={{ width: 80, height: 80 }} resizeMode="contain" className="mb-2" />
              <Text className="font-extrabold text-[36px] tracking-tight text-center">
                <Text style={{ color: '#073318' }}>Gram</Text>
                <Text style={{ color: '#84B827' }}>Unnati</Text>
              </Text>
              <Text className="font-black text-[#073318] text-[18px] tracking-widest uppercase text-center mt-1">Delivery Partner</Text>
            </View>

            {/* Big Container Card for Actions */}
            <View
              className="bg-white rounded-[32px] p-6 w-full border border-gray-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Text className="text-2xl font-extrabold text-[#111827] mb-2 text-center">{t('verify_otp')}</Text>
              <Text className="text-[#6B7280] text-[13px] font-semibold mb-8 text-center">
                {t('enter_otp_sent')} <Text className="text-[#073318] font-bold">+91 {mobile || "XXXXXXXXXX"}</Text>
              </Text>

              <View className="flex-row justify-between w-full mb-6">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    className={`w-[14%] aspect-square border-2 rounded-[16px] bg-[#F9FAFB] justify-center items-center relative ${focusedIndex === i ? 'border-[#073318]' : 'border-gray-200'
                      }`}
                  >
                    <Text
                      style={{
                        textAlign: 'center',
                        textAlignVertical: 'center',
                        includeFontPadding: false
                      }}
                      className="text-xl font-bold text-[#111827]"
                    >
                      {otp[i]}
                    </Text>
                    <TextInput
                      ref={(el) => { inputRefs.current[i] = el; }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        opacity: 0,
                        padding: 0,
                      }}
                      keyboardType="numeric"
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      maxLength={1}
                      value={otp[i]}
                      onChangeText={(val) => handleOtpChange(val, i)}
                      onKeyPress={(e) => handleOtpKeyPress(e, i)}
                      onFocus={() => setFocusedIndex(i)}
                      onBlur={() => setFocusedIndex(null)}
                    />
                  </View>
                ))}
              </View>

              <View className="flex-row items-center justify-center mb-8">
                <Feather name="clock" size={14} color="#6B7280" className="mr-1.5" />
                <Text numberOfLines={1} className="text-[#6B7280] text-[13px] font-semibold">
                  {timer > 0 ? (
                    <>{t('resend_otp_in')} <Text className="text-[#073318] font-bold">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</Text></>
                  ) : (
                    <TouchableOpacity onPress={handleResendOtp} disabled={isSubmitting}>
                      <Text numberOfLines={1} className="text-[#073318] font-bold">{t('resend_otp')}</Text>
                    </TouchableOpacity>
                  )}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleVerifyOtp}
                disabled={!isOtpComplete || isSubmitting}
                className={`${!isOtpComplete ? 'bg-[#073318]/60' : 'bg-[#073318]'} py-4 rounded-full items-center justify-center flex-row mb-5`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 5,
                  elevation: 8,
                }}
              >
                {isSubmitting ? <ActivityIndicator color="white" /> : (
                  <>
                    <Text numberOfLines={1} className="text-white text-[18px] font-bold tracking-wide mr-2">{t('verify_otp')}</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>

              <View className="items-center mt-2">
                <TouchableOpacity onPress={() => setStep(1)} className="flex-row items-center">
                  <Ionicons name="pencil" size={16} color="#6B7280" className="mr-2" />
                  <Text numberOfLines={1} className="font-semibold text-[#6B7280] text-[14px] px-1">{t('edit_mobile')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Step 3: Personal Details */}
        {step === 3 && (
          <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection
                iconName="person-outline"
                title="Personal Details"
                subtitle="Enter your details to create an account"
              />

              {/* Profile Image Picker */}
              <View className="items-center mb-6">
                <TouchableOpacity
                  onPress={() => { setUploadTarget('profile'); setShowPhotoMenu(true); }}
                  className="w-24 h-24 rounded-full bg-[#F3F4F6] border-2 border-dashed border-[#073318] items-center justify-center overflow-hidden relative"
                >
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} className="w-full h-full" />
                  ) : (
                    <View className="items-center">
                      <Ionicons name="camera" size={32} color="#073318" />
                      <Text className="text-[10px] text-[#073318] font-bold mt-1 uppercase text-center leading-3">Select Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {profileImage && (
                  <TouchableOpacity
                    onPress={() => setProfileImage(null)}
                    className="absolute -top-1 -right-1 bg-white rounded-full shadow-md"
                    style={{ zIndex: 20 }}
                  >
                    <Ionicons name="close-circle" size={28} color="#B42318" />
                  </TouchableOpacity>
                )}
              </View>

              <View className="w-full">
                <InputField
                  ref={fullNameRef}
                  label="Your Full Name"
                  placeholder="Enter your full name"
                  icon="person-outline"
                  error={fullNameError}
                  required={true}
                  value={fullName}
                  onChangeText={(v) => {
                    const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                    setFullName(filtered);
                    if (!validateRequired(filtered)) {
                      setFullNameError("Full name is required");
                    } else {
                      setFullNameError('');
                    }
                  }}
                  onBlur={() => {
                    if (!validateRequired(fullName)) setFullNameError("Full name is required");
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => ageRef.current?.focus()}
                />

                <InputField
                  label="Mobile Number"
                  icon="call-outline"
                  required={true}
                  value={mobile}
                  editable={false}
                  suffixIcon="checkmark-circle"
                />

                <InputField
                  ref={ageRef}
                  label="Your Age"
                  placeholder="Enter age (e.g. 30)"
                  icon="person-circle-outline"
                  error={ageError}
                  required={true}
                  keyboardType="numeric"
                  maxLength={2}
                  value={age}
                  onChangeText={(v) => { 
                    setAge(v); 
                    if (!validateRequired(v)) {
                      setAgeError("Age is required");
                    } else if (parseInt(v) < 18) {
                      setAgeError("Must be at least 18");
                    } else {
                      setAgeError(''); 
                    }
                  }}
                  onBlur={() => {
                    if (!validateRequired(age)) setAgeError("Age is required");
                    else if (parseInt(age) < 18) setAgeError("Must be at least 18");
                  }}
                  returnKeyType={selectedRole === 'Individual' ? 'next' : 'done'}
                  onSubmitEditing={selectedRole === 'Individual' ? () => setShowIndividualRoleMenu(true) : handleNextStep3}
                />

                {selectedRole === 'Individual' && (
                  <DropdownField
                    label="Select Your Occupation"
                    placeholder="Select your occupation"
                    icon="briefcase-outline"
                    value={individualRole}
                    error={individualRoleError}
                    required={true}
                    onPress={() => setShowIndividualRoleMenu(true)}
                  />
                )}

                {selectedRole === 'Individual' && individualRole === 'Other' && (
                  <InputField
                    ref={otherOccupationRef}
                    label="Specify Your Occupation"
                    placeholder="Enter your occupation"
                    icon="briefcase-outline"
                    error={otherOccupationError}
                    required={true}
                    value={otherOccupation}
                    onChangeText={(val) => {
                      setOtherOccupation(val);
                      if (!validateRequired(val)) setOtherOccupationError("Please specify your occupation");
                      else setOtherOccupationError('');
                    }}
                    onBlur={() => {
                      if (!validateRequired(otherOccupation)) setOtherOccupationError("Please specify your occupation");
                    }}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={handleNextStep3}
                  />
                )}
              </View>

              <PrimaryButton
                title="Continue"
                onPress={handleNextStep3}
                loading={isSubmitting}
              />
            </FormContainer>
          </View>
        )}

        {/* Step 4: SHG Details */}
        {step === 4 && (
          <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection
                iconName="people-outline"
                title="SHG Details"
                subtitle="Tell us about your SHG group"
              />

              <View className="w-full">
                {/* Your Role Dropdown */}
                <DropdownField
                  label="Your Role"
                  placeholder="Select your role"
                  icon="people-circle-outline"
                  value={shgRole}
                  error={shgRoleError}
                  required={true}
                  onPress={() => setShowRoleMenu(true)}
                />

                {shgRole === 'CRP' && (
                  <View className="w-full">
                    <ToggleButtonGroup
                      label="Are you Leader of the SHG?"
                      value={isShgLeader}
                      error={isShgLeaderError}
                      required={true}
                      onSelect={(val) => {
                        setIsShgLeader(val);
                        setIsShgLeaderError('');
                        if (val === 'Yes') {
                          setLeaderName(fullName);
                          setLeaderMobile(mobile);
                        } else {
                          setLeaderName('');
                          setLeaderMobile('');
                        }
                      }}
                    />

                    {isShgLeader !== null && (
                      <Animated.View entering={FadeInUp.duration(400).springify()} className="w-full">
                        <InputField
                          ref={shgNameRef}
                          label="SHG Name"
                          placeholder="Enter SHG name"
                          icon="business-outline"
                          error={shgNameError}
                          required={true}
                          value={shgName}
                          onChangeText={(v) => {
                            const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                            setShgName(filtered);
                            setShgNameError('');
                          }}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => shgGroupSizeRef.current?.focus()}
                        />

                        <DropdownField
                          label="How long has your SHG been active?"
                          placeholder="Select experience"
                          icon="time-outline"
                          value={shgExperience}
                          error={shgExperienceError}
                          required={true}
                          onPress={() => setShowExperienceMenu(true)}
                        />

                        <InputField
                          ref={shgGroupSizeRef}
                          label="SHG Group Size"
                          placeholder="Enter number of members"
                          icon="people-outline"
                          error={shgGroupSizeError}
                          required={true}
                          keyboardType="numeric"
                          maxLength={3}
                          value={shgGroupSize}
                          onChangeText={(v) => {
                            const filtered = v.replace(/[^0-9]/g, '');
                            if (Number(filtered) <= 100) {
                              setShgGroupSize(filtered);
                              setShgGroupSizeError('');
                            }
                          }}
                          returnKeyType={isShgLeader === 'No' ? 'next' : 'done'}
                          blurOnSubmit={isShgLeader === 'No' ? false : true}
                          onSubmitEditing={isShgLeader === 'No' ? () => leaderNameRef.current?.focus() : handleNextStep4}
                        />

                        <InputField
                          ref={leaderNameRef}
                          label="Group Leader Name"
                          placeholder="Enter leader's name"
                          icon="person-outline"
                          error={leaderNameError}
                          required={true}
                          value={leaderName}
                          editable={isShgLeader === 'No'}
                          onChangeText={(v) => {
                            const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                            setLeaderName(filtered);
                            setLeaderNameError('');
                          }}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => leaderMobileRef.current?.focus()}
                        />

                        <InputField
                          ref={leaderMobileRef}
                          label="Leader Mobile Number"
                          placeholder="Enter 10-digit mobile number"
                          icon="phone-portrait-outline"
                          error={leaderMobileError}
                          required={true}
                          keyboardType="numeric"
                          maxLength={10}
                          value={leaderMobile}
                          editable={isShgLeader === 'No'}
                          onChangeText={(v) => {
                            const filtered = v.replace(/[^0-9]/g, '');
                            setLeaderMobile(filtered);
                            setLeaderMobileError('');
                          }}
                          returnKeyType="done"
                          onSubmitEditing={handleNextStep4}
                        />
                      </Animated.View>
                    )}
                  </View>
                )}

                {shgRole && shgRole !== 'CRP' && (
                  <View className="w-full">
                    <InputField
                      label="SHG Name"
                      placeholder="Enter SHG name"
                      icon="business-outline"
                      error={shgNameError}
                      required={true}
                      value={shgName}
                      onChangeText={(v) => {
                        const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                        setShgName(filtered);
                        setShgNameError('');
                      }}
                    />

                    <InputField
                      label="CRP Name"
                      placeholder="Enter CRP name"
                      icon="person-outline"
                      error={crpNameError}
                      required={true}
                      value={crpName}
                      onChangeText={(v) => {
                        const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                        setCrpName(filtered);
                        setCrpNameError('');
                      }}
                    />

                    <InputField
                      label="CRP Contact Number"
                      placeholder="Enter 10-digit mobile number"
                      icon="phone-portrait-outline"
                      error={crpMobileError}
                      required={true}
                      keyboardType="numeric"
                      maxLength={10}
                      value={crpMobile}
                      onChangeText={(v) => {
                        const filtered = v.replace(/[^0-9]/g, '');
                        setCrpMobile(filtered);
                        setCrpMobileError('');
                      }}
                    />

                    <InputField
                      label="CRP Email ID (Optional)"
                      placeholder="Enter email address"
                      icon="mail-outline"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={crpEmail}
                      onChangeText={(v) => setCrpEmail(v.replace(/[^a-zA-Z0-9@._-]/g, ''))}
                    />

                    {shgRole === 'Member' && (
                      <View className="w-full">
                        <InputField
                          label="Group Leader Name"
                          placeholder="Enter leader's name"
                          icon="person-outline"
                          error={leaderNameError}
                          required={true}
                          value={leaderName}
                          onChangeText={(v) => {
                            const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                            setLeaderName(filtered);
                            setLeaderNameError('');
                          }}
                        />

                        <InputField
                          label="Leader Mobile Number"
                          placeholder="Enter 10-digit mobile number"
                          icon="phone-portrait-outline"
                          error={leaderMobileError}
                          required={true}
                          keyboardType="numeric"
                          maxLength={10}
                          value={leaderMobile}
                          onChangeText={(v) => {
                            const filtered = v.replace(/[^0-9]/g, '');
                            setLeaderMobile(filtered);
                            setLeaderMobileError('');
                          }}
                        />
                      </View>
                    )}

                    <DropdownField
                      label="How long has your SHG been active?"
                      placeholder="Select experience"
                      icon="time-outline"
                      value={shgExperience}
                      error={shgExperienceError}
                      required={true}
                      onPress={() => setShowExperienceMenu(true)}
                    />

                    <InputField
                      label="SHG Group Size"
                      placeholder="Enter number of members"
                      icon="people-outline"
                      error={shgGroupSizeError}
                      required={true}
                      keyboardType="numeric"
                      maxLength={3}
                      value={shgGroupSize}
                      onChangeText={(v) => {
                        const filtered = v.replace(/[^0-9]/g, '');
                        if (Number(filtered) <= 100) {
                          setShgGroupSize(filtered);
                          setShgGroupSizeError('');
                        }
                      }}
                    />
                  </View>
                )}
              </View>

              <PrimaryButton
                title="Continue"
                onPress={handleNextStep4}
                loading={isSubmitting}
              />
            </FormContainer>
          </View>
        )}

        {/* Step 5: Business Details */}
        {step === 5 && (
          <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection
                iconName="cube-outline"
                title="Business Details"
                subtitle="Tell us about your production"
              />

              <View className="w-full">
                <ToggleButtonGroup
                  label="Do you produce any products?"
                  value={producesProducts}
                  error={producesProductsError}
                  required={true}
                  onSelect={(val) => {
                    setProducesProducts(val);
                    setProducesProductsError('');
                  }}
                />

                {producesProducts === 'Yes' && (
                  <Animated.View entering={FadeInUp.duration(400).springify()} className="w-full">
                    {/* Business Team Size */}
                    <InputField
                      ref={businessTeamSizeRef}
                      label="Business Team Size"
                      placeholder="Enter total team members"
                      icon="people-outline"
                      error={businessTeamSizeError}
                      required={true}
                      keyboardType="numeric"
                      maxLength={3}
                      value={businessTeamSize}
                      onChangeText={(v) => {
                        const filtered = v.replace(/[^0-9]/g, '');
                        if (Number(filtered) <= 100) {
                          setBusinessTeamSize(filtered);
                          setBusinessTeamSizeError('');
                        }
                      }}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => productNameRef.current?.focus()}
                    />

                    <View className="h-[1px] bg-gray-100 my-4" />

                    {/* Product Name */}
                    <InputField
                      ref={productNameRef}
                      label="Product Name"
                      placeholder="Enter product name"
                      icon="cube-outline"
                      error={productNameError}
                      required={true}
                      value={productName}
                      onChangeText={(v) => {
                        const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                        setProductName(filtered);
                        setProductNameError('');
                      }}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => setShowCategoryMenu(true)}
                    />

                    {/* Category Dropdown */}
                    <DropdownField
                      label="Category"
                      placeholder="Select category"
                      icon="grid-outline"
                      value={productCategory}
                      error={productCategoryError}
                      required={true}
                      onPress={() => setShowCategoryMenu(true)}
                    />

                    {productCategory === 'Other' && (
                      <Animated.View entering={FadeInUp.duration(400).springify()} className="w-full">
                        <InputField
                          label="Specify Category Name"
                          placeholder="Enter category name"
                          icon="create-outline"
                          error={otherCategoryError}
                          required={true}
                          value={otherCategory}
                          onChangeText={(v) => {
                            const filtered = v.replace(/[^a-zA-Z\s]/g, '');
                            setOtherCategory(filtered);
                            setOtherCategoryError('');
                          }}
                        />
                      </Animated.View>
                    )}

                    {/* Daily Production & Unit */}
                    <View className="flex-row w-full mt-4">
                      <View className="flex-1 mr-2">
                        <InputField
                          ref={dailyProductionRef}
                          label="Daily Production"
                          placeholder="Qty"
                          icon="bar-chart-outline"
                          error={dailyProductionError}
                          required={true}
                          keyboardType="numeric"
                          value={dailyProduction}
                          onChangeText={(v) => {
                            const filtered = v.replace(/[^0-9.]/g, '');
                            setDailyProduction(filtered);
                            setDailyProductionError('');
                          }}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => weeklyProductionRef.current?.focus()}
                        />
                      </View>

                      <View className="flex-1 ml-2">
                        <DropdownField
                          label="Unit"
                          placeholder="Unit"
                          icon="options-outline"
                          value={UNIT_DATA.find(u => u.uom_code === productUnit)?.full_name_of_measurement || ''}
                          error={productUnitError}
                          required={true}
                          onPress={() => setShowUnitMenu(true)}
                        />
                      </View>
                    </View>

                    {/* Weekly Production & Price per Unit */}
                    <View className="flex-row w-full mt-4">
                      <View className="flex-1 mr-2">
                        <InputField
                          ref={weeklyProductionRef}
                          label="Weekly Production (Optional)"
                          placeholder="Qty"
                          icon="stats-chart-outline"
                          keyboardType="numeric"
                          value={weeklyProduction}
                          onChangeText={(v) => setWeeklyProduction(v.replace(/[^0-9.]/g, ''))}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => productPriceRef.current?.focus()}
                        />
                      </View>

                      <View className="flex-1 ml-2">
                        <InputField
                          ref={productPriceRef}
                          label="Price per Unit (Optional)"
                          placeholder="₹ Amount"
                          icon="card-outline"
                          keyboardType="numeric"
                          value={productPrice}
                          onChangeText={(v) => setProductPrice(v.replace(/[^0-9.]/g, ''))}
                          returnKeyType="done"
                          onSubmitEditing={handleNextStep5}
                        />
                      </View>
                    </View>
                  </Animated.View>
                )}
              </View>

              <PrimaryButton
                title="Continue"
                onPress={handleNextStep5}
                loading={isSubmitting}
              />
            </FormContainer>
          </View>
        )}



        {/* Step 6: Address Details */}
        {step === 6 && (
          <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection
                iconName="location-outline"
                title="Address Details"
                subtitle="Enter your location details"
              />

              <View className="w-full">
                <InputField
                  ref={pincodeRef}
                  label="Pincode"
                  placeholder="Enter 6-digit pincode"
                  icon="location-outline"
                  error={pincodeError}
                  required={true}
                  keyboardType="numeric"
                  maxLength={6}
                  value={pincode}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9]/g, '');
                    setPincode(cleaned);
                    if (!validateRequired(cleaned)) {
                      setPincodeError("Pincode is required");
                    } else if (!validatePincode(cleaned)) {
                      setPincodeError("Enter valid 6-digit pincode");
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
                            if (data.villages && data.villages.length === 1) {
                              setVillage(data.villages[0]);
                            }
                            setStateNameError('');
                            setDistrictError('');
                            setTalukaError('');
                            houseNoRef.current?.focus();
                          }
                        } catch (error) {
                          console.error('Pincode fetch error:', error);
                          setPincodeError('Invalid pincode');
                        }
                      };
                      fetchPincode();
                    }
                  }}
                  onBlur={() => {
                    if (!validateRequired(pincode)) setPincodeError("Pincode is required");
                    else if (!validatePincode(pincode)) setPincodeError("Enter valid 6-digit pincode");
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => houseNoRef.current?.focus()}
                />

                <InputField
                  ref={houseNoRef}
                  label="House No"
                  placeholder="Enter house number"
                  icon="home-outline"
                  error={houseNoError}
                  required={true}
                  value={houseNo}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^a-zA-Z0-9\s]/g, '');
                    setHouseNo(cleaned);
                    if (!validateRequired(cleaned)) setHouseNoError("House number is required");
                    else setHouseNoError('');
                  }}
                  onBlur={() => {
                    if (!validateRequired(houseNo)) setHouseNoError("House number is required");
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => landmarkRef.current?.focus()}
                />

                <InputField
                  ref={landmarkRef}
                  label="Delivery Address"
                  placeholder="Enter full delivery address"
                  icon="map-outline"
                  error={landmarkError}
                  required={true}
                  value={landmark}
                  onChangeText={(val) => {
                    setLandmark(val);
                    if (landmarkError) setLandmarkError(validateRequired(val) ? '' : 'Landmark is required');
                  }}
                  onBlur={() => {
                    if (!validateRequired(landmark)) setLandmarkError("Address is required");
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => villageRef.current?.focus()}
                />

                {/* Village & Taluka Row */}
                <View className="flex-row w-full mt-4">
                  <View className="flex-1 mr-2">
                    <InputField
                      ref={villageRef}
                      label="Village / City"
                      placeholder="Village/City"
                      icon="flag-outline"
                      error={villageError}
                      required={true}
                      value={village}
                      onChangeText={(val) => {
                    setVillage(val);
                    if (villageError) setVillageError(validateRequired(val) ? '' : 'Village is required');
                  }}
                      onBlur={() => {
                        if (!validateRequired(village)) setVillageError("Village is required");
                      }}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => talukaRef.current?.focus()}
                    />
                  </View>

                  <View className="flex-1 ml-2">
                    <InputField
                      ref={talukaRef}
                      label="Taluka"
                      placeholder="Taluka"
                      icon="flag-outline"
                      error={talukaError}
                      required={true}
                      value={taluka}
                      onChangeText={(val) => {
                    setTaluka(val);
                    if (talukaError) setTalukaError(validateRequired(val) ? '' : 'Taluka is required');
                  }}
                      onBlur={() => {
                        if (!validateRequired(taluka)) setTalukaError("Taluka is required");
                      }}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => districtRef.current?.focus()}
                    />
                  </View>
                </View>

                {/* District & State Row */}
                <View className="flex-row w-full mt-4">
                  <View className="flex-1 mr-2">
                    <InputField
                      ref={districtRef}
                      label="District"
                      placeholder="District"
                      icon="flag-outline"
                      error={districtError}
                      required={true}
                      value={district}
                      onChangeText={(val) => {
                    setDistrict(val);
                    if (districtError) setDistrictError(validateRequired(val) ? '' : 'Please select district');
                  }}
                      onBlur={() => {
                        if (!validateRequired(district)) setDistrictError("District is required");
                      }}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => stateNameRef.current?.focus()}
                    />
                  </View>

                  <View className="flex-1 ml-2">
                    <InputField
                      ref={stateNameRef}
                      label="State"
                      placeholder="State"
                      icon="flag-outline"
                      error={stateNameError}
                      required={true}
                      value={stateName}
                      onChangeText={(val) => {
                    setStateName(val);
                    if (stateNameError) setStateNameError(validateRequired(val) ? '' : 'Please select state');
                  }}
                      onBlur={() => {
                        if (!validateRequired(stateName)) setStateNameError("State is required");
                      }}
                      returnKeyType="done"
                      onSubmitEditing={handleNextStep6}
                    />
                  </View>
                </View>
              </View>

              <PrimaryButton
                title="Continue"
                onPress={handleNextStep6}
                loading={isSubmitting}
              />
            </FormContainer>
          </View>
        )}

        {/* Step 7: Documents */}
        {step === 7 && (
          <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection
                iconName="card-outline"
                title="Documents"
                subtitle="Verify your identity"
              />

              <View className="w-full">
                <InputField
                  ref={aadhaarNumberRef}
                  label="Aadhaar Number"
                  placeholder="XXXX XXXX XXXX"
                  icon="finger-print-outline"
                  error={aadhaarError}
                  required={true}
                  keyboardType="number-pad"
                  maxLength={14}
                  value={aadhaarNumber}
                  onChangeText={(val) => {
                    const formatted = formatAadhaar(val);
                    setAadhaarNumber(formatted);
                    if (!validateRequired(formatted)) {
                      setAadhaarError("Aadhaar number is required");
                    } else if (!validateAadhaar(formatted)) {
                      setAadhaarError("Enter valid 12-digit Aadhaar number");
                    } else {
                      setAadhaarError('');
                    }
                  }}
                  onBlur={() => {
                    if (!validateRequired(aadhaarNumber)) setAadhaarError("Aadhaar number is required");
                    else if (!validateAadhaar(aadhaarNumber)) setAadhaarError("Enter valid 12-digit Aadhaar number");
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => panNumberRef.current?.focus()}
                />

                <InputField
                  ref={panNumberRef}
                  label="PAN Number"
                  placeholder="ABCDE1234F"
                  icon="document-text-outline"
                  error={panError}
                  required={true}
                  autoCapitalize="characters"
                  maxLength={10}
                  value={panNumber}
                  onChangeText={(val) => {
                    const upper = val.toUpperCase();
                    setPanNumber(upper);
                    if (!validateRequired(upper)) {
                      setPanError("PAN number is required");
                    } else if (!validatePan(upper)) {
                      setPanError("Enter valid PAN number");
                    } else {
                      setPanError('');
                    }
                  }}
                  onBlur={() => {
                    if (!validateRequired(panNumber)) setPanError("PAN number is required");
                    else if (!validatePan(panNumber)) setPanError("Enter valid PAN number");
                  }}
                  returnKeyType="done"
                  blurOnSubmit={true}
                />

                <View className="mt-6 flex-row justify-between space-x-4">
                  <View className="flex-1 mr-2">
                    <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2 ml-1 text-center">
                      Aadhaar Front Photo <Text className="text-[#B42318] font-semibold">*</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={() => { setUploadTarget('aadhaarFront'); setShowPhotoMenu(true); }}
                      className={`bg-[#F9FAFB] rounded-[24px] border border-dashed h-28 items-center justify-center overflow-hidden relative mt-1 ${docPhotosError && !aadhaarFront ? 'border-[#DC2626]' : aadhaarFront ? 'border-[#22C55E]' : 'border-gray-300'}`}
                    >
                      {aadhaarFront ? (
                        <>
                          <Image source={{ uri: aadhaarFront }} className="w-full h-full" resizeMode="cover" />
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); setAadhaarFront(''); }}
                            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                            style={{ zIndex: 10 }}
                          >
                            <Ionicons name="close" size={18} color="#B42318" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View className="items-center">
                          <Ionicons name="cloud-upload-outline" size={26} color="#073318" className="mb-1" />
                          <Text className="text-[11px] text-gray-400 font-semibold">Front Side</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2 ml-1 text-center">
                      Aadhaar Back Photo <Text className="text-[#B42318] font-semibold">*</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={() => { setUploadTarget('aadhaarBack'); setShowPhotoMenu(true); }}
                      className={`bg-[#F9FAFB] rounded-[24px] border border-dashed h-28 items-center justify-center overflow-hidden relative mt-1 ${docPhotosError && !aadhaarBack ? 'border-[#DC2626]' : aadhaarBack ? 'border-[#22C55E]' : 'border-gray-300'}`}
                    >
                      {aadhaarBack ? (
                        <>
                          <Image source={{ uri: aadhaarBack }} className="w-full h-full" resizeMode="cover" />
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); setAadhaarBack(''); }}
                            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                            style={{ zIndex: 10 }}
                          >
                            <Ionicons name="close" size={18} color="#B42318" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View className="items-center">
                          <Ionicons name="cloud-upload-outline" size={26} color="#073318" className="mb-1" />
                          <Text className="text-[11px] text-gray-400 font-semibold">Back Side</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mt-6">
                  <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2 ml-1">
                    PAN Card Photo <Text className="text-[#B42318] font-semibold">*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => { setUploadTarget('panImage'); setShowPhotoMenu(true); }}
                    className={`bg-[#F9FAFB] rounded-[24px] border border-dashed h-32 items-center justify-center overflow-hidden relative mt-1 ${docPhotosError && !panImage ? 'border-[#DC2626]' : panImage ? 'border-[#22C55E]' : 'border-gray-300'}`}
                  >
                    {panImage ? (
                      <>
                        <Image source={{ uri: panImage }} className="w-full h-full" resizeMode="cover" />
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); setPanImage(''); }}
                          className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                          style={{ zIndex: 10 }}
                        >
                          <Ionicons name="close" size={18} color="#B42318" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View className="items-center">
                        <Ionicons name="image-outline" size={32} color="#073318" className="mb-2" />
                        <Text className="text-xs text-[#073318] font-bold">Upload PAN Card Image</Text>
                        <Text className="text-[11px] text-gray-400 font-medium mt-1">PNG, JPG up to 5MB</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {docPhotosError ? (
                <Text className="text-red-500 text-xs mt-4 text-center font-semibold">{docPhotosError}</Text>
              ) : null}

              <PrimaryButton
                title="Continue"
                onPress={handleNextStep7}
                loading={isSubmitting}
              />
            </FormContainer>
          </View>
        )}

        {/* Step 8: Bank Details */}
        {step === 8 && (
          <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection
                iconName="card-outline"
                title="Bank Details"
                subtitle="Where should we send your earnings?"
              />

              <View className="w-full">
                <InputField
                  ref={accountNameRef}
                  label="Account Holder Name"
                  placeholder="Enter account holder name"
                  icon="person-outline"
                  error={accountNameError}
                  required={true}
                  value={accountName}
                  onChangeText={(val) => {
                    const filtered = val.replace(/[^a-zA-Z\s]/g, '');
                    setAccountName(filtered);
                    if (!validateRequired(filtered)) {
                      setAccountNameError("Account name is required");
                    } else {
                      setAccountNameError('');
                    }
                  }}
                  onBlur={() => {
                    if (!validateRequired(accountName)) setAccountNameError("Account name is required");
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => accountNumberRef.current?.focus()}
                />

                <InputField
                  ref={accountNumberRef}
                  label="Account Number"
                  placeholder="Enter account number"
                  icon="card-outline"
                  error={accountNumberError}
                  required={true}
                  keyboardType="number-pad"
                  maxLength={16}
                  value={accountNumber}
                  onChangeText={(val) => {
                    const filtered = val.replace(/[^0-9]/g, '');
                    setAccountNumber(filtered);
                    if (!validateRequired(filtered)) {
                      setAccountNumberError("Account number is required");
                    } else if (filtered.length < 8) {
                      setAccountNumberError("Enter valid account number");
                    } else {
                      setAccountNumberError('');
                    }
                  }}
                  onBlur={() => {
                    if (!validateRequired(accountNumber)) setAccountNumberError("Account number is required");
                    else if (accountNumber.length < 8) setAccountNumberError("Enter valid account number");
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => ifscCodeRef.current?.focus()}
                />

                <InputField
                  ref={ifscCodeRef}
                  label="IFSC Code"
                  placeholder="e.g. SBIN0001234"
                  icon="pricetag-outline"
                  error={ifscError}
                  required={true}
                  autoCapitalize="characters"
                  maxLength={11}
                  value={ifscCode}
                  onChangeText={(val) => { 
                    const upper = val.toUpperCase();
                    setIfscCode(upper); 
                    if (!validateRequired(upper)) {
                      setIfscError("IFSC code is required");
                    } else if (!validateIfsc(upper)) {
                      setIfscError("Enter valid IFSC code");
                    } else {
                      setIfscError('');
                    }
                  }}
                  onBlur={() => {
                    if (!validateRequired(ifscCode)) setIfscError("IFSC code is required");
                    else if (!validateIfsc(ifscCode)) setIfscError("Enter valid IFSC code");
                  }}
                  loading={isFetchingIfsc}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => bankNameRef.current?.focus()}
                />

                <InputField
                  ref={bankNameRef}
                  label={isFetchingIfsc ? "Bank Name (Auto-fetching...)" : "Bank Name"}
                  placeholder="Enter bank name or auto-fill"
                  icon="business-outline"
                  error={bankNameError}
                  required={true}
                  value={bankName}
                  onChangeText={(val) => { 
                    setBankName(val); 
                    if (!validateRequired(val)) {
                      setBankNameError("Bank name is required");
                    } else {
                      setBankNameError(''); 
                    }
                  }}
                  onBlur={() => {
                    if (!validateRequired(bankName)) setBankNameError("Bank name is required");
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => branchNameRef.current?.focus()}
                />

                <InputField
                  ref={branchNameRef}
                  label={isFetchingIfsc ? "Branch Name (Auto-fetching...)" : "Branch Name"}
                  placeholder="Enter branch name"
                  icon="location-outline"
                  error={branchNameError}
                  required={true}
                  value={branchName}
                  onChangeText={(val) => {
                    const filtered = val.replace(/[^a-zA-Z\s]/g, '');
                    setBranchName(filtered);
                    setBranchNameError('');
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => upiIdRef.current?.focus()}
                />

                <InputField
                  ref={upiIdRef}
                  label="UPI ID (Optional)"
                  placeholder="example@upi"
                  icon="wallet-outline"
                  autoCapitalize="none"
                  value={upiId}
                  onChangeText={(val) => setUpiId(val.replace(/[^a-zA-Z0-9@.-]/g, ''))}
                  suffixIcon={upiId.length > 0 ? (/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId) ? "checkmark-circle" : "close-circle") : undefined}
                  returnKeyType="done"
                  onSubmitEditing={handleNextStep8}
                />
              </View>

              <PrimaryButton
                title="Continue"
                onPress={handleNextStep8}
                loading={isSubmitting}
              />
            </FormContainer>
          </View>
        )}

        {/* Step 9: Other Details */}
        {step === 9 && (
          <View className="flex-1 px-6 pt-6 pb-10">
            <FormContainer>
              <FormSection
                iconName="options-outline"
                title="Other Details"
                subtitle="Help us assign your work"
              />

              <View className="w-full">
                <View className="mb-4">
                  <Label text="How much storage space do you have available?" required={true} />

                  {/* Width and Length fields */}
                  <View className="flex-row w-full mb-3 mt-1">
                    <View className="flex-1 mr-2">
                      <InputField
                        ref={storageWidthRef}
                        label="Width (ft)"
                        placeholder="ft"
                        icon="resize-outline"
                        keyboardType="numeric"
                        value={storageWidth}
                        onChangeText={(val) => setStorageWidth(val.replace(/[^0-9.]/g, ''))}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => storageLengthRef.current?.focus()}
                      />
                    </View>
                    <View className="flex-1 ml-2">
                      <InputField
                        ref={storageLengthRef}
                        label="Length (ft)"
                        placeholder="ft"
                        icon="resize-outline"
                        keyboardType="numeric"
                        value={storageLength}
                        onChangeText={(val) => setStorageLength(val.replace(/[^0-9.]/g, ''))}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => storageSpaceRef.current?.focus()}
                      />
                    </View>
                  </View>

                  <InputField
                    ref={storageSpaceRef}
                    label="Storage Space Description"
                    placeholder="e.g. 100 sqft, 1 room, etc."
                    icon="home-outline"
                    error={storageSpaceError}
                    required={false}
                    value={storageSpace}
                    onChangeText={(val) => { setStorageSpace(val); setStorageSpaceError(''); }}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                </View>

                <ToggleButtonGroup
                  label="Do you have a vehicle for delivery?"
                  value={hasVehicle}
                  error={hasVehicleError}
                  required={true}
                  onSelect={(val) => {
                    setHasVehicle(val);
                    setHasVehicleError('');
                  }}
                />
                {hasVehicle === 'Yes' && (
                  <Animated.View entering={FadeInUp.duration(400).springify()} className="w-full mt-4">
                    <DropdownField
                      label="Vehicle Type"
                      placeholder="Select vehicle type"
                      icon="car-sport-outline"
                      required={true}
                      value={vehicleType}
                      error={vehicleTypeError}
                      onPress={() => setShowVehicleMenu(true)}
                    />

                    <InputField
                      ref={vehicleRegNoRef}
                      label="Vehicle Registration Number"
                      placeholder="e.g. MH09AB1234"
                      icon="card-outline"
                      required={true}
                      autoCapitalize="characters"
                      maxLength={10}
                      error={vehicleRegNoError}
                      value={vehicleRegNo}
                      onChangeText={(val) => {
                        let clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                        const isBH = clean.length > 0 && /^[0-9O]/.test(clean[0]);
                        let normalized = '';
                        for (let i = 0; i < clean.length; i++) {
                          let char = clean[i];
                          if (isBH) {
                            if ((i === 0 || i === 1 || (i >= 4 && i <= 7)) && char === 'O') {
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
                      }}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => dlNumberRef.current?.focus()}
                    />

                    <InputField
                      ref={dlNumberRef}
                      label="Driving License Number"
                      placeholder="e.g. MH0920150123456"
                      icon="document-text-outline"
                      required={true}
                      autoCapitalize="characters"
                      maxLength={15}
                      error={dlNumberError}
                      value={dlNumber}
                      onChangeText={(val) => {
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
                      }}
                      returnKeyType="done"
                      blurOnSubmit={true}
                    />

                    <View className="mt-4 flex-row justify-between space-x-4">
                      <View className="flex-1 mr-2">
                        <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2 ml-1 text-center">
                          DL Photo <Text className="text-gray-400 font-normal tracking-normal">(Optional)</Text>
                        </Text>
                        <TouchableOpacity
                          onPress={() => { setUploadTarget('dlImage'); setShowPhotoMenu(true); }}
                          className={`bg-[#F9FAFB] rounded-[24px] border border-dashed h-28 items-center justify-center overflow-hidden relative mt-1 ${dlImage ? 'border-[#073318]' : 'border-gray-300'}`}
                        >
                          {dlImage ? (
                            <>
                              <Image source={{ uri: dlImage }} className="w-full h-full" resizeMode="cover" />
                              <TouchableOpacity
                                onPress={(e) => { e.stopPropagation(); setDlImage(''); }}
                                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                                style={{ zIndex: 10 }}
                              >
                                <Ionicons name="close" size={18} color="#B42318" />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <View className="items-center">
                              <Ionicons name="cloud-upload-outline" size={26} color="#073318" className="mb-1" />
                              <Text className="text-[11px] text-gray-400 font-semibold">Upload DL</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                      <View className="flex-1 ml-2">
                        <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2 ml-1 text-center">
                          Vehicle Photo <Text className="text-gray-400 font-normal tracking-normal">(Optional)</Text>
                        </Text>
                        <TouchableOpacity
                          onPress={() => { setUploadTarget('vehicleImage'); setShowPhotoMenu(true); }}
                          className={`bg-[#F9FAFB] rounded-[24px] border border-dashed h-28 items-center justify-center overflow-hidden relative mt-1 ${vehicleImage ? 'border-[#073318]' : 'border-gray-300'}`}
                        >
                          {vehicleImage ? (
                            <>
                              <Image source={{ uri: vehicleImage }} className="w-full h-full" resizeMode="cover" />
                              <TouchableOpacity
                                onPress={(e) => { e.stopPropagation(); setVehicleImage(''); }}
                                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                                style={{ zIndex: 10 }}
                              >
                                <Ionicons name="close" size={18} color="#B42318" />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <View className="items-center">
                              <Ionicons name="cloud-upload-outline" size={26} color="#073318" className="mb-1" />
                              <Text className="text-[11px] text-gray-400 font-semibold">Upload Photo</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Animated.View>
                )}

                <View className="flex-row items-center mb-6 px-2 mt-6">
                  <TouchableOpacity
                    onPress={() => { setTermsAccepted(!termsAccepted); setTermsError(''); }}
                    className={`w-6 h-6 border-2 rounded mr-3 items-center justify-center ${termsAccepted ? 'border-[#073318] bg-[#073318]' : 'border-gray-300 bg-white'}`}
                  >
                    {termsAccepted && <Ionicons name="checkmark" size={16} color="white" />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    className="flex-1"
                    onPress={() => { setTermsAccepted(!termsAccepted); setTermsError(''); }}
                  >
                    <Text className="text-textSecondary text-sm">
                      I accept the <Text className="text-[#073318] font-bold" onPress={(e) => { e.stopPropagation(); navigation.navigate("Terms"); }}>Terms & Conditions</Text> and <Text className="text-[#073318] font-bold" onPress={(e) => { e.stopPropagation(); navigation.navigate("Privacy"); }}>Privacy Policy</Text>
                    </Text>
                    {termsError ? <Text className="text-red-500 text-xs mt-1">{termsError}</Text> : null}
                  </TouchableOpacity>
                </View>
              </View>

              <PrimaryButton
                title="Submit Application"
                onPress={handleNextStep9}
                loading={isSubmitting}
                iconName="checkmark-circle"
              />
            </FormContainer>
          </View>
        )}

        {/* Step 10: Application Pending */}
        {step === 10 && (
          <View className="flex-1 px-6 pt-10">
            <FormContainer style={{ alignItems: 'center', padding: 32 }}>
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
                  <Text className="text-sm font-bold text-[#111827]">24-48 Hours</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                className="bg-[#073318] py-4 rounded-full items-center justify-center flex-row w-full mt-2"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 5,
                  elevation: 8,
                }}
              >
                <Text className="text-white text-[18px] font-bold tracking-wide mr-2">{t('login')}</Text>
                <Ionicons name="log-in-outline" size={20} color="white" />
              </TouchableOpacity>
            </FormContainer>
          </View>
        )}

        {/* Footer (Only for Step 0 and 1) */}
        {(step === 0 || step === 1) && (
          <View className="items-center px-6 mb-6 mt-auto">
            <Text className="text-textSecondary text-xs text-center">
              {t('i_accept')}
              <Text className="text-primary font-bold" onPress={() => navigation.navigate("Terms")}> {t('terms_conditions')} </Text>{t('and')}<Text className="text-primary font-bold" onPress={() => navigation.navigate("Privacy")}> {t('privacy_policy')}</Text>
            </Text>
          </View>
        )}

      </KeyboardAwareScrollView>

      {/* Language Menu Modal */}
      <Modal visible={showLangMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowLangMenu(false)}>
          <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
            <TouchableWithoutFeedback>
              <View className="absolute top-20 right-6 bg-white rounded-2xl shadow-lg border border-gray-100 w-44 overflow-hidden">
                <TouchableOpacity
                  className={`p-4 border-b border-gray-100 flex-row items-center justify-between ${locale === "en" ? "bg-[#EEF5F0]" : ""}`}
                  onPress={() => { changeLanguage("en"); setShowLangMenu(false); }}
                >
                  <Text className={`text-base font-bold ${locale === "en" ? "text-primary" : "text-textPrimary"}`}>{t('english')}</Text>
                  {locale === "en" && <Ionicons name="checkmark" size={18} color="#073318" />}
                </TouchableOpacity>
                <TouchableOpacity
                  className={`p-4 border-b border-gray-100 flex-row items-center justify-between ${locale === "hi" ? "bg-[#EEF5F0]" : ""}`}
                  onPress={() => { changeLanguage("hi"); setShowLangMenu(false); }}
                >
                  <Text className={`text-base font-bold ${locale === "hi" ? "text-primary" : "text-textPrimary"}`}>{t('hindi')}</Text>
                  {locale === "hi" && <Ionicons name="checkmark" size={18} color="#073318" />}
                </TouchableOpacity>
                <TouchableOpacity
                  className={`p-4 flex-row items-center justify-between ${locale === "mr" ? "bg-[#EEF5F0]" : ""}`}
                  onPress={() => { changeLanguage("mr"); setShowLangMenu(false); }}
                >
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
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-lg font-bold text-textPrimary mb-4">Upload Photo</Text>
                <TouchableOpacity onPress={takeSelfie} className="flex-row items-center p-4 border-b border-gray-100">
                  <Ionicons name="camera-outline" size={24} color="#073318" />
                  <Text className="text-base font-medium ml-4">Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickFromGallery} className="flex-row items-center p-4">
                  <Ionicons name="image-outline" size={24} color="#073318" />
                  <Text className="text-base font-medium ml-4">Upload from Gallery</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* SHG Experience Modal */}
      <Modal visible={showExperienceMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => { setShowExperienceMenu(false); if (!shgExperience) setShgExperienceError('Please select experience'); }}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">SHG Experience</Text>
                {['1-2 years', '3-5 years', '5+ years'].map(opt => {
                  const isSelected = shgExperience === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => { setShgExperience(opt); setShgExperienceError(''); setShowExperienceMenu(false); }}
                      className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'
                        }`}
                    >
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{opt}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Vehicle Type Menu */}
      <Modal visible={showVehicleMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => { setShowVehicleMenu(false); if (!vehicleType) setVehicleTypeError('Please select vehicle type'); }}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">Select Vehicle Type</Text>
                {['Bike / Scooty', 'Auto / Cargo', 'Car / Pickup', 'Other'].map((opt) => {
                  const isSelected = vehicleType === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => { setVehicleType(opt); setVehicleTypeError(''); setShowVehicleMenu(false); }}
                      className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'
                        }`}
                    >
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{opt}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* SHG Role Modal */}
      <Modal visible={showRoleMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => { setShowRoleMenu(false); if (!shgRole) setShgRoleError('Please select role'); }}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">Your Role</Text>
                {['CRP', 'Leader', 'Member'].map(opt => {
                  const isSelected = shgRole === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => { setShgRole(opt); setShgRoleError(''); setShowRoleMenu(false); }}
                      className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'
                        }`}
                    >
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{opt}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Category Menu */}
      <Modal visible={showCategoryMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => { setShowCategoryMenu(false); if (!productCategory) setProductCategoryError('Please select category'); }}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">Category</Text>
                {['Food', 'Handmade', 'Agriculture', 'Other'].map(opt => {
                  const isSelected = productCategory === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => { setProductCategory(opt); setProductCategoryError(''); setShowCategoryMenu(false); }}
                      className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'
                        }`}
                    >
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{opt}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Unit Menu */}
      <Modal visible={showUnitMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => { setShowUnitMenu(false); if (!productUnit) setProductUnitError('Please select unit'); }}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">Unit</Text>
                <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                  {UNIT_DATA.map(opt => {
                    const isSelected = productUnit === opt.uom_code;
                    return (
                      <TouchableOpacity
                        key={opt.uom_code}
                        onPress={() => { setProductUnit(opt.uom_code); setProductUnitError(''); setShowUnitMenu(false); }}
                        className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'
                          }`}
                      >
                        <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{opt.full_name_of_measurement}</Text>
                        {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                      </TouchableOpacity>
                    );
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
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">Select Pincode</Text>
                {PINCODE_DATA.map(opt => {
                  const isSelected = pincode === opt.pincode;
                  return (
                    <TouchableOpacity
                      key={opt.pincode}
                      onPress={() => handlePincodeSelect(opt.pincode)}
                      className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'
                        }`}
                    >
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{opt.pincode}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Village Menu */}
      <Modal visible={showVillageMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowVillageMenu(false)}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">Select Village</Text>
                {selectedData?.villages?.map((opt: string) => {
                  const isSelected = village === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => { setVillage(opt); setVillageError(''); setShowVillageMenu(false); }}
                      className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'
                        }`}
                    >
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{opt}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Area Menu */}
      <Modal visible={showAreaMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowAreaMenu(false)}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">Select Street / Area</Text>
                {selectedData?.areas?.map((opt: string) => {
                  const isSelected = streetArea === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => { setStreetArea(opt); setStreetAreaError(''); setShowAreaMenu(false); }}
                      className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'
                        }`}
                    >
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{opt}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Individual Role Modal */}
      <Modal visible={showIndividualRoleMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => { setShowIndividualRoleMenu(false); if (!individualRole) setIndividualRoleError('Please select occupation'); }}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-lg">
                <Text className="text-xl font-extrabold text-[#111827] mb-5">Select Your Occupation</Text>
                {['Driver', 'Shopkeeper / Business Owner', 'Student / Job Seeker', 'Farmer', 'Self-employed', 'Other'].map(opt => {
                  const isSelected = individualRole === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => { setIndividualRole(opt); setIndividualRoleError(''); setShowIndividualRoleMenu(false); }}
                      className={`p-4 mb-3 rounded-[20px] border-2 flex-row items-center justify-between ${isSelected ? 'border-[#073318] bg-[#EEF5F0]' : 'border-gray-200 bg-white'
                        }`}
                    >
                      <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#073318]' : 'text-[#111827]'}`}>{opt}</Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color="#073318" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
