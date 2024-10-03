import { Router } from "express";
import { IReq, IRes } from "../../common/ReqRes";
import HttpStatusCodes from "../../common/HttpStatusCodes";
import path from "path";
import multer from "multer";
import responseFormat from "../../utils/responseFormat";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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
 * /admin/upload/img:
 *   post:
 *     summary: 上傳圖片
 *     tags:
 *       - admin - Upload
 *     description: 將上傳的圖片存儲到 AWS S3，並返回圖片的 URL。
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               img:
 *                 type: string
 *                 format: binary
 *                 description: 要上傳的圖片檔案
 *     responses:
 *       200:
 *         description: 成功上傳圖片，返回圖片的 URL
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
 *                   description: 上傳後圖片的 URL
 *                   example: "https://example-bucket.s3.region.amazonaws.com/filename.png"
 *       400:
 *         description: 請求無效，未提供圖片檔案
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
 *                   example: "無上傳圖片"
 *       500:
 *         description: 伺服器錯誤，無法上傳圖片
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

router.post("/img", uploadMemory.single("img"), async (req: IReq, res: IRes) => {
  if (!req.file) {
    return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無上傳圖片"));
  }

  try {
    //上傳圖片到 aws-s3
    const putParams = {
      Bucket: process.env.S3_BUCKET_DESCRIPTION,
      Key: Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname),
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };
    const putCommand = new PutObjectCommand(putParams);
    await s3.send(putCommand);
    const imgUrl = `https://${process.env.S3_BUCKET_DESCRIPTION}.s3.${process.env.AWS_REGION}.amazonaws.com/${putParams.Key}`;
    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, imgUrl));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});
export default router;
