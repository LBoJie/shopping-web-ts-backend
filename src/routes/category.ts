import { Router } from "express";
import HttpStatusCodes from "../common/HttpStatusCodes";
import { IReq, IRes } from "../common/ReqRes";
import responseFormat from "../utils/responseFormat";
import { CategoryModel } from "../models/index";

const router = Router();

/**
 * @swagger
 * /category:
 *   get:
 *     summary: 取得所有分類
 *     description: 取得所有分類資料。
 *     tags:
 *       - Category
 *     responses:
 *       200:
 *         description: 成功取得分類資料
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: 分類的 ID
 *                         example: 1
 *                       name:
 *                         type: string
 *                         description: 分類名稱
 *                         example: "Electronics"
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

router.get("/", async (req: IReq, res: IRes) => {
  try {
    const category = await CategoryModel.findAll();
    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, category));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

export default router;
