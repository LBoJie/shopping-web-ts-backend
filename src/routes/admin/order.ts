import { Router } from "express";
import HttpStatusCodes from "../../common/HttpStatusCodes";
import responseFormat from "../../utils/responseFormat";
import { IReq, IRes } from "../../common/ReqRes";
import { OrderModel, OrderItemModel, ProductModel } from "../../models/index";

const router = Router();

/**
 * @swagger
 * /admin/order/{id}:
 *   get:
 *     summary: 獲取訂單資訊
 *     tags:
 *       - admin - Order
 *     description: 根據訂單 ID 獲取單個訂單的詳細資訊。如果未提供訂單 ID，則返回所有訂單的列表。
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: false
 *         description: 訂單的唯一標識符
 *         schema:
 *           type: integer
 *           example: 1
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
 *                   description: 請求資料，通常為空物件
 *                   example: {}
 *                 responseData:
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: 訂單 ID
 *                             example: 1
 *                           recipientName:
 *                             type: string
 *                             description: 收件人姓名
 *                             example: "張三"
 *                           recipientPhone:
 *                             type: string
 *                             description: 收件人電話
 *                             example: "0912345678"
 *                           recipientAddress:
 *                             type: string
 *                             description: 收件人地址
 *                             example: "台北市某某區某某街1號"
 *                           status:
 *                             type: string
 *                             description: 訂單狀態
 *                             example: "已送達"
 *                           orderTimeStamp:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 content:
 *                                   type: string
 *                                   description: 訂單狀態內容
 *                                   example: "已出貨"
 *                                 timestamp:
 *                                   type: string
 *                                   format: date-time
 *                                   description: 訂單狀態時間戳
 *                                   example: "2024-09-22T10:00:00Z"
 *                           totalAmount:
 *                             type: number
 *                             format: float
 *                             description: 訂單總金額
 *                             example: 299.99
 *                           notes:
 *                             type: string
 *                             description: 附註
 *                             example: "請勿放在門外"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: 訂單創建時間
 *                             example: "2024-09-22T09:00:00Z"
 *                           orderItems:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 productId:
 *                                   type: integer
 *                                   description: 產品 ID
 *                                   example: 101
 *                                 productName:
 *                                   type: string
 *                                   description: 產品名稱
 *                                   example: "手機"
 *                                 price:
 *                                   type: number
 *                                   format: float
 *                                   description: 產品單價
 *                                   example: 199.99
 *                                 discountPrice:
 *                                   type: number
 *                                   format: float
 *                                   description: 折扣後價格
 *                                   example: 179.99
 *                                 quantity:
 *                                   type: integer
 *                                   description: 購買數量
 *                                   example: 1
 *                                 imgUrl:
 *                                   type: string
 *                                   description: 產品圖片 URL
 *                                   example: "https://example.com/image.jpg"
 *                     - type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: 訂單 ID
 *                             example: 1
 *                           recipientName:
 *                             type: string
 *                             description: 收件人姓名
 *                             example: "張三"
 *                           recipientPhone:
 *                             type: string
 *                             description: 收件人電話
 *                             example: "0912345678"
 *                           recipientAddress:
 *                             type: string
 *                             description: 收件人地址
 *                             example: "台北市某某區某某街1號"
 *                           status:
 *                             type: string
 *                             description: 訂單狀態
 *                             example: "已送達"
 *                           totalAmount:
 *                             type: number
 *                             format: float
 *                             description: 訂單總金額
 *                             example: 299.99
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: 訂單創建時間
 *                             example: "2024-09-22T09:00:00Z"
 *       400:
 *         description: 無此訂單或參數錯誤
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
 *                   example: "無此訂單"
 *       500:
 *         description: 伺服器錯誤，無法獲取訂單資訊
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

router.get("/:id?", async (req: IReq, res: IRes) => {
  try {
    const orderId = req.params.id;
    if (orderId) {
      const order = await OrderModel.findByPk(orderId, {
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
        orderId: order.id,
        recipientName: order.recipientName,
        recipientPhone: order.recipientPhone,
        recipientAddress: order.recipientAddress,
        status: order.status,
        orderTimeStamp,
        totalAmount: order.totalAmount,
        notes: order.notes,
        createdAt: order.createdAt,
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
      //取得單一訂單
    } else {
      //取得全部訂單
      const orders = await OrderModel.findAll();
      res.status(HttpStatusCodes.OK).json(responseFormat(req.body, orders));
    }
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});



/**
 * @swagger
 * /admin/order/{id}:
 *   patch:
 *     summary: 更新訂單狀態
 *     tags:
 *       - admin - Order
 *     description: 根據訂單 ID 更新訂單的狀態。status 參數為 confirmed - 確認訂單中  shipped - 已出貨  delivered - 已送達  canceled - 已取消
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 訂單的唯一標識符
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
 *               status:
 *                 type: string
 *                 description: 訂單的新狀態
 *                 enum:
 *                   - confirmed
 *                   - shipped
 *                   - delivered
 *                   - canceled
 *                 example: "shipped"
 *             required:
 *               - status
 *     responses:
 *       204:
 *         description: 成功更新訂單狀態，不返回內容
 *       400:
 *         description: 無此訂單或參數錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     status: "shipped"
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "無此訂單"
 *       500:
 *         description: 伺服器錯誤，無法更新訂單狀態
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                   description: 請求資料
 *                   example:
 *                     status: "shipped"
 *                 responseData:
 *                   type: string
 *                   description: 錯誤訊息
 *                   example: "伺服器錯誤"
 */

router.patch("/:id", async (req: IReq<{ status: string }>, res: IRes) => {
  try {
    const orderId = req.params.id;
    const status = req.body.status;
    const order = await OrderModel.findByPk(orderId, {
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

    type UpdateData = {
      status: string;
      orderConfirmedAt?: Date;
      orderShippedAt?: Date;
      orderDeliveredAt?: Date;
      orderCanceledAt?: Date;
    };

    const updateData: UpdateData = {
      status,
    };

    switch (status) {
      case "confirmed":
        updateData.orderConfirmedAt = new Date();
        break;
      case "shipped":
        updateData.orderShippedAt = new Date();
        break;
      case "delivered":
        updateData.orderDeliveredAt = new Date();
        break;
      case "canceled":
        updateData.orderCanceledAt = new Date();
        break;
      default:
        break;
    }

    await order.update(updateData);
    if (status === "canceled") {
      order.orderItems!.forEach(async (item) => {
        await ProductModel.update({ inventory: item.product.inventory + item.quantity }, { where: { id: item.productId } });
      });
    }

    res.status(HttpStatusCodes.NO_CONTENT).end();
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});
export default router;
