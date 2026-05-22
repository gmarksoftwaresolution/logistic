import * as yup from 'yup';

const NAME_REGEX = /^[a-zA-Z\s]*$/;

export const personalDetailsSchema = yup.object().shape({
  fullName: yup.string()
    .matches(NAME_REGEX, 'Only characters allowed')
    .required('Full name is required'),
  mobile: yup.string().matches(/^[6-9][0-9]{9}$/, 'Invalid mobile number. The number should start from 6').required('Mobile number is required'),
  age: yup.number().typeError('Age must be a number').min(18, 'You must be at least 18 years old to create an account and continue using this service.').max(99, 'Please enter a valid age (18-99)').required('Age is required'),
  role: yup.string().optional(),
});

export const shgDetailsSchema = yup.object().shape({
  shgName: yup.string()
    .matches(NAME_REGEX, 'Only characters allowed')
    .required('SHG Name is required'),
  leaderName: yup.string()
    .matches(NAME_REGEX, 'Only characters allowed')
    .required('Group Leader Name is required'),
  leaderContact: yup.string().matches(/^[6-9][0-9]{9}$/, 'Invalid mobile number. The number should start from 6').required('Leader contact is required'),
  activeYears: yup.string().required('This field is required'),
  userRole: yup.string().required('Your Role is required'),
  producesProducts: yup.string().required('Please select Yes or No'),
});

export const addressDetailsSchema = yup.object().shape({
  pincode: yup.string().matches(/^[0-9]{6}$/, 'Pincode must be 6 digits').required('Pincode is required'),
  street: yup.string().required('Street/Area is required'),
  village: yup.string().required('Village/City is required'),
  taluka: yup.string().required('Taluka is required'),
  district: yup.string().required('District is required'),
  state: yup.string().required('State is required'),
});

export const bankDetailsSchema = yup.object().shape({
  accountHolderName: yup.string()
    .matches(NAME_REGEX, 'Only characters allowed')
    .required('Account holder name is required'),
  accountNumber: yup.string()
    .matches(/^[0-9]{8,16}$/, 'Account number must be 8-16 digits')
    .required('Account number is required'),
  ifscCode: yup.string().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code').required('IFSC code is required'),
  bankName: yup.string().required('Bank name is required'),
});

export const otherDetailsSchema = yup.object().shape({
  availability: yup.string().required('Availability is required'),
  hasVehicle: yup.string().required('Please select Yes or No'),
  vehicleType: yup.string().when('hasVehicle', {
    is: 'Yes',
    then: (schema) => schema.required('Vehicle Type is required'),
  }),
  vehicleRegNo: yup.string().when('hasVehicle', {
    is: 'Yes',
    then: (schema) => schema.required('Registration Number is required'),
  }),
  dlNumber: yup.string().when('hasVehicle', {
    is: 'Yes',
    then: (schema) => schema.required('DL Number is required'),
  }),
});
