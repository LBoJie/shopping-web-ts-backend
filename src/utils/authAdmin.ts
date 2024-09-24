import { NextFunction } from "express";
import { IReq, IRes } from "../common/ReqRes";
import { verifyAccessToken } from "./jwt";
import responseFormat from "../utils/responseFormat";
import HttpStatusCodes from "../common/HttpStatusCodes";
export const authAdmin = async (req: IReq, res: IRes, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json(responseFormat(req.body, "缺少身分驗證，請重新登入"));
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json(responseFormat(req.body, "身分驗證錯誤或已過期"));
  }
  if (payload.role !== "admin") {
    return res.status(HttpStatusCodes.FORBIDDEN).json(responseFormat(req.body, "無權限執行此行為"));
  }
  next();
};
