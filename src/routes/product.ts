import { Router } from "express";
import HttpStatusCodes from "../common/HttpStatusCodes";
import { Op } from "sequelize";
import { IReq, IRes } from "../common/ReqRes";
import { ProductModel, CategoryModel, PromotionItemModel, PromotionModel } from "../models/index";
import responseFormat from "../utils/responseFormat";
const router = Router();

/**
 * @swagger
 * /product/category/{categoryId}:
 *   get:
 *     summary: 根據分類 ID 取得產品列表
 *     description: 根據指定的分類 ID 取得產品列表，支援排序和篩選，並處理促銷資訊。
 *     tags:
 *       - Product
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: 產品分類的 ID。傳入 "0" 取得所有分類的產品。
 *       - in: query
 *         name: startIdx
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 分頁起始索引。
 *       - in: query
 *         name: sort
 *         required: false
 *         schema:
 *           type: string
 *           default: id
 *           enum: [id, price]
 *         description: 依據該字段排序。可以是 "id" 或 "price"。
 *       - in: query
 *         name: order
 *         required: false
 *         schema:
 *           type: string
 *           default: ASC
 *           enum: [ASC, DESC]
 *         description: 排序方式，可以是 "ASC" 或 "DESC"。
 *     responses:
 *       200:
 *         description: 成功取得產品列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                 responseData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: 產品 ID
 *                       categoryName:
 *                         type: string
 *                         description: 產品所屬分類名稱
 *                       imgUrl:
 *                         type: string
 *                         description: 產品圖片 URL
 *                       inventory:
 *                         type: integer
 *                         description: 產品庫存
 *                       name:
 *                         type: string
 *                         description: 產品名稱
 *                       price:
 *                         type: number
 *                         description: 產品價格
 *                       promotion:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: 促銷活動 ID
 *                           name:
 *                             type: string
 *                             description: 促銷活動名稱
 *                           discountType:
 *                             type: string
 *                             description: 促銷活動折扣類型
 *                           discountValue:
 *                             type: number
 *                             description: 促銷折扣值
 *                           isActive:
 *                             type: boolean
 *                             description: 促銷活動是否啟用
 *                           discountPrice:
 *                             type: number
 *                             description: 折扣後價格
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

router.get("/category/:categoryId", async (req: IReq, res: IRes) => {
  try {
    //新曾活動內容
    let { startIdx = 0, sort = "id", order = "ASC" } = req.query;
    const categoryId = req.params.categoryId;
    let products: ProductModel[] = [];
    startIdx = Number(startIdx);
    if (categoryId === "0") {
      products = await ProductModel.findAll({
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
          {
            model: PromotionItemModel,
            as: "promotionItem",
            include: [
              {
                model: PromotionModel,
                as: "promotion",
              },
            ],
          },
        ],
      });
    } else {
      products = await ProductModel.findAll({
        order: [[sort as string, order as string]],
        where: {
          status: "1",
          inventory: {
            [Op.ne]: 0, // 確保 inventory 不等於 0
          },
          categoryId: categoryId,
        },
        include: [
          {
            model: CategoryModel,
            as: "category",
          },
          {
            model: PromotionItemModel,
            as: "promotionItem",
            include: [
              {
                model: PromotionModel,
                as: "promotion",
              },
            ],
          },
        ],
      });
    }

    const result = products
      .map((product) => {
        let isWithinRange = false;
        if (product.promotionItem) {
          const today = new Date();
          const startDate = new Date(product.promotionItem!.promotion.startDate);
          const endDate = new Date(product.promotionItem!.promotion.endDate);
          isWithinRange = today >= startDate && today <= endDate;
        }

        return {
          id: product.id,
          categoryName: product.category?.name,
          imgUrl: product.imgUrl,
          inventory: product.inventory,
          name: product.name,
          price: product.price,
          promotion:
            product.promotionItem && product.promotionItem.promotion.isActive && isWithinRange
              ? {
                  id: product.promotionItem.promotionId,
                  name: product.promotionItem.promotion.name,
                  discountType: product.promotionItem.promotion.discountType,
                  discountValue: product.promotionItem.promotion.discountValue,
                  isActive: product.promotionItem.promotion.isActive,
                  discountPrice: Math.ceil(product.price * (product.promotionItem.promotion.discountValue / 100)),
                }
              : null,
        };
      })
      .sort((a, b) => {
        if (sort === "id") {
          return a.id - b.id;
        } else {
          const comparePriceA = a.promotion ? a.promotion.discountPrice : a.price;
          const comparePriceB = b.promotion ? b.promotion.discountPrice : b.price;
          return order === "ASC" ? comparePriceA - comparePriceB : comparePriceB - comparePriceA;
        }
      })
      .slice(startIdx, startIdx + 16);
    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, result));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});


/**
 * @swagger
 * /product/search:
 *   get:
 *     summary: 根據關鍵字搜尋產品
 *     description: 根據關鍵字搜尋產品，支援排序和分頁，並處理促銷資訊。
 *     tags:
 *       - Product
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         description: 搜尋關鍵字，用於匹配產品名稱。
 *       - in: query
 *         name: startIdx
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 分頁起始索引。
 *       - in: query
 *         name: sort
 *         required: false
 *         schema:
 *           type: string
 *           default: id
 *           enum: [id, price]
 *         description: 依據該字段排序。可以是 "id" 或 "price"。
 *       - in: query
 *         name: order
 *         required: false
 *         schema:
 *           type: string
 *           default: ASC
 *           enum: [ASC, DESC]
 *         description: 排序方式，可以是 "ASC" 或 "DESC"。
 *     responses:
 *       200:
 *         description: 成功取得產品列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                 responseData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: 產品 ID
 *                       categoryName:
 *                         type: string
 *                         description: 產品所屬分類名稱
 *                       imgUrl:
 *                         type: string
 *                         description: 產品圖片 URL
 *                       inventory:
 *                         type: integer
 *                         description: 產品庫存
 *                       name:
 *                         type: string
 *                         description: 產品名稱
 *                       price:
 *                         type: number
 *                         description: 產品價格
 *                       promotion:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: 促銷活動 ID
 *                           name:
 *                             type: string
 *                             description: 促銷活動名稱
 *                           discountType:
 *                             type: string
 *                             description: 促銷活動折扣類型
 *                           discountValue:
 *                             type: number
 *                             description: 促銷折扣值
 *                           isActive:
 *                             type: boolean
 *                             description: 促銷活動是否啟用
 *                           discountPrice:
 *                             type: number
 *                             description: 折扣後價格
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

router.get("/search", async (req: IReq, res: IRes) => {
  try {
    let { keyword, startIdx = 0, sort = "id", order = "ASC" } = req.query;
    startIdx = Number(startIdx);
    const products = await ProductModel.findAll({
      where: {
        name: { [Op.like]: `%${keyword}%` },
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
        {
          model: PromotionItemModel,
          as: "promotionItem",
          include: [
            {
              model: PromotionModel,
              as: "promotion",
            },
          ],
        },
      ],
    });
    const result = products
      .map((product) => {
        let isWithinRange = false;
        if (product.promotionItem) {
          const today = new Date();
          const startDate = new Date(product.promotionItem!.promotion.startDate);
          const endDate = new Date(product.promotionItem!.promotion.endDate);
          isWithinRange = today >= startDate && today <= endDate;
        }

        return {
          id: product.id,
          categoryName: product.category?.name,
          imgUrl: product.imgUrl,
          inventory: product.inventory,
          name: product.name,
          price: product.price,
          promotion:
            product.promotionItem && product.promotionItem.promotion.isActive && isWithinRange
              ? {
                  id: product.promotionItem.promotionId,
                  name: product.promotionItem.promotion.name,
                  discountType: product.promotionItem.promotion.discountType,
                  discountValue: product.promotionItem.promotion.discountValue,
                  isActive: product.promotionItem.promotion.isActive,
                  discountPrice: Math.ceil(product.price * (product.promotionItem.promotion.discountValue / 100)),
                }
              : null,
        };
      })
      .sort((a, b) => {
        if (sort === "id") {
          return a.id - b.id;
        } else {
          const comparePriceA = a.promotion ? a.promotion.discountPrice : a.price;
          const comparePriceB = b.promotion ? b.promotion.discountPrice : b.price;
          return order === "ASC" ? comparePriceA - comparePriceB : comparePriceB - comparePriceA;
        }
      })
      .slice(startIdx, startIdx + 16);
    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, result));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});


/**
 * @swagger
 * /product/{id}:
 *   get:
 *     summary: 根據產品 ID 獲取產品詳細資訊
 *     description: 根據產品 ID 獲取產品的詳細資訊，包括分類、促銷活動等。
 *     tags:
 *       - Product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 產品 ID
 *     responses:
 *       200:
 *         description: 成功取得產品詳細資訊
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
 *                       description: 產品 ID
 *                     categoryName:
 *                       type: string
 *                       description: 產品所屬分類名稱
 *                     categoryId:
 *                       type: integer
 *                       description: 產品所屬分類 ID
 *                     imgUrl:
 *                       type: string
 *                       description: 產品圖片 URL
 *                     inventory:
 *                       type: integer
 *                       description: 產品庫存
 *                     name:
 *                       type: string
 *                       description: 產品名稱
 *                     price:
 *                       type: number
 *                       description: 產品價格
 *                     promotion:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: integer
 *                           description: 促銷活動 ID
 *                         name:
 *                           type: string
 *                           description: 促銷活動名稱
 *                         discountType:
 *                           type: string
 *                           description: 促銷活動折扣類型
 *                         discountValue:
 *                           type: number
 *                           description: 促銷折扣值
 *                         isActive:
 *                           type: boolean
 *                           description: 促銷活動是否啟用
 *                         discountPrice:
 *                           type: number
 *                           description: 折扣後價格
 *       400:
 *         description: 無此商品
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
 *                   example: "無此商品"
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


router.get("/:id", async (req: IReq, res: IRes) => {
  try {
    const id = req.params.id;
    const product = await ProductModel.findByPk(id, {
      include: [
        {
          model: CategoryModel,
          as: "category",
        },
        {
          model: PromotionItemModel,
          as: "promotionItem",
          include: [
            {
              model: PromotionModel,
              as: "promotion",
            },
          ],
        },
      ],
    });
    if (!product) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此商品"));
    }
    let isWithinRange = false;
    if (product.promotionItem) {
      const today = new Date();
      const startDate = new Date(product.promotionItem!.promotion.startDate);
      const endDate = new Date(product.promotionItem!.promotion.endDate);
      isWithinRange = today >= startDate && today <= endDate;
    }
    const result = {
      id: product.id,
      categoryName: product.category!.name,
      categoryId: product.category!.id,
      imgUrl: product.imgUrl,
      inventory: product.inventory,
      name: product.name,
      price: product.price,
      descriptionHtml: product.descriptionHtml,
      promotion:
        product.promotionItem && product.promotionItem.promotion.isActive && isWithinRange
          ? {
              id: product.promotionItem.promotionId,
              name: product.promotionItem.promotion.name,
              discountType: product.promotionItem.promotion.discountType,
              discountValue: product.promotionItem.promotion.discountValue,
              isActive: product.promotionItem.promotion.isActive,
              discountPrice: Math.ceil(product.price * (product.promotionItem.promotion.discountValue / 100)),
            }
          : null,
    };
    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, result));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

export default router;
