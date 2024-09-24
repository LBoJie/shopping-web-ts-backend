import { Router } from "express";
import HttpStatusCodes from "../../common/HttpStatusCodes";
import { IReq, IRes } from "../../common/ReqRes";
import responseFormat from "../../utils/responseFormat";
import { CategoryModel } from "../../models/index";

const router = Router();

type Category = {
  name: string;
};

/**
 * @swagger
 * /admin/category:
 *   get:
 *     summary: 獲取所有分類
 *     tags:
 *       - admin - Category
 *     description: 獲取所有分類的資料。
 *     responses:
 *       200:
 *         description: 成功獲取所有分類
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料，通常為空物件
 *                   example: {}
 *                 responseData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: 分類的唯一標識符
 *                         example: 1
 *                       name:
 *                         type: string
 *                         description: 分類名稱
 *                         example: "電子產品"
 *                   description: 分類資料的列表
 *       500:
 *         description: 伺服器錯誤，無法獲取分類資料
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料，通常為空物件
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

/**
 * @swagger
 * /admin/category:
 *   post:
 *     summary: 新增分類
 *     tags:
 *       - admin - Category
 *     description: 創建一個新的分類並將其儲存到資料庫中。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 分類的唯一標識符 (通常由資料庫自動生成)
 *                 example: 1
 *               name:
 *                 type: string
 *                 description: 分類名稱
 *                 example: "電子產品"
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: 成功新增分類
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     name: "電子產品"
 *                 responseData:
 *                   type: string
 *                   description: 成功訊息
 *                   example: "新增分類成功"
 *       500:
 *         description: 伺服器錯誤，無法新增分類
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     name: "電子產品"
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

router.post("/", async (req: IReq<Category>, res: IRes) => {
  try {
    const category = req.body;
    await CategoryModel.create(category);
    res.status(HttpStatusCodes.CREATED).json(responseFormat(req.body, "新增分類成功"));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /admin/category/{id}:
 *   patch:
 *     summary: 更新分類
 *     tags:
 *       - admin - Category
 *     description: 根據分類的 ID 更新分類的資料。
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 分類的唯一標識符
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 分類名稱
 *                 example: "更新的電子產品"
 *             required:
 *               - name
 *     responses:
 *       204:
 *         description: 成功更新分類，不返回內容
 *       404:
 *         description: 找不到指定的分類
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     name: "更新的電子產品"
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "找不到指定的分類"
 *       500:
 *         description: 伺服器錯誤，無法更新分類
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     name: "更新的電子產品"
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */
router.patch("/:id", async (req: IReq<Category>, res: IRes) => {
  try {
    const id = req.params.id;
    const updateCategory = req.body;
    const category = await CategoryModel.findByPk(id);
    category!.update(updateCategory);
    res.status(HttpStatusCodes.NO_CONTENT).end();
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});
export default router;
