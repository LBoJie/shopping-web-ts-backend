import { Response, NextFunction } from "express";
import { JwtReq } from "../common/ReqRes";
import { verifyAccessToken } from "./jwt";
import responseFormat from "./responseFormat";
import HttpStatusCodes from "../common/HttpStatusCodes";
const authenticateAccessToken = async (req: JwtReq, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json(responseFormat(req.body, "缺少身分驗證，請重新登入"));
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json(responseFormat(req.body, "身分驗證錯誤或已過期"));
  }

  req.member = payload;

  next();
};

export default authenticateAccessToken;
