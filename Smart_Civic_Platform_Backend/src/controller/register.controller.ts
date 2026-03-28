// src/controllers/register.controller.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as RegisterService from '../services/register.service';

const handleValidation = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    return false;
  }
  return true;
};

export const registerMunicipality = async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  try {
    const data = await RegisterService.registerMunicipality(req.body);
    res.status(201).json({ success: true, message: 'Municipality registered successfully', data });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ success: false, message: err.message });
  }
};

export const registerDepartment = async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  try {
    const data = await RegisterService.registerDepartment(req.body, req.user!);
    res.status(201).json({ success: true, message: 'Department registered successfully', data });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ success: false, message: err.message });
  }
};

export const registerStaff = async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  try {
    const data = await RegisterService.registerStaff(req.body, req.user!);
    res.status(201).json({ success: true, message: 'Staff registered successfully', data });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ success: false, message: err.message });
  }
};

export const registerCitizen = async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  try {
    const data = await RegisterService.registerCitizen(req.body);
    res.status(201).json({ success: true, message: 'Citizen registered successfully', data });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ success: false, message: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  try {
    const data = await RegisterService.loginUser(req.body.email, req.body.password);
    res.status(200).json({ success: true, message: 'Login successful', data });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ success: false, message: err.message });
  }
};