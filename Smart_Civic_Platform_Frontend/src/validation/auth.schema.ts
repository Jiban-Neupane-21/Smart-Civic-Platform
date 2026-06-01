import * as Yup from 'yup';

// --- LOGIN SCHEMA ---
export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

// --- REGISTER SCHEMA ---
export const registerSchema = Yup.object().shape({
  // Base Profile Fields
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
  
  // Citizen Details (Matches the 'citizens' table requirements)
  firstName: Yup.string().required('First Name is required'),
  lastName: Yup.string().required('Last Name is required'),
  gender: Yup.string()
    .oneOf(['male', 'female', 'other', 'prefer_not_to_say'])
    .required('Gender selection is required'),
  wardNumber: Yup.string().required('Ward Number is required'),
  homeAddress: Yup.string().required('Home Address is required'),
  
  // Optional field mapping to your municipality registration rules
  registrationCode: Yup.string().optional(),
  
  // Terms and conditions UI placeholder
  acceptTerms: Yup.boolean()
    .oneOf([true], 'You must accept the terms and conditions')
    .required(),
});