import { Request, Response } from "express";
import * as CitizenService from "../services/citizen.service";
import { sendSuccess, sendError } from "../../../utils/response";

export const submitComplaint = async (req: Request, res: Response) => {
  console.log("--> [submitComplaint] Received request from:", req.user?.id);
  try {
    const data = await CitizenService.submitComplaint(
      req.user!.id,
      req.body,
      req.userClient!,
    );
    console.log("<-- [submitComplaint] Successfully processed for:", req.user?.id);
    return sendSuccess(res, data, "Complaint submitted successfully", 201);
  } catch (e: any) {
    console.error("!-! [submitComplaint] Error:", e.message);
    return sendError(res, e.message, 400);
  }
};

export const getMyComplaints = async (req: Request, res: Response) => {
  try {
    const data = await CitizenService.getMyComplaints(
      req.user!.id,
      req.query.status as string,
      req.userClient!,
    );
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const getComplaintDetail = async (req: Request, res: Response) => {
  try {
    const complaintId = req.params.id as string;
    const data = await CitizenService.getComplaintDetail(
      req.user!.id,
      complaintId,
      req.userClient!,
    );
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message, 404);
  }
};

export const getComplaintHistory = async (req: Request, res: Response) => {
  try {
    const complaintId = req.params.id as string;
    const data = await CitizenService.getComplaintHistory(
      req.user!.id,
      complaintId,
      req.userClient!,
    );
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message, 404);
  }
};

export const reopenComplaint = async (req: Request, res: Response) => {
  try {
    const complaintId = req.params.id as string;
    const { reopen_reason } = req.body;
    const data = await CitizenService.reopenComplaint(
      req.user!.id,
      complaintId,
      reopen_reason || "Reopened by citizen"
    );
    return sendSuccess(res, data, "Complaint reopened successfully.");
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const addComplaintNote = async (req: Request, res: Response) => {
  try {
    const complaintId = req.params.id as string;
    const { note } = req.body;
    const data = await CitizenService.addComplaintNote(req.user!.id, complaintId, note);
    return sendSuccess(res, data, "Note added to complaint.", 201);
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const getComplaintUpdates = async (req: Request, res: Response) => {
  try {
    const complaintId = req.params.id as string;
    const data = await CitizenService.getComplaintUpdates(complaintId);
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const uploadComplaintMedia = async (req: Request, res: Response) => {
  try {
    const complaintId = req.params.id as string;
    const { media_base64, file_name } = req.body;
    if (!media_base64) {
      return sendError(res, "media_base64 is required.", 400);
    }
    const data = await CitizenService.uploadComplaintMedia(
      req.user!.id,
      complaintId,
      media_base64,
      file_name || "evidence.jpg"
    );
    return sendSuccess(res, data, "Media evidence uploaded successfully.", 201);
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const getProvinces = async (_req: Request, res: Response) => {
  try {
    const data = await CitizenService.getProvinces();
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message);
  }
};

export const getDistricts = async (req: Request, res: Response) => {
  try {
    const provinceId = req.query.province_id as string | undefined;
    const data = await CitizenService.getDistricts(provinceId);
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message);
  }
};

export const getMunicipalities = async (req: Request, res: Response) => {
  try {
    const districtId = req.query.district_id as string | undefined;
    const data = await CitizenService.getMunicipalities(districtId);
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message);
  }
};

export const getWards = async (req: Request, res: Response) => {
  try {
    const municipalityId = (req.query.municipality_id as string) || (req.params.municipalityId as string);
    if (!municipalityId) {
      return sendError(res, "municipality_id parameter is required.", 400);
    }
    const data = await CitizenService.getWards(municipalityId);
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message);
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const municipalityId = req.params.municipalityId as string;
    const data = await CitizenService.getCategories(municipalityId);
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message);
  }
};

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const complaintId = req.params.id as string;
    const data = await CitizenService.submitFeedback(
      req.user!.id,
      complaintId,
      req.body,
      req.userClient!,
    );
    return sendSuccess(res, data, "Feedback submitted", 201);
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const updateAddress = async (req: Request, res: Response) => {
  try {
    const data = await CitizenService.updateStructuredAddress(req.user!.id, req.body);
    return sendSuccess(res, data, "Structured address updated successfully.");
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const uploadIdentity = async (req: Request, res: Response) => {
  try {
    const data = await CitizenService.uploadIdentityDocuments(req.user!.id, req.body);
    return sendSuccess(res, data, "Identity document uploaded for verification.", 201);
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const data = await CitizenService.updateProfile(req.user!.id, req.body);
    return sendSuccess(res, data, "Profile updated successfully");
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const data = await CitizenService.getDashboardData(
      req.user!.id,
      req.userClient!,
    );
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message, 500);
  }
};
