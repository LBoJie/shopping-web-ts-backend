import { Router } from "express";
import HttpStatusCodes from "../../common/HttpStatusCodes";
import { IReq, IRes } from "../../common/ReqRes";
import Sequelize from "sequelize";
import { body, validationResult } from "express-validator";
import multer from "multer";
import path from "path";
import responseFormat from "../../utils/responseFormat";
import * as jsonpatch from "fast-json-patch";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { ProductModel, CategoryModel } from "../../models/index";
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

/**
 * @swagger
 * /admin/product:
 *   get:
 *     summary: 獲取產品列表
 *     tags:
 *       - admin - Product
 *     description: 根據查詢參數獲取產品列表，支持分頁、排序和搜尋功能。
 *     parameters:
 *       - in: query
 *         name: page
 *         required: true
 *         description: 當前頁碼
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: pageSize
 *         required: true
 *         description: 每頁顯示的產品數量
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: sortField
 *         required: true
 *         description: 用於排序的字段名稱
 *         schema:
 *           type: string
 *           example: "price"
 *       - in: query
 *         name: sortOrder
 *         required: true
 *         description: 排序順序
 *         schema:
 *           type: string
 *           enum:
 *             - ASC
 *             - DESC
 *           example: "ASC"
 *       - in: query
 *         name: search
 *         required: false
 *         description: 用於搜尋的關鍵字，支持產品名稱和產品 ID
 *         schema:
 *           type: string
 *           example: "electronics"
 *     responses:
 *       200:
 *         description: 成功獲取產品列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     page: 1
 *                     pageSize: 10
 *                     sortField: "price"
 *                     sortOrder: "ASC"
 *                     search: "electronics"
 *                 responseData:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "產品名稱"
 *                           price:
 *                             type: number
 *                             example: 99.99
 *                           inventory:
 *                             type: integer
 *                             example: 50
 *                           status:
 *                             type: string
 *                             example: "0"
 *                           imgUrl:
 *                             type: string
 *                             example: "http://example.com/image.jpg"
 *                           categoryName:
 *                             type: string
 *                             example: "電子產品"
 *                     totalProductsCount:
 *                       type: integer
 *                       example: 100
 *       500:
 *         description: 伺服器錯誤，無法獲取產品列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     page: 1
 *                     pageSize: 10
 *                     sortField: "price"
 *                     sortOrder: "ASC"
 *                     search: "electronics"
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

router.get("/", async (req: IReq, res: IRes) => {
  try {
    const { page, pageSize, sortField, sortOrder, search } = req.query;
    const whereCondition = {
      [Sequelize.Op.or]: [
        { name: { [Sequelize.Op.like]: `%${search}%` } },
        {
          id: isNaN(Number(search)) ? [] : Number(search),
        },
      ],
    };
    const products = await ProductModel.findAll({
      attributes: ["id", "name", "price", "inventory", "status", "imgUrl", [Sequelize.col("category.name"), "categoryName"]],
      order: [[sortField as string, sortOrder as "ASC" | "DESC"]],
      offset: (Number(page) - 1) * Number(pageSize),
      limit: Number(pageSize),
      where: whereCondition,
      include: [
        {
          model: CategoryModel,
          as: "category",
          attributes: [],
        },
        // {
        //   model: PromotionItemModel,
        //   as: "promotionItem",
        //   attributes: [],
        // },
      ],
    });
    const totalProductsCount = await ProductModel.count({
      where: whereCondition,
    });
    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, { products, totalProductsCount }));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /admin/product/{id}:
 *   get:
 *     summary: 獲取單一產品詳細信息
 *     tags:
 *       - admin - Product
 *     description: 根據產品 ID 獲取產品的詳細信息。
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 產品的唯一標識符
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: 成功獲取產品詳細信息
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
 *                     name:
 *                       type: string
 *                       example: "產品名稱"
 *                     price:
 *                       type: number
 *                       example: 99.99
 *                     inventory:
 *                       type: integer
 *                       example: 50
 *                     categoryId:
 *                       type: integer
 *                       example: 1
 *                     status:
 *                       type: string
 *                       example: "1"
 *                     imgUrl:
 *                       type: string
 *                       example: "http://example.com/image.jpg"
 *                     descriptionDelta:
 *                       type: string
 *                       example: "{\"ops\":[{\"insert\":\"產品描述\"}]}"
 *                     descriptionHtml:
 *                       type: string
 *                       example: "<p>產品描述</p>"
 *       400:
 *         description: 無此產品
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
 *                   example: "無此商品"
 *       500:
 *         description: 伺服器錯誤，無法獲取產品詳細信息
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

// 取得單一商品
router.get("/:id", async (req: IReq, res: IRes) => {
  try {
    const id = req.params.id;
    const product = await ProductModel.findByPk(id, { attributes: ["name", "price", "inventory", "categoryId", "status", "imgUrl", "descriptionDelta", "descriptionHtml"] });
    if (!product) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此商品"));
    }
    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, product));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

type Product = {
  name: string;
  price: number;
  inventory: number;
  status: string;
  categoryId: number;
  descriptionDelta?: string;
  descriptionHtml?: string;
  imgUrl: string;
};

/**
 * @swagger
 * /admin/product/:
 *   post:
 *     summary: 新增產品
 *     tags:
 *       - admin - Product
 *     description: 上傳產品信息並可選擇上傳圖片，圖片將存儲於 AWS S3 中。
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 產品名稱
 *                 example: "產品名稱"
 *               price:
 *                 type: number
 *                 description: 產品價格
 *                 example: 99.99
 *               inventory:
 *                 type: integer
 *                 description: 產品庫存數量
 *                 example: 50
 *               status:
 *                 type: string
 *                 description: 產品狀態 上架:1 下架:0
 *                 example: "0"
 *               categoryId:
 *                 type: integer
 *                 description: 產品分類 ID
 *                 example: 1
 *               descriptionDelta:
 *                 type: string
 *                 description: 產品詳細描述 (Delta 格式)
 *                 example: "<p>產品詳細描述</p>"
 *               descriptionHtml:
 *                 type: string
 *                 description: 產品詳細描述 (HTML 格式)
 *                 example: "<p>產品詳細描述</p>"
 *               img:
 *                 type: string
 *                 format: binary
 *                 description: 產品圖片
 *     responses:
 *       201:
 *         description: 商品新增成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     name: "產品名稱"
 *                     price: 99.99
 *                     inventory: 50
 *                     status: "0"
 *                     categoryId: 1
 *                     descriptionDelta: "<p>產品詳細描述</p>"
 *                     descriptionHtml: "<p>產品詳細描述</p>"
 *                     imgUrl: "https://example.com/image.jpg"
 *                 responseData:
 *                   type: string
 *                   description: 成功訊息
 *                   example: "商品新增成功"
 *       400:
 *         description: 請求驗證錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     name: "產品名稱"
 *                     price: 99.99
 *                     inventory: 50
 *                     status: "1"
 *                     categoryId: 1
 *                     descriptionDelta: "<p>產品詳細描述</p>"
 *                     descriptionHtml: "<p>產品詳細描述</p>"
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "name is required \n price is required \n inventory is required \n status is required \n categoryId is required"
 *       500:
 *         description: 伺服器錯誤，無法新增產品
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     name: "產品名稱"
 *                     price: 99.99
 *                     inventory: 50
 *                     status: "1"
 *                     categoryId: 1
 *                     descriptionDelta: "<p>產品詳細描述</p>"
 *                     descriptionHtml: "<p>產品詳細描述</p>"
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

router.post(
  "/",
  uploadMemory.single("img"),
  [
    body("name").notEmpty().withMessage("name is required"),
    body("price").notEmpty().withMessage("price is required"),
    body("inventory").notEmpty().withMessage("inventory is required"),
    body("status").notEmpty().withMessage("status is required"),
  ],
  async (req: IReq<Product>, res: IRes) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errText = errors
        .array()
        .map((error) => error.msg)
        .join(" \n");
      return res.status(400).json(responseFormat(req.body, errText));
    }
    try {
      const product = req.body;
      let imgPath = "";
      if (req.file) {
        //上傳圖片到 aws-s3
        const putParams = {
          Bucket: process.env.S3_BUCKET_PRODUCT,
          Key: Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname),
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        };
        const putCommand = new PutObjectCommand(putParams);
        await s3.send(putCommand);
        imgPath = `https://${process.env.S3_BUCKET_PRODUCT}.s3.${process.env.AWS_REGION}.amazonaws.com/${putParams.Key}`;
      }
      product.imgUrl = imgPath;
      await ProductModel.create(product);
      res.status(HttpStatusCodes.CREATED).json(responseFormat(req.body, "商品新增成功"));
    } catch (err: any) {
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
    }
  }
);

type PatchRequest = {
  jsonPatch: string;
  img?: Express.Multer.File;
};

/**
 * @swagger
 * /admin/product/{id}:
 *   patch:
 *     summary: 更新產品資訊
 *     tags:
 *       - admin - Product
 *     description: 更新指定 ID 的產品資訊。可以使用 JSON Patch 格式進行局部更新，並可選擇上傳或替換圖片。若更新時替換了圖片，將會刪除之前上傳的圖片。
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 產品 ID
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               jsonPatch:
 *                 type: string
 *                 description: JSON Patch 格式的更新資料
 *                 example: '[{ "op": "replace", "path": "/name", "value": "更新後的產品名稱" }]'
 *               img:
 *                 type: string
 *                 format: binary
 *                 description: 新產品圖片（可選）
 *     responses:
 *       204:
 *         description: 產品資訊更新成功，無內容返回
 *       400:
 *         description: 請求錯誤，例如查無產品
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     jsonPatch: '[{ "op": "replace", "path": "/name", "value": "更新後的產品名稱" }]'
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "查無此商品"
 *       500:
 *         description: 伺服器錯誤，無法更新產品
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     jsonPatch: '[{ "op": "replace", "path": "/name", "value": "更新後的產品名稱" }]'
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

router.patch("/:id", uploadMemory.single("img"), async (req: IReq<PatchRequest>, res: IRes) => {
  const id = req.params.id;
  const patch: jsonpatch.ReplaceOperation<any>[] = req.body.jsonPatch ? JSON.parse(req.body.jsonPatch) : [];
  try {
    const product = await ProductModel.findByPk(id);
    if (!product) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "查無此商品"));
    }
    let updateProduct = jsonpatch.applyPatch(product.toJSON(), patch).newDocument;
    let deleteImg = false;
    patch.forEach((item) => {
      if (item.path === "/imgUrl" && product.imgUrl) {
        deleteImg = true;
      }
    });

    if (deleteImg) {
      const deleteParams = {
        Bucket: process.env.S3_BUCKET_PRODUCT,
        Key: product.imgUrl.split("/").pop(),
      };
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await s3.send(deleteCommand);
    }

    if (req.file) {
      //上傳圖片到 aws-s3
      const putParams = {
        Bucket: process.env.S3_BUCKET_PRODUCT,
        Key: Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname),
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      const putCommand = new PutObjectCommand(putParams);
      await s3.send(putCommand);
      updateProduct.imgUrl = `https://${process.env.S3_BUCKET_PRODUCT}.s3.${process.env.AWS_REGION}.amazonaws.com/${putParams.Key}`;
    }

    await product.update(updateProduct);
    res.status(HttpStatusCodes.NO_CONTENT).end();
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /admin/product/{id}:
 *   delete:
 *     summary: 刪除產品
 *     tags:
 *       - admin - Product
 *     description: 根據指定的產品 ID 刪除產品。如果產品有關聯的圖片，則從 AWS S3 刪除該圖片。
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 產品 ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       204:
 *         description: 產品刪除成功，無內容返回
 *       400:
 *         description: 請求錯誤，例如查無產品 ID
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
 *                   example: "無此商品id"
 *       500:
 *         description: 伺服器錯誤，無法刪除產品
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

router.delete("/:id", async (req: IReq, res: IRes) => {
  const id = req.params.id;
  try {
    const deleteProduct = await ProductModel.findByPk(id);
    if (!deleteProduct) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此商品id"));
    }
    if (deleteProduct.imgUrl) {
      //刪除圖片
      const deleteParams = {
        Bucket: process.env.S3_BUCKET_PRODUCT,
        Key: deleteProduct.imgUrl.split("/").pop(),
      };
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await s3.send(deleteCommand);
    }
    await deleteProduct.destroy();
    res.status(HttpStatusCodes.NO_CONTENT).end();
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

export default router;
