import { Router } from "express";
import HttpStatusCodes from "../common/HttpStatusCodes";
import { JwtReq, IReq, IRes } from "../common/ReqRes";
import responseFormat from "../utils/responseFormat";
import authenticateAccessToken from "../utils/authenticateAccessToken";
import { body, validationResult } from "express-validator";
import { OrderModel, CartModel, CartItemModel, ProductModel, PromotionItemModel, PromotionModel, OrderItemModel } from "../models/index";
type Order = {
  name: string;
  phone: string;
  address: string;
  notes?: string;
  totalAmount: number;
};

const router = Router();

/**
 * @swagger
 * /order/{id}:
 *   get:
 *     summary: 獲取訂單資訊
 *     description: 根據訂單 ID 獲取特定訂單的詳細資訊，或者不帶 ID 時獲取所有訂單的列表。
 *     tags:
 *       - Order
 *     parameters:
 *       - name: id
 *         in: path
 *         required: false
 *         description: 訂單 ID，若不提供則返回所有訂單
 *         schema:
 *           type: string
 *           example: "12345"
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 成功獲取訂單資訊
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
 *                   description: 訂單資訊
 *                   oneOf:
 *                     - type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: 訂單 ID
 *                           example: "12345"
 *                         recipientName:
 *                           type: string
 *                           description: 收件人姓名
 *                           example: "John Doe"
 *                         recipientPhone:
 *                           type: string
 *                           description: 收件人電話
 *                           example: "+1234567890"
 *                         recipientAddress:
 *                           type: string
 *                           description: 收件人地址
 *                           example: "123 Main St, Springfield, IL"
 *                         status:
 *                           type: string
 *                           description: 訂單狀態
 *                           example: "已送達"
 *                         orderTimeStamp:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               content:
 *                                 type: string
 *                                 description: 狀態描述
 *                               timestamp:
 *                                 type: string
 *                                 format: date-time
 *                                 description: 狀態時間戳
 *                           description: 訂單時間戳
 *                         totalAmount:
 *                           type: number
 *                           description: 總金額
 *                           example: 100.00
 *                         createdAt:
 *                           type: string
 *                           format: date
 *                           description: 訂單創建日期
 *                           example: "2024-09-22"
 *                         notes:
 *                           type: string
 *                           description: 訂單備註
 *                           example: "請在下午送達"
 *                         orderItems:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               productId:
 *                                 type: string
 *                                 description: 產品 ID
 *                                 example: "abc123"
 *                               productName:
 *                                 type: string
 *                                 description: 產品名稱
 *                                 example: "產品名稱"
 *                               price:
 *                                 type: number
 *                                 description: 價格
 *                                 example: 25.00
 *                               discountPrice:
 *                                 type: number
 *                                 description: 折扣價格
 *                                 example: 20.00
 *                               quantity:
 *                                 type: integer
 *                                 description: 數量
 *                                 example: 2
 *                               imgUrl:
 *                                 type: string
 *                                 description: 產品圖片 URL
 *                                 example: "https://example.com/image.jpg"
 *                     - type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: 訂單 ID
 *                             example: "12345"
 *                           status:
 *                             type: string
 *                             description: 訂單狀態
 *                             example: "已送達"
 *                           totalAmount:
 *                             type: number
 *                             description: 總金額
 *                             example: 100.00
 *                           createdAt:
 *                             type: string
 *                             format: date
 *                             description: 訂單創建日期
 *                             example: "2024-09-22"
 *                           orderItems:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 productId:
 *                                   type: string
 *                                   description: 產品 ID
 *                                   example: "abc123"
 *                                 productName:
 *                                   type: string
 *                                   description: 產品名稱
 *                                   example: "產品名稱"
 *                                 price:
 *                                   type: number
 *                                   description: 價格
 *                                   example: 25.00
 *                                 discountPrice:
 *                                   type: number
 *                                   description: 折扣價格
 *                                   example: 20.00
 *                                 quantity:
 *                                   type: integer
 *                                   description: 數量
 *                                   example: 2
 *                                 imgUrl:
 *                                   type: string
 *                                   description: 產品圖片 URL
 *                                   example: "https://example.com/image.jpg"
 *       400:
 *         description: 無效的訂單 ID 或其他錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "無此訂單"
 *       500:
 *         description: 伺服器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

router.get("/:id?", authenticateAccessToken, async (req: JwtReq, res: IRes) => {
  try {
    const orderId = req.params.id;
    if (orderId) {
      const order = await OrderModel.findOne({
        where: { memberId: req.member!.id, id: orderId },
        include: [
          {
            model: OrderItemModel,
            as: "orderItems",
            include: [
              {
                model: ProductModel,
                as: "product",
              },
            ],
          },
        ],
      });
      if (!order) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此訂單"));
      }

      const orderTimeStamp: {
        content: string;
        timestamp: Date;
      }[] = [{ content: "確認訂單中", timestamp: order.orderCreatedAt }];

      const statusMapping = [
        { content: "等待出貨中", timestamp: order.orderConfirmedAt },
        { content: "已出貨", timestamp: order.orderShippedAt },
        { content: "已送達", timestamp: order.orderDeliveredAt },
        { content: "已取消", timestamp: order.orderCanceledAt },
      ];

      statusMapping.forEach(({ content, timestamp }) => {
        if (timestamp) {
          orderTimeStamp.push({ content, timestamp });
        }
      });

      const result = {
        id: order.id,
        recipientName: order.recipientName,
        recipientPhone: order.recipientPhone,
        recipientAddress: order.recipientAddress,
        status: order.status,
        orderTimeStamp,
        totalAmount: order.totalAmount,
        createdAt: new Date(order.createdAt as Date).toLocaleDateString("en-CA"),
        notes: order.notes,
        orderItems: order.orderItems!.map((item) => {
          return {
            productId: item.product.id,
            productName: item.product.name,
            price: item.price,
            discountPrice: item.discountPrice,
            quantity: item.quantity,
            imgUrl: item.product.imgUrl,
          };
        }),
      };

      res.status(HttpStatusCodes.OK).json(responseFormat(req.body, result));
    } else {
      const orders = await OrderModel.findAll({
        where: { memberId: req.member!.id },
        include: [
          {
            model: OrderItemModel,
            as: "orderItems",
            include: [
              {
                model: ProductModel,
                as: "product",
              },
            ],
          },
        ],
      });

      const result = orders.map((order) => {
        return {
          id: order.id,
          status: order.status,
          totalAmount: order.totalAmount,
          createdAt: new Date(order.createdAt as Date).toLocaleDateString("en-CA"),
          orderItems: order.orderItems!.map((item) => {
            return {
              productId: item.product.id,
              productName: item.product.name,
              price: item.price,
              discountPrice: item.discountPrice,
              quantity: item.quantity,
              imgUrl: item.product.imgUrl,
            };
          }),
        };
      });
      res.status(HttpStatusCodes.OK).json(responseFormat(req.body, result));
    }
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /order:
 *   post:
 *     summary: 創建新訂單
 *     description: 根據提供的資料創建一個新的訂單。需確認購物車中的商品和訂單金額一致，並更新庫存。
 *     tags:
 *       - Order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 收件人姓名
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 description: 收件人電話
 *                 example: "+1234567890"
 *               address:
 *                 type: string
 *                 description: 收件人地址
 *                 example: "123 Main St, Springfield, IL"
 *               totalAmount:
 *                 type: number
 *                 description: 訂單總金額
 *                 example: 100.00
 *               notes:
 *                 type: string
 *                 description: 訂單備註 (可選)
 *                 example: "請在下午送達"
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: 訂單創建成功
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
 *                   description: 成功訊息
 *                   example: "訂單已建立"
 *       400:
 *         description: 請求資料驗證失敗或金額不正確
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "金額不正確，請聯繫客服"
 *       500:
 *         description: 伺服器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

// 成立訂單
router.post(
  "/",
  [
    body("name").notEmpty().withMessage("name is required"),
    body("phone").notEmpty().withMessage("phone is required"),
    body("address").notEmpty().withMessage("address is required"),
    body("totalAmount").notEmpty().withMessage("totalAmount is required"),
  ],
  authenticateAccessToken,
  async (req: JwtReq<Order>, res: IRes) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errText = errors
        .array()
        .map((error) => error.msg)
        .join(" \n");
      return res.status(400).json(responseFormat(req.body, errText));
    }
    try {
      const memberId = req.member!.id;
      const { name, phone, address, totalAmount, notes } = req.body;
      const cart = await CartModel.findOne({
        where: { memberId },
        include: [
          {
            model: CartItemModel,
            as: "cartItems",
            include: [{ model: ProductModel, as: "product", include: [{ model: PromotionItemModel, as: "promotionItem", include: [{ model: PromotionModel, as: "promotion" }] }] }],
          },
        ],
      });
      const validateAmount = cart!.cartItems!.reduce((acc, item) => {
        let isActive = false;
        if (item.product!.promotionItem) {
          const today = new Date();
          const startDate = new Date(item.product!.promotionItem.promotion.startDate);
          const endDate = new Date(item.product!.promotionItem.promotion.endDate);
          if (today >= startDate && today <= endDate && item.product!.promotionItem.promotion.isActive) {
            isActive = true;
          }
        }
        const price = isActive ? Math.ceil(item.product!.price * (item.product!.promotionItem!.promotion.discountValue / 100)) : item.product!.price;
        return acc + price * item.quantity;
      }, 0);
      if (totalAmount !== validateAmount) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, `金額不正確，請聯繫客服 正確金額: ${validateAmount}`));
      }

      const order = await OrderModel.create({
        memberId: memberId,
        recipientName: name,
        recipientPhone: phone,
        recipientAddress: address,
        totalAmount,
        notes,
        orderCreatedAt: new Date(),
        status: "created",
      });
      const orderItems = cart!.cartItems!.map((item) => {
        let isActive = false;
        if (item.product!.promotionItem) {
          const today = new Date();
          const startDate = new Date(item.product!.promotionItem.promotion.startDate);
          const endDate = new Date(item.product!.promotionItem.promotion.endDate);
          if (today >= startDate && today <= endDate && item.product!.promotionItem.promotion.isActive) {
            isActive = true;
          }
        }
        const discountPrice = isActive ? Math.ceil(item.product!.price * (item.product!.promotionItem!.promotion.discountValue / 100)) : null;
        return {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.product!.price,
          discountPrice,
        };
      });
      await OrderItemModel.bulkCreate(orderItems);
      //清除購物車
      await CartItemModel.destroy({ where: { cartId: cart!.id } });
      // 扣除庫存
      cart!.cartItems!.forEach(async (item) => {
        await ProductModel.update({ inventory: item.product!.inventory - item.quantity }, { where: { id: item.productId } });
      });

      res.status(HttpStatusCodes.CREATED).json(responseFormat(req.body, "訂單已建立"));
    } catch (err: any) {
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
    }
  }
);

/**
 * @swagger
 * /order/{id}:
 *   patch:
 *     summary: 取消訂單
 *     description: 根據訂單 ID 取消訂單，並將庫存恢復到原有數量。僅限該會員的訂單。
 *     tags:
 *       - Order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 訂單 ID
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: 訂單取消成功
 *       400:
 *         description: 無此訂單
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
 *                   example: "無此訂單"
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

//取消訂單
router.patch("/:id", authenticateAccessToken, async (req: JwtReq, res: IRes) => {
  try {
    const orderId = req.params.id;
    const order = await OrderModel.findOne({
      where: { id: orderId, memberId: req.member!.id },
      include: [
        {
          model: OrderItemModel,
          as: "orderItems",
          include: [{ model: ProductModel, as: "product" }],
        },
      ],
    });
    if (!order) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此訂單"));
    }
    await order.update({ status: "canceled", orderCanceledAt: new Date() });
    order.orderItems!.forEach(async (item) => {
      await ProductModel.update({ inventory: item.product.inventory + item.quantity }, { where: { id: item.productId } });
    });

    res.status(HttpStatusCodes.NO_CONTENT).end();
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});
export default router;
