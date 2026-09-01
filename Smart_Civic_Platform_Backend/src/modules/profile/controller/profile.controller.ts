import { Request, Response } from "express";
import { ProfileService } from "../service/profile.service";
import { sendSuccess, sendError } from "../../../utils/response";

export class ProfileController {
  constructor(private profileService: ProfileService) {}

  public updateIdentity = async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return sendError(res, "Unauthorized", 401);
      }

      const data = await this.profileService.updateIdentity(user.id, req.body);
      return sendSuccess(res, data, "Identity updated successfully");
    } catch (e: any) {
      console.error("[ProfileController.updateIdentity] Error:", e);
      return sendError(res, e.message, 400);
    }
  };

  public updateProfilePicture = async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return sendError(res, "Unauthorized", 401);
      }

      if (!req.body.profile_picture) {
        return sendError(res, "profile_picture base64 string is required", 400);
      }

      const data = await this.profileService.updateProfilePicture(
        user.id,
        user.role,
        req.body.profile_picture
      );
      return sendSuccess(res, data, "Profile picture updated successfully");
    } catch (e: any) {
      console.error("[ProfileController.updateProfilePicture] Error:", e);
      return sendError(res, e.message, 400);
    }
  };
}
