import { Router } from "express";
import HttpStatusCodes from "../common/HttpStatusCodes";
import { IReq, IRes } from "../common/ReqRes";
import responseFormat from "../utils/responseFormat";
import { CarouselModel } from "../models/index";

const router = Router();


/**
 * @swagger
 * /carousel/{id}:
 *   get:
 *     summary: 查詢對應分類下的輪播項目
 *     tags:
 *       - Carousel
 *     description: 根據分類 `id` 查詢對應的輪播項目，並依照 `order` 字段進行排序後返回。
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 輪播項目的分類 ID
 *     responses:
 *       200:
 *         description: 成功返回對應分類下的輪播項目
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
 *                   description: 輪播項目數據
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: 輪播項目 ID
 *                         example: 1
 *                       category:
 *                         type: integer
 *                         description: 分類 ID
 *                         example: 2
 *                       imgUrl:
 *                         type: string
 *                         description: 輪播圖片的 URL
 *                         example: "https://example.com/image.jpg"
 *                       order:
 *                         type: integer
 *                         description: 輪播項目的排序順序
 *                         example: 1
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

router.get("/:id", async (req: IReq, res: IRes) => {
  try {
    const catrgoryId = req.params.id;
    const carousels = await CarouselModel.findAll({
      where: {
        category: catrgoryId,
      },
      order: [["order", "ASC"]],
    });

    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, carousels));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

export default router;
