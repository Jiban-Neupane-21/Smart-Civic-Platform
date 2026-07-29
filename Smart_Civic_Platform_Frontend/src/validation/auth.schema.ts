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
    .matches(/^(?:\+977-?)?(98|97)\d{8}$/, 'Invalid Nepal phone number')
    .optional(),
  dateOfBirth: Yup.date()
    .max(new Date(Date.now() - 16 * 365 * 24 * 60 * 60 * 1000), 'Must be at least 16 years old')
    .required('Date of birth is required')
    .typeError('Invalid date'),
  gender: Yup.string()
    .oneOf(['male', 'female', 'other', 'prefer_not_to_say'])
    .required('Gender selection is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Must contain at least one number')
    .required('Password is required'),
  registrationCode: Yup.string().optional(),
  acceptTerms: Yup.boolean()
    .oneOf([true], 'You must accept the terms and conditions')
    .required(),
});
