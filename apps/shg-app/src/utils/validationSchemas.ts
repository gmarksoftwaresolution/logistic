import * as yup from 'yup';

const NAME_REGEX = /^[a-zA-Z\s]*$/;

export const personalDetailsSchema = yup.object().shape({
  fullName: yup.string()
    .matches(NAME_REGEX, 'val_only_characters_allowed')
    .required('val_full_name_required'),
  mobile: yup.string().matches(/^[6-9][0-9]{9}$/, 'invalid_mobile_start').required('val_mobile_number_required'),
  age: yup.number().typeError('val_age_must_be_number').min(18, 'val_age_min_18').max(99, 'val_age_max_99').required('val_age_required'),
  role: yup.string().optional(),
});

export const shgDetailsSchema = yup.object().shape({
  shgName: yup.string()
    .matches(NAME_REGEX, 'val_only_characters_allowed')
    .required('val_shg_name_required'),
  leaderName: yup.string()
    .matches(NAME_REGEX, 'val_only_characters_allowed')
    .required('val_leader_name_required'),
  leaderContact: yup.string().matches(/^[6-9][0-9]{9}$/, 'invalid_mobile_start').required('val_leader_contact_required'),
  activeYears: yup.string().required('val_this_field_required'),
  userRole: yup.string().required('val_your_role_required'),
  producesProducts: yup.string().required('val_select_yes_no'),
});

export const addressDetailsSchema = yup.object().shape({
  pincode: yup.string().matches(/^[0-9]{6}$/, 'val_pincode_6_digits').required('val_pincode_required'),
  street: yup.string().required('val_street_required'),
  village: yup.string().required('val_village_required'),
  taluka: yup.string().required('val_taluka_required'),
  district: yup.string().required('val_district_required'),
  state: yup.string().required('val_state_required'),
  postOffice: yup.string().required('val_post_office_required'),
});

export const bankDetailsSchema = yup.object().shape({
  accountHolderName: yup.string()
    .matches(NAME_REGEX, 'val_only_characters_allowed')
    .required('val_account_name_required'),
  accountNumber: yup.string()
    .matches(/^[0-9]{8,16}$/, 'val_account_number_8_16_digits')
    .required('val_account_number_required'),
  ifscCode: yup.string().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'val_invalid_ifsc_code').required('val_ifsc_code_required'),
  bankName: yup.string().required('val_bank_name_required'),
});

export const otherDetailsSchema = yup.object().shape({
  availability: yup.string().required('val_availability_required'),
  hasVehicle: yup.string().required('val_select_yes_no'),
  vehicleType: yup.string().when('hasVehicle', {
    is: 'yes',
    then: (schema) => schema.required('val_vehicle_type_required'),
  }),
  vehicleRegNo: yup.string().when('hasVehicle', {
    is: 'yes',
    then: (schema) => schema.required('val_reg_number_required'),
  }),
  dlNumber: yup.string().when('hasVehicle', {
    is: 'yes',
    then: (schema) => schema.required('val_dl_number_required'),
  }),
});
