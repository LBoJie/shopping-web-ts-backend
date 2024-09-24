import { Router } from "express";
import HttpStatusCodes from "../../common/HttpStatusCodes";
import { IReq, IRes } from "../../common/ReqRes";
import responseFormat from "../../utils/responseFormat";
import { CarouselModel } from "../../models/index";
import path from "path";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

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

const router = Router();

/**
 * @swagger
 * /admin/carousel/{id}:
 *   get:
 *     summary: 取得指定分類的輪播
 *     tags:
 *       - admin - Carousel
 *     description: 根據分類ID，取得該分類下所有的輪播，並依據順序升序排列。
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 分類ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 輪播資料取得成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求的分類ID
 *                 responseData:
 *                   type: array
 *                   description: 取得的輪播資料
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       category:
 *                         type: integer
 *                       href:
 *                         type: string
 *                       imgUrl:
 *                         type: string
 *                       order:
 *                         type: integer
 *       500:
 *         description: 伺服器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求的分類ID
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
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

/**
 * @swagger
 * /admin/carousel:
 *   post:
 *     summary: 新增輪播
 *     description: 新增一個新的輪播項目並上傳圖片到 AWS S3。
 *     tags:
 *       - admin - Carousel
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: integer
 *                 description: 輪播分類，例如：1 代表首頁
 *               href:
 *                 type: string
 *                 description: 輪播連結
 *               img:
 *                 type: string
 *                 format: binary
 *                 description: 輪播圖片檔案
 *             required:
 *               - category
 *               - href
 *     responses:
 *       '201':
 *         description: 輪播新增成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: integer
 *                       description: 輪播分類
 *                     href:
 *                       type: string
 *                       description: 輪播連結
 *                     imgUrl:
 *                       type: string
 *                       description: 圖片 URL
 *                     order:
 *                       type: integer
 *                       description: 輪播順序
 *                 responseData:
 *                   type: string
 *                   example: 輪播新增成功
 *       '500':
 *         description: 伺服器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: integer
 *                       description: 輪播分類
 *                     href:
 *                       type: string
 *                       description: 輪播連結
 *                     imgUrl:
 *                       type: string
 *                       description: 圖片 URL
 *                     order:
 *                       type: integer
 *                       description: 輪播順序
 *                 responseData:
 *                   type: string
 *                   example: 伺服器內部錯誤
 */
router.post("/", uploadMemory.single("img"), async (req: IReq<CarouselModel>, res: IRes) => {
  try {
    const carousel = req.body;
    const order = (await CarouselModel.max("order")) as number;
    carousel.order = order ? order + 1 : 1;
    if (req.file) {
      //上傳圖片到 aws-s3
      const putParams = {
        Bucket: process.env.S3_BUCKET_CAROUSEL,
        Key: Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname),
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      const putCommand = new PutObjectCommand(putParams);
      await s3.send(putCommand);
      carousel.imgUrl = `https://${process.env.S3_BUCKET_CAROUSEL}.s3.${process.env.AWS_REGION}.amazonaws.com/${putParams.Key}`;
    }
    await CarouselModel.create(carousel);
    res.status(HttpStatusCodes.CREATED).json(responseFormat(req.body, "輪播新增成功"));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /admin/carousel/order:
 *   patch:
 *     summary: 修改輪播順序
 *     description: 更新一組輪播項目的順序。
 *     tags:
 *       - admin - Carousel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: 輪播項目的 ID
 *                 order:
 *                   type: integer
 *                   description: 輪播項目的新順序
 *               required:
 *                 - id
 *                 - order
 *     responses:
 *       '204':
 *         description: 輪播順序更新成功，無內容返回
 *       '500':
 *         description: 伺服器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: 輪播項目的 ID
 *                       order:
 *                         type: integer
 *                         description: 輪播項目的新順序
 *                 responseData:
 *                   type: string
 *                   example: 伺服器內部錯誤
 */

type OrderPatch = {
  id: number;
  order: number;
}[];

// 修改輪播順序
router.patch("/order", async (req: IReq<OrderPatch>, res: IRes) => {
  try {
    const orders = req.body;
    for (const order of orders) {
      await CarouselModel.update(
        { order: order.order },
        {
          where: {
            id: order.id,
          },
        }
      );
    }
    res.status(HttpStatusCodes.NO_CONTENT).end();
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /admin/Carousel/{id}:
 *   patch:
 *     summary: 更新輪播項目
 *     description: 更新指定 ID 的輪播項目。可以更新圖片和其他屬性。如果上傳了新的圖片，會將舊的圖片從 AWS S3 刪除並上傳新的圖片。
 *     tags:
 *       - admin - Carousel
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 輪播項目的 ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               img:
 *                 type: string
 *                 format: binary
 *                 description: 輪播項目的圖片文件（如果有上傳新的圖片）
 *               patch:
 *                 type: string
 *                 description: 更新輪播項目的 JSON 字串，包括需要更新的字段
 *     responses:
 *       '204':
 *         description: 輪播項目更新成功，無內容返回
 *       '400':
 *         description: 無此輪播項目
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 輪播項目的 ID
 *                     patch:
 *                       type: string
 *                       description: 更新輪播項目的 JSON 字串
 *                 responseData:
 *                   type: string
 *                   example: 無此輪播
 *       '500':
 *         description: 伺服器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 輪播項目的 ID
 *                     patch:
 *                       type: string
 *                       description: 更新輪播項目的 JSON 字串
 *                 responseData:
 *                   type: string
 *                   example: 伺服器內部錯誤
 */
type carouselPatch = {
  img?: Express.Multer.File;
  patch: string;
};

router.patch("/:id", uploadMemory.single("img"), async (req: IReq<carouselPatch>, res: IRes) => {
  try {
    const carouselId = req.params.id;
    const carouselPatch = JSON.parse(req.body.patch) as Partial<CarouselModel>;
    const carousel = await CarouselModel.findByPk(carouselId);
    if (!carousel) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此輪播"));
    }
    if (req.file) {
      const deleteParams = {
        Bucket: process.env.S3_BUCKET_CAROUSEL,
        Key: carousel.imgUrl.split("/").pop(),
      };
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await s3.send(deleteCommand);

      const putParams = {
        Bucket: process.env.S3_BUCKET_CAROUSEL,
        Key: Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname),
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      const putCommand = new PutObjectCommand(putParams);
      await s3.send(putCommand);
      carouselPatch.imgUrl = `https://${process.env.S3_BUCKET_CAROUSEL}.s3.${process.env.AWS_REGION}.amazonaws.com/${putParams.Key}`;
    }

    await carousel.update(carouselPatch);
    res.status(HttpStatusCodes.NO_CONTENT).end();
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /admin/carousel/{id}:
 *   delete:
 *     summary: 刪除指定的輪播項目
 *     description: 根據指定的 ID 刪除輪播項目。如果輪播項目存在，將會從 AWS S3 刪除對應的圖片並刪除資料庫中的記錄。
 *     tags:
 *       - admin - Carousel
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 要刪除的輪播項目的 ID
 *     responses:
 *       '204':
 *         description: 輪播項目刪除成功，無內容返回
 *       '400':
 *         description: 無此輪播項目
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 要刪除的輪播項目的 ID
 *                 responseData:
 *                   type: string
 *                   example: 無此輪播
 *       '500':
 *         description: 伺服器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 要刪除的輪播項目的 ID
 *                 responseData:
 *                   type: string
 *                   example: 伺服器內部錯誤
 */
router.delete("/:id", async (req: IReq, res: IRes) => {
  try {
    const carouselId = req.params.id;

    const carousel = await CarouselModel.findByPk(carouselId);
    if (!carousel) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此輪播"));
    }
    const deleteParams = {
      Bucket: process.env.S3_BUCKET_CAROUSEL,
      Key: carousel.imgUrl.split("/").pop(),
    };
    const deleteCommand = new DeleteObjectCommand(deleteParams);
    await s3.send(deleteCommand);

    await carousel.destroy();
    res.status(HttpStatusCodes.NO_CONTENT).end();
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});
export default router;
