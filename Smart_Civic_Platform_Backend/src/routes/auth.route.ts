// src/routes/auth.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import * as Controller from "../controller/register.controller";
import {
  validateMunicipalityRegister,
  validateDepartmentRegister,
  validateStaffRegister,
  validateCitizenRegister,
  validateLogin,
} from "../validators/register.validators";

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login for all roles
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validateLogin, Controller.login);

/**
 * @swagger
 * /api/auth/register/municipality:
 *   post:
 *     tags: [Registration]
 *     summary: Register a new municipality (superadmin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterMunicipalityRequest'
 *     responses:
 *       201:
 *         description: Municipality registered successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not superadmin)
 *       409:
 *         description: Email already registered
 */
router.post(
  "/register/municipality",
  authenticate,
  requireRole("superadmin"),
  validateMunicipalityRegister,
  Controller.registerMunicipality,
);

/**
 * @swagger
 * /api/auth/register/department:
 *   post:
 *     tags: [Registration]
 *     summary: Register a new department (municipality head only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterDepartmentRequest'
 *     responses:
 *       201:
 *         description: Department registered successfully
 *       403:
 *         description: Not authorized
 *       409:
 *         description: Email already registered
 */
router.post(
  "/register/department",
  authenticate,
  requireRole("municipality_head"),
  validateDepartmentRegister,
  Controller.registerDepartment,
);

/**
 * @swagger
 * /api/auth/register/staff:
 *   post:
 *     tags: [Registration]
 *     summary: Register a staff member (municipality head or department head)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterStaffRequest'
 *     responses:
 *       201:
 *         description: Staff registered successfully
 *       403:
 *         description: Not authorized or cross-municipality violation
 *       409:
 *         description: Email already registered
 */
router.post(
  "/register/staff",
  authenticate,
  requireRole("municipality_head", "department_head"),
  validateStaffRegister,
  Controller.registerStaff,
);

/**
 * @swagger
 * /api/auth/register/citizen:
 *   post:
 *     tags: [Registration]
 *     summary: Citizen self-registration (public)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterCitizenRequest'
 *     responses:
 *       201:
 *         description: Citizen registered, verification email sent
 *       409:
 *         description: Email already registered
 */
router.post(
  "/register/citizen",
  validateCitizenRegister,
  Controller.registerCitizen,
);

export default router;
