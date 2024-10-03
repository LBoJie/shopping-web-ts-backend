import { Router } from "express";
import { IReq, IRes, JwtReq } from "../common/ReqRes";
import HttpStatusCodes from "../common/HttpStatusCodes";
import { MemberModel } from "../models/index";
import authenticateAccessToken from "../utils/authenticateAccessToken";
import { verifyRefreshToken } from "../utils/jwt";
import responseFormat from "../utils/responseFormat";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { v4 as uuidv4 } from "uuid";
const router = Router();

type AccessMember = {
  id: number;
  account: string;
  name: string;
  phone: string;
  email: string;
  birthday: Date;
  role: string;
};

/**
 * @swagger
 * /refreshToken:

 *   get:
 *     summary: 更新 accessToken 和 refreshToken
 *     tags:
 *       - Authentication
 *     description: 使用有效的 refreshToken 來生成新的 accessToken 和 refreshToken。
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         schema:
 *           type: string
 *         required: true
 *         description: Bearer {refreshToken}
 *     responses:
 *       200:
 *         description: 成功生成新的 accessToken 和 refreshToken
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example: {}
 *                 responseData:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: 新的 accessToken
 *                       example: "newAccessToken12345"
 *                     refreshToken:
 *                       type: string
 *                       description: 新的 refreshToken
 *                       example: "newRefreshToken67890"
 *       400:
 *         description: 請求無效，可能是帳號或 token 出現問題
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example: {}
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "無此帳號，請重新確認"
 *       401:
 *         description: 未授權，可能是缺少或無效的 refreshToken
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example: {}
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: 缺少身分驗證 或 refreshToken驗證錯誤或已過期
 *       500:
 *         description: 伺服器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example: {}
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

router.get("/refreshToken", async (req: IReq, res: IRes) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json(responseFormat(req.body, "缺少身分驗證"));
  }

  const payload = verifyRefreshToken(token);
  if (!payload) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json(responseFormat(req.body, "refreshToken驗證錯誤或已過期"));
  }
  const member = await MemberModel.findByPk(payload.id);
  if (!member) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此帳號，請重新確認"));
  }
  if (member.refreshTokenJti !== payload.jti) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "連線逾時，請重新登入"));
  }

  const accessMember: AccessMember = {
    id: member.id,
    account: member.account,
    name: member.name,
    phone: member.phone,
    email: member.email,
    birthday: member.birthday,
    role: member.role,
  };
  const accessToken = generateAccessToken(accessMember);
  const refreshToken = generateRefreshToken({ id: accessMember.id, jti: member.refreshTokenJti });

  res.status(HttpStatusCodes.OK).json(responseFormat(req.body, { accessToken, refreshToken }));
});

export default router;
