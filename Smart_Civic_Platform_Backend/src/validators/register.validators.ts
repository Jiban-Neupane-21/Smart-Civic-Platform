// src/validators/register.validators.ts
import { body } from "express-validator";

const strongPassword = body("password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters")
  .matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
  .withMessage(
    "Password must contain uppercase, number, and special character",
  );

export const validateMunicipalityRegister = [
  body("official_name")
    .trim()
    .notEmpty()
    .withMessage("Official name is required"),
  body("login_email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid login email required"),
  body("head_full_name")
    .trim()
    .notEmpty()
    .withMessage("Head full name is required"),
  body("time_zone").notEmpty().withMessage("Time zone is required"),
  body("country_code").optional().isLength({ min: 2, max: 2 }),
  strongPassword,
];

export const validateDepartmentRegister = [
  body("dept_name")
    .trim()
    .notEmpty()
    .withMessage("Department name is required"),
  body("service_type")
    .trim()
    .notEmpty()
    .withMessage("Service type is required"),
  body("head_full_name")
    .trim()
    .notEmpty()
    .withMessage("Head full name is required"),
  body("head_email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid head email required"),
  body("head_password")
    .isStrongPassword({
      minLength: 8,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "Head password must be 8+ chars with uppercase, number, and symbol",
    ),
];

export const validateStaffRegister = [
  body("full_name").trim().notEmpty().withMessage("Full name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("staff_role")
    .isIn(["department_head", "staff"])
    .withMessage("staff_role must be department_head or staff"),
  body("designation").trim().notEmpty().withMessage("Designation is required"),
  body("department_id")
    .optional()
    .isUUID()
    .withMessage("department_id must be a valid UUID"),
  strongPassword,
];

export const validateCitizenRegister = [
  body("first_name").trim().notEmpty().withMessage("First name is required"),
  body("last_name").trim().notEmpty().withMessage("Last name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("municipality_id")
    .optional()
    .isUUID()
    .withMessage("municipality_id must be a UUID"),
  strongPassword,
];

export const validateLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
];
