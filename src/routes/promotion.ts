import { Router } from "express";
import HttpStatusCodes from "../common/HttpStatusCodes";
import { IReq, IRes } from "../common/ReqRes";
import responseFormat from "../utils/responseFormat";
import { Op } from "sequelize";
import { ProductModel, PromotionItemModel, PromotionModel, CategoryModel } from "../models/index";

const router = Router();



/**
 * @swagger
 * /promotion/{id}:
 *   get:
 *     summary: 根據促銷活動 ID 獲取促銷活動詳細資訊和相關產品
 *     description: 根據促銷活動 ID 獲取促銷活動的詳細資訊及參與該活動的產品資訊，包括產品的折扣價格、庫存等。
 *     tags:
 *       - Promotion
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 促銷活動 ID
 *       - in: query
 *         name: startIdx
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 分頁起始索引
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "id"
 *         description: 排序字段
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           default: "ASC"
 *         description: 排序順序，"ASC" 或 "DESC"
 *     responses:
 *       200:
 *         description: 成功取得促銷活動及相關產品資訊
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                 responseData:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 促銷活動 ID
 *                     name:
 *                       type: string
 *                       description: 促銷活動名稱
 *                     description:
 *                       type: string
 *                       description: 促銷活動描述
 *                     startDate:
 *                       type: string
 *                       format: date
 *                       description: 促銷活動開始日期
 *                     endDate:
 *                       type: string
 *                       format: date
 *                       description: 促銷活動結束日期
 *                     discountType:
 *                       type: string
 *                       description: 促銷折扣類型
 *                     discountValue:
 *                       type: number
 *                       description: 促銷折扣值
 *                     imgUrl:
 *                       type: string
 *                       description: 促銷活動圖片 URL
 *                     isActive:
 *                       type: string
 *                       description: 促銷活動是否啟用
 *                     promotionProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: 產品 ID
 *                           name:
 *                             type: string
 *                             description: 產品名稱
 *                           price:
 *                             type: number
 *                             description: 產品價格
 *                           discountPrice:
 *                             type: number
 *                             description: 折扣後價格
 *                           inventory:
 *                             type: integer
 *                             description: 產品庫存
 *                           imgUrl:
 *                             type: string
 *                             description: 產品圖片 URL
 *                           categoryName:
 *                             type: string
 *                             description: 產品所屬分類名稱
 *                           status:
 *                             type: string
 *                             description: 產品狀態
 *       400:
 *         description: 無此促銷活動
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "無此活動"
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
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

//取得活動
router.get("/:id", async (req: IReq, res: IRes) => {
  let { startIdx = 0, sort = "id", order = "ASC" } = req.query;
  const promotionId = req.params.id;
  startIdx = Number(startIdx);
  const promotion = await PromotionModel.findOne({
    where: {
      id: promotionId,
      isActive: "1",
    },
    include: [
      {
        model: PromotionItemModel,
        as: "promotionItems",
        include: [
          {
            model: ProductModel,
            as: "product",
            where: {
              status: "1",
              inventory: {
                [Op.ne]: 0, // 確保 inventory 不等於 0
              },
            },
            include: [
              {
                model: CategoryModel,
                as: "category",
              },
            ],
          },
        ],
      },
    ],
  });
  if (!promotion) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此活動"));
  }

  const orderProducts = promotion.promotionItems
    ?.map((item) => {
      return {
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        discountPrice: Math.ceil(item.product.price * (promotion.discountValue / 100)),
        inventory: item.product.inventory,
        imgUrl: item.product.imgUrl,
        categoryName: item.product.category!.name,
        status: item.product.status,
      };
    })
    .sort((a, b) => {
      if (sort === "id") {
        return a.id - b.id;
      } else {
        return order === "ASC" ? a.discountPrice - b.discountPrice : b.discountPrice - a.discountPrice;
      }
    })
    .slice(startIdx, startIdx + 16);

  const result = {
    id: promotion.id,
    name: promotion.name,
    description: promotion.description,
    startDate: promotion.startDate,
    endDate: promotion.endDate,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
    imgUrl: promotion.imgUrl,
    isActive: promotion.isActive,
    promotionProducts: orderProducts,
  };
  res.status(HttpStatusCodes.OK).json(responseFormat(req.body, result));
});
export default router;
