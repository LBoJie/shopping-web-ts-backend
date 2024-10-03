import { Router } from "express";
import HttpStatusCodes from "../common/HttpStatusCodes";
import { JwtReq, IRes } from "../common/ReqRes";
import responseFormat from "../utils/responseFormat";
import { PromotionItemModel, PromotionModel, CartModel, ProductModel, CartItemModel } from "../models/index";
import authenticateAccessToken from "../utils/authenticateAccessToken";
const router = Router();

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: 取得會員的購物車內容
 *     tags:
 *       - Cart
 *     description: 查詢當前會員的購物車內容，並包括商品的促銷信息。如果購物車不存在，則自動創建一個空的購物車。
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回會員的購物車內容
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
 *                   description: 購物車商品數據
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: integer
 *                         description: 商品 ID
 *                         example: 1
 *                       name:
 *                         type: string
 *                         description: 商品名稱
 *                         example: "Laptop"
 *                       price:
 *                         type: integer
 *                         description: 商品原價
 *                         example: 50000
 *                       discountPrice:
 *                         type: integer
 *                         nullable: true
 *                         description: 折扣後的價格（如果有促銷）
 *                         example: 45000
 *                       imgUrl:
 *                         type: string
 *                         description: 商品圖片 URL
 *                         example: "https://example.com/product.jpg"
 *                       quantity:
 *                         type: integer
 *                         description: 購物車中的商品數量
 *                         example: 2
 *                       status:
 *                         type: string
 *                         description: 商品狀態
 *                         example: "available"
 *                       inventory:
 *                         type: integer
 *                         description: 商品庫存
 *                         example: 10
 *       401:
 *         description: 未經授權，缺少或無效的身分驗證
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

router.get("/", authenticateAccessToken, async (req: JwtReq, res: IRes) => {
  try {
    const memberId = req.member!.id;
    let cart = await CartModel.findOne({
      where: { memberId },
      include: [
        {
          model: CartItemModel,
          as: "cartItems",
          include: [{ model: ProductModel, as: "product", include: [{ model: PromotionItemModel, as: "promotionItem", include: [{ model: PromotionModel, as: "promotion" }] }] }],
        },
      ],
    });

    if (!cart) {
      await CartModel.create({ memberId });
      cart = await CartModel.findOne({
        where: { memberId },
        include: [
          {
            model: CartItemModel,
            as: "cartItems",
            include: [{ model: ProductModel, as: "product" }],
          },
        ],
      });
    }

    const result = cart!.cartItems?.map((item) => {
      let isWithinRange = false;
      if (item.product!.promotionItem) {
        const today = new Date();
        const startDate = new Date(item.product!.promotionItem!.promotion.startDate);
        const endDate = new Date(item.product!.promotionItem!.promotion.endDate);
        isWithinRange = today >= startDate && today <= endDate;
      }
      return {
        productId: item.product!.id,
        name: item.product!.name,
        price: item.product!.price,
        discountPrice:
          item.product!.promotionItem && item.product!.promotionItem.promotion.isActive && isWithinRange
            ? Math.ceil(item.product!.price * (item.product!.promotionItem!.promotion.discountValue / 100))
            : null,
        imgUrl: item.product!.imgUrl,
        quantity: item.quantity,
        status: item.product!.status,
        inventory: item.product!.inventory,
      };
    });

    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, result));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /cart:
 *   post:
 *     summary: 將商品加入會員的購物車
 *     tags:
 *       - Cart
 *     description: 將選定的商品加入到會員的購物車中，並檢查庫存是否充足。
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: integer
 *                 description: 商品 ID
 *                 example: 1
 *               quantity:
 *                 type: integer
 *                 description: 商品數量
 *                 example: 2
 *     responses:
 *       201:
 *         description: 商品成功加入購物車
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     productId: 1
 *                     quantity: 2
 *                 responseData:
 *                   type: string
 *                   description: 加入購物車的結果訊息
 *                   example: "已加入購物車"
 *       400:
 *         description: 加入失敗，商品不存在或庫存不足
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     productId: 1
 *                     quantity: 2
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "加入失敗，無此商品或未上架"
 *       401:
 *         description: 未經授權，缺少或無效的身分驗證
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

router.post("/", authenticateAccessToken, async (req: JwtReq, res) => {
  try {
    const memberId = req.member!.id;
    const { productId, quantity } = req.body;
    let cart = await CartModel.findOne({
      where: { memberId },
    });

    if (!cart) {
      //如果沒有 新增購物車
      cart = await CartModel.create({ memberId });
    }
    const product = await ProductModel.findByPk(productId);
    if (!product || product.status !== "1") {
      return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "加入失敗，無此商品或未上架"));
    }
    const cartItem = await CartItemModel.findOne({
      where: { cartId: cart.id, productId: productId },
    });
    if (cartItem) {
      if (cartItem.quantity + quantity > product.inventory) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "加入失敗，庫存不足"));
      }
      await cartItem.update({ quantity: cartItem.quantity + quantity });
    } else {
      if (quantity > product.inventory) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "加入失敗，庫存不足"));
      }
      await CartItemModel.create({ cartId: cart.id, productId: productId, quantity });
    }
    res.status(HttpStatusCodes.CREATED).json(responseFormat(req.body, "已加入購物車"));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /cart:
 *   patch:
 *     summary: 更新購物車中的商品數量
 *     tags:
 *       - Cart
 *     description: 根據會員 ID 和商品 ID 更新購物車中的商品數量。
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: integer
 *                 description: 商品 ID
 *                 example: 1
 *               quantity:
 *                 type: integer
 *                 description: 新的商品數量
 *                 example: 3
 *     responses:
 *       204:
 *         description: 成功更新商品數量，無返回內容
 *       400:
 *         description: 資料錯誤或商品不存在
 *       401:
 *         description: 未經授權，缺少或無效的身分驗證
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
 *                   example: { productId: 1, quantity: 3 }
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

type EditCartItem = {
  productId: number;
  quantity: number;
};
router.patch("/", authenticateAccessToken, async (req: JwtReq<EditCartItem>, res) => {
  try {
    const { productId, quantity } = req.body;
    const memberId = req.member!.id;
    const cart = await CartModel.findOne({
      where: { memberId },
    });
    const cartItem = await CartItemModel.findOne({
      where: { cartId: cart!.id, productId },
    });
    cartItem?.update({ quantity });
    res.status(HttpStatusCodes.NO_CONTENT).end();
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /cart/{id}:
 *   delete:
 *     summary: 從購物車中刪除指定商品
 *     tags:
 *       - Cart
 *     description: 根據會員 ID 和商品 ID，從購物車中刪除對應的商品。
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 商品 ID
 *         example: 1
 *     responses:
 *       204:
 *         description: 刪除成功，無返回內容
 *       400:
 *         description: 無效的請求或商品不存在
 *       401:
 *         description: 未經授權，缺少或無效的身分驗證
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
 *                   example: { productId: 1 }
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

router.delete("/:id", authenticateAccessToken, async (req: JwtReq, res) => {
  try {
    const memberId = req.member!.id;
    const productId = req.params.id;
    const cart = await CartModel.findOne({
      where: { memberId },
    });
    await CartItemModel.destroy({ where: { cartId: cart!.id, productId } });
    res.status(HttpStatusCodes.NO_CONTENT).end();
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /cart/check:
 *   get:
 *     summary: 檢查購物車商品狀態
 *     tags:
 *       - Cart
 *     description: 根據會員 ID 檢查購物車中的商品，是否下架或庫存不足。
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 檢查成功，無錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example: { memberId: 1 }
 *                 responseData:
 *                   type: string | null
 *                   description: 錯誤訊息或 null 表示無錯誤
 *                   example: null
 *       400:
 *         description: 商品檢查失敗，存在錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example: { memberId: 1 }
 *                 responseData:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: 錯誤訊息陣列
 *                   example: ["找不到商品ID : 1", "商品A 已下架，請從購物車中移除此商品"]
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
 *                   example: { memberId: 1 }
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

router.get("/check", authenticateAccessToken, async (req: JwtReq, res) => {
  try {
    const memberId = req.member!.id;
    const cart = await CartModel.findOne({
      where: { memberId },
      include: [
        {
          model: CartItemModel,
          as: "cartItems",
          include: [{ model: ProductModel, as: "product" }],
        },
      ],
    });
    const result: string[] = [];

    if (cart?.cartItems) {
      for (const item of cart.cartItems) {
        const product = await ProductModel.findByPk(item.productId);
        if (!product) {
          result.push(`找不到商品ID : ${item.productId}`);
          continue;
        }
        if (product.status === "0") {
          result.push(`${product.name} 已下架，請從購物車中移除此商品`);
        }
        if (item.quantity > product.inventory) {
          result.push(`${product.name} 超過庫存量，庫存量為 ${product.inventory}`);
        }
      }
    }
    if (result.length > 0) {
      res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, result));
    } else {
      res.status(HttpStatusCodes.OK).json(responseFormat(req.body, null));
    }
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

export default router;
