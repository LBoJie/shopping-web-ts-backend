import { Router } from "express";
import HttpStatusCodes from "../../common/HttpStatusCodes";
import { IReq, IRes } from "../../common/ReqRes";
import responseFormat from "../../utils/responseFormat";
import { ProductModel, PromotionItemModel, PromotionModel, CategoryModel } from "../../models/index";
import Sequelize from "sequelize";
import path from "path";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
const router = Router();
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // 限制文件类型
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("檔案格式錯誤:只能上傳 jpg 或 png"));
    }
    cb(null, true);
  },
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

type Promotion = PromotionModel & {
  img?: Express.Multer.File;
};

/**
 * @swagger
 * /admin/promotion/product:
 *   get:
 *     summary: 獲取所有產品
 *     tags:
 *       - admin - Promotion
 *     description: 返回所有產品的詳細資訊，包括產品 ID、名稱、價格、庫存、狀態、圖片 URL、類別名稱和促銷 ID。
 *     responses:
 *       200:
 *         description: 成功返回所有產品的資訊
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
 *                         description: 產品 ID
 *                         example: 1
 *                       name:
 *                         type: string
 *                         description: 產品名稱
 *                         example: "商品名稱"
 *                       price:
 *                         type: number
 *                         description: 產品價格
 *                         example: 199.99
 *                       inventory:
 *                         type: integer
 *                         description: 產品庫存量
 *                         example: 50
 *                       status:
 *                         type: string
 *                         description: 產品狀態
 *                         example: "available"
 *                       imgUrl:
 *                         type: string
 *                         description: 產品圖片 URL
 *                         example: "https://example.com/image.jpg"
 *                       categoryName:
 *                         type: string
 *                         description: 產品類別名稱
 *                         example: "電子產品"
 *                       inPromotion:
 *                         type: integer
 *                         description: 促銷活動 ID
 *                         example: 123
 *       500:
 *         description: 伺服器錯誤，無法獲取產品資訊
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

router.get("/product", async (req: IReq, res: IRes) => {
  try {
    const products = await ProductModel.findAll({
      attributes: ["id", "name", "price", "inventory", "status", "imgUrl", [Sequelize.col("category.name"), "categoryName"], [Sequelize.col("promotionItem.promotion_id"), "inPromotion"]],
      include: [
        {
          model: CategoryModel,
          as: "category",
          attributes: [],
        },
        {
          model: PromotionItemModel,
          as: "promotionItem",
          attributes: [],
        },
      ],
    });
    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, products));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /admin/promotion/{id}:
 *   get:
 *     summary: 獲取促銷活動資訊
 *     tags:
 *       - admin - Promotion
 *     description: 根據促銷活動 ID 獲取詳細資訊。如果未提供 ID，則返回所有促銷活動的列表。
 *     parameters:
 *       - in: path
 *         name: id
 *         required: false
 *         description: 促銷活動 ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: 成功返回促銷活動資訊或促銷活動列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     id: 1
 *                 responseData:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 促銷活動 ID
 *                       example: 1
 *                     name:
 *                       type: string
 *                       description: 促銷活動名稱
 *                       example: "09/18結束"
 *                     description:
 *                       type: string
 *                       description: 促銷活動描述
 *                       example: "全部一折"
 *                     discountType:
 *                       type: string
 *                       description: 折扣類型
 *                       example: "PERCENTAGE"
 *                     discountValue:
 *                       type: number
 *                       description: 折扣值
 *                       example: 10
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       description: 活動開始日期
 *                       example: "2024-09-16T18:37:00Z"
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       description: 活動結束日期
 *                       example: "2024-09-18T23:59:59Z"
 *                     imgUrl:
 *                       type: string
 *                       description: 活動圖片 URL
 *                       example: "https://shopping-web-promotion-img.s3.ap-northeast-1.amazonaws.com/1726842115762-720373442.png"
 *                     isActive:
 *                       type: boolean
 *                       description: 活動是否啟用
 *                       example: false
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: 創建日期
 *                       example: "2024-09-16T14:49:22Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: 更新日期
 *                       example: "2024-09-20T22:21:55Z"
 *                     productIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       description: 相關產品 ID 列表
 *                       example: [101, 102, 103]
 *       400:
 *         description: 請求錯誤，例如查無促銷活動
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     id: 1
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "無此活動"
 *       500:
 *         description: 伺服器錯誤，無法獲取促銷活動資訊
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     id: 1
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

router.get("/:id?", async (req: IReq, res: IRes) => {
  try {
    const promotionId = req.params.id;
    if (promotionId) {
      const promotion = await PromotionModel.findByPk(promotionId, {
        include: [
          {
            model: PromotionItemModel,
            as: "promotionItems",
            attributes: ["productId"],
          },
        ],
      });
      if (promotion) {
        const { promotionItems, createdAt, updatedAt, ...result } = promotion.toJSON();
        if (promotionItems && promotionItems.length > 0) {
          result.productIds = promotionItems.map((item) => item.productId);
        } else {
          result.productIds = [];
        }
        res.status(HttpStatusCodes.OK).json(responseFormat(req.body, result));
      } else {
        res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此活動"));
      }
    } else {
      const allPromotion = await PromotionModel.findAll();
      return res.status(HttpStatusCodes.OK).json(responseFormat(req.body, allPromotion));
    }
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});


/**
 * @swagger
 * /admin/promotion:
 *   post:
 *     summary: 新增促銷活動
 *     tags:
 *       - admin - Promotion
 *     description: 創建一個新的促銷活動，包括上傳圖片（如果提供）並將促銷活動與產品關聯。
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 活動名稱
 *                 example: "夏季特賣"
 *               description:
 *                 type: string
 *                 description: 活動描述
 *                 example: "所有商品 9 折優惠"
 *               discountType:
 *                 type: string
 *                 description: 折扣類型
 *                 example: "PERCENTAGE"
 *               discountValue:
 *                 type: number
 *                 description: 折扣值
 *                 example: 10
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: 活動開始時間
 *                 example: "2024-09-01T00:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: 活動結束時間
 *                 example: "2024-09-30T23:59:59Z"
 *               isActive:
 *                 type: boolean
 *                 description: 活動是否啟用
 *                 example: true
 *               img:
 *                 type: string
 *                 format: binary
 *                 description: 活動圖片
 *               productIds:
 *                 type: string
 *                 description: 參與活動的產品 ID 列表，JSON 格式 ex "[1,2,3]"
 *                 example: "[1,2,3]"
 *     responses:
 *       201:
 *         description: 成功新增促銷活動
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
 *                   description: 成功訊息
 *                   example: "新增活動成功"
 *       500:
 *         description: 伺服器錯誤，無法新增促銷活動
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

//新增活動
router.post("/", uploadMemory.single("img"), async (req: IReq<Promotion>, res: IRes) => {
  try {
    const promotion = req.body;
    if (req.file) {
      //上傳圖片到 aws-s3
      const putParams = {
        Bucket: process.env.S3_BUCKET_PROMOTION,
        Key: Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname),
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      const putCommand = new PutObjectCommand(putParams);
      await s3.send(putCommand);
      promotion.imgUrl = `https://${process.env.S3_BUCKET_PROMOTION}.s3.${process.env.AWS_REGION}.amazonaws.com/${putParams.Key}`;
    }
    const newPromotion = await PromotionModel.create(promotion);
    if (promotion.productIds && promotion.productIds.length > 0) {
      promotion.productIds = JSON.parse(promotion.productIds as string) as number[];
      const promotionProducts = promotion.productIds.map((id) => {
        return {
          promotionId: newPromotion.id,
          productId: id,
        };
      });
      await PromotionItemModel.bulkCreate(promotionProducts);
    }
    res.status(HttpStatusCodes.CREATED).json(responseFormat(req.body, "新增活動成功"));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

type PromotionPatch = {
  patch: string;
  img?: Express.Multer.File;
};


/**
 * @swagger
 * /admin/promotion/{id}:
 *   patch:
 *     summary: 修改促銷活動
 *     tags:
 *       - admin - Promotion
 *     description: 更新指定的促銷活動，包括圖片的替換（如果提供），以及更新活動的字段和與產品的關聯。
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 促銷活動的 ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               patch:
 *                 type: string
 *                 description: JSON 格式的字段更新列表
 *                 example: '{"name": "秋季大促", "discountValue": 20, "isActive": true}'
 *               img:
 *                 type: string
 *                 format: binary
 *                 description: 新的活動圖片（如果提供）
 *               productIds:
 *                 type: string
 *                 description: 更新後的產品 ID 列表，JSON 格式
 *                 example: "[1,2,3]"
 *     responses:
 *       204:
 *         description: 成功修改促銷活動
 *       400:
 *         description: 請求無效，活動不存在
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
 *                   example: "無此活動"
 *       500:
 *         description: 伺服器錯誤，無法修改促銷活動
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


// 修改活動
router.patch("/:id", uploadMemory.single("img"), async (req: IReq<PromotionPatch>, res: IRes) => {
  try {
    const promotionId = Number(req.params.id);
    const promotion = await PromotionModel.findByPk(promotionId);
    if (!promotion) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此活動"));
    }
    const updatedFields = JSON.parse(req.body.patch) as Partial<Promotion>;

    if (updatedFields.hasOwnProperty("imgUrl") && promotion.imgUrl) {
      const deleteParams = {
        Bucket: process.env.S3_BUCKET_PROMOTION,
        Key: promotion.imgUrl.split("/").pop(),
      };
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await s3.send(deleteCommand);
    }
    // return res.status(HttpStatusCodes.OK).json(responseFormat(req.body, updatedFields));

    if (req.file) {
      //上傳圖片到 aws-s3
      const putParams = {
        Bucket: process.env.S3_BUCKET_PROMOTION,
        Key: Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname),
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      const putCommand = new PutObjectCommand(putParams);
      await s3.send(putCommand);
      updatedFields.imgUrl = `https://${process.env.S3_BUCKET_PROMOTION}.s3.${process.env.AWS_REGION}.amazonaws.com/${putParams.Key}`;
    }

    await promotion.update(updatedFields);
    if (updatedFields.productIds) {
      await PromotionItemModel.destroy({ where: { promotionId: promotionId } });
      if (updatedFields.productIds.length > 0) {
        const promotionProducts = (updatedFields.productIds as number[]).map((id) => {
          return {
            promotionId: promotionId,
            productId: id,
          };
        });
        await PromotionItemModel.bulkCreate(promotionProducts);
      }
    }

    res.status(HttpStatusCodes.NO_CONTENT).end();
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});
export default router;
