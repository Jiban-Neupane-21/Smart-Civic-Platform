import { Request, Response } from "express";
import * as MunicipalityService from "../service/municipality.service";
import { sendSuccess, sendError } from "../utils/response";

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const data = await MunicipalityService.getDashboard(
      req.user!.municipality_id!,
      {
        status: req.query.status as string,
        priority: req.query.priority as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      },
    );
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message);
  }
};

export const assignToDepartment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await MunicipalityService.assignToDepartment(
      id,
      req.body.department_id,
      req.user!.id,
      req.body.remark,
    );
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const rejectComplaint = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await MunicipalityService.rejectComplaint(
      id,
      req.user!.id,
      req.body.reason,
    );
    return sendSuccess(res, data);
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const getDepartments = async (req: Request, res: Response) => {
  try {
    return sendSuccess(
      res,
      await MunicipalityService.getDepartments(req.user!.municipality_id!),
    );
  } catch (e: any) {
    return sendError(res, e.message);
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    return sendSuccess(
      res,
      await MunicipalityService.createDepartment(
        req.user!.municipality_id!,
        req.body,
      ),
      "Department created",
      201,
    );
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    return sendSuccess(
      res,
      await MunicipalityService.updateDepartment(
        req.params.id as string,
        req.user!.municipality_id!,
        req.body,
      ),
    );
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    await MunicipalityService.deleteDepartment(
      req.params.id as string,
      req.user!.municipality_id!,
    );
    return sendSuccess(res, null, "Department deleted");
  } catch (e: any) {
    return sendError(res, e.message, 400);
  }
};

export const getSLABreaches = async (req: Request, res: Response) => {
  try {
    return sendSuccess(
      res,
      await MunicipalityService.getSLABreaches(req.user!.municipality_id!),
    );
  } catch (e: any) {
    return sendError(res, e.message);
  }
};

export const getPendingInvitations = async (req: Request, res: Response) => {
  try {
    return sendSuccess(
      res,
      await MunicipalityService.getPendingInvitations(
        req.user!.municipality_id!,
      ),
    );
  } catch (e: any) {
    return sendError(res, e.message);
  }
};
