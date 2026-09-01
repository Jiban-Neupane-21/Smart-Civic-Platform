import { Request, Response } from "express";
import * as PublicService from "../services/public.service";
import { sendSuccess, sendError } from "../../../utils/response";

export const getProvinces = async (_req: Request, res: Response) => {
  try {
    const data = await PublicService.getPublicProvinces();
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message);
  }
};

export const getDistricts = async (req: Request, res: Response) => {
  try {
    const provinceId = req.query.province_id as string | undefined;
    const data = await PublicService.getPublicDistricts(provinceId);
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message);
  }
};

export const getMunicipalities = async (req: Request, res: Response) => {
  try {
    const districtId = req.query.district_id as string | undefined;
    const data = await PublicService.getPublicMunicipalities(districtId);
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message);
  }
};

export const getWards = async (req: Request, res: Response) => {
  try {
    const municipalityId = req.query.municipality_id as string;
    if (!municipalityId) {
      return sendError(res, "municipality_id query parameter is required.", 400);
    }
    const data = await PublicService.getPublicWards(municipalityId);
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message);
  }
};

export const trackComplaint = async (req: Request, res: Response) => {
  try {
    const trackingId = req.params.trackingId as string;
    const data = await PublicService.trackComplaintByTrackingId(trackingId);
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message, 404);
  }
};

export const validateInvite = async (req: Request, res: Response) => {
  try {
    const token = (req.query.token || req.body.token) as string;
    if (!token) {
      return sendError(res, "Invite token is required.", 400);
    }
    const data = await PublicService.validateRoleInvite(token);
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const acceptInvite = async (req: Request, res: Response) => {
  try {
    const { token, password, full_name, phone } = req.body;
    if (!token || !password || !full_name) {
      return sendError(res, "token, password, and full_name are required fields.", 400);
    }
    const data = await PublicService.acceptRoleInvite(token, password, full_name, phone);
    return sendSuccess(res, data, "Invitation accepted. Onboarding initialized.", 201);
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};
