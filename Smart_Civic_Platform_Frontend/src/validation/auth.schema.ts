import * as Yup from 'yup';

export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

export const registerSchema = Yup.object().shape({
  fullName: Yup.string()
    .min(3, 'Name is too short')
    .required('Full Name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  phone: Yup.string()
    .matches(/^[0-9+-\s]*$/, 'Invalid phone number format')
    .optional(),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Must contain at least one number')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),

  firstName: Yup.string().required('First name is required'),
  middleName: Yup.string().optional(),
  lastName: Yup.string().required('Last name is required'),

  gender: Yup.string()
    .oneOf(['male', 'female', 'other', 'prefer_not_to_say'])
    .required('Gender selection is required'),

  permanentProvince: Yup.string().required('Province is required'),
  permanentDistrict: Yup.string().required('District is required'),
  permanentMunicipality: Yup.string().required('Municipality is required'),
  permanentWard: Yup.string().optional(),

  tempSameAsPermanent: Yup.boolean(),
  tempProvince: Yup.string().when('tempSameAsPermanent', {
    is: false,
    then: (s) => s.required('Province is required'),
    otherwise: (s) => s.optional(),
  }),
  tempDistrict: Yup.string().when('tempSameAsPermanent', {
    is: false,
    then: (s) => s.required('District is required'),
    otherwise: (s) => s.optional(),
  }),
  tempMunicipality: Yup.string().when('tempSameAsPermanent', {
    is: false,
    then: (s) => s.required('Municipality is required'),
    otherwise: (s) => s.optional(),
  }),
  tempWard: Yup.string().optional(),

  registrationCode: Yup.string().optional(),
  acceptTerms: Yup.boolean()
    .oneOf([true], 'You must accept the terms and conditions')
    .required(),
});
