import { Request, Response } from "express";
import * as CitizenService from "../services/citizen.service";
import { sendSuccess, sendError } from "../../../utils/response";

export const submitComplaint = async (req: Request, res: Response) => {
  try {
    const data = await CitizenService.submitComplaint(
      req.user!.id,
      req.body,
      req.userClient!,
    );
    return sendSuccess(res, data, "Complaint submitted successfully", 201);
  } catch (e: any) {
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

export const getMunicipalities = async (_req: Request, res: Response) => {
  try {
    const data = await CitizenService.getMunicipalities();
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
