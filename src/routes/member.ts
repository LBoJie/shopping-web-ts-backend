import { Router } from "express";
import HttpStatusCodes from "../common/HttpStatusCodes";
import { IReq, IRes, JwtReq } from "../common/ReqRes";
import { compare, hash } from "bcrypt";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import responseFormat from "../utils/responseFormat";
import * as jsonpatch from "fast-json-patch";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import Sequelize from "sequelize";
import { v4 as uuidv4 } from "uuid";
import authenticateAccessToken from "../utils/authenticateAccessToken";
import { PasswordResetModel, MemberModel, CartModel, CartItemModel } from "../models/index";
import nodemailer from "nodemailer";
const router = Router();

type CartItem = {
  productId: number;
  name: string;
  price: number;
  imgUrl: string;
  quantity: number;
  status: string;
};
type LoginRequest = {
  accountOrEmail: string;
  password: string;
  guestCart: CartItem[];
};

type RegisterData = {
  account: string;
  password: string;
  name: string;
  phone: string;
  gender: "0" | "1";
  email: string;
  birthday: Date;
  role: "member" | "admin";
};

type AccessMember = Omit<RegisterData, "password"> & {
  id: number;
  accessToken?: string;
  refreshToken?: string;
};

/**
 * @swagger
 * /member/login:
 *   post:
 *     summary: 會員登入
 *     description: 會員登入，驗證帳號或信箱與密碼，並生成 accessToken 和 refreshToken。若訪客有購物車資料，將其與會員購物車合併。
 *     tags:
 *       - Member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountOrEmail:
 *                 type: string
 *                 description: 會員帳號或信箱
 *                 example: "test@example.com"
 *               password:
 *                 type: string
 *                 description: 會員密碼
 *                 example: "password123"
 *               guestCart:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *     responses:
 *       200:
 *         description: 登入成功
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
 *                   description: 登入成功後回傳的會員資料與 token
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 會員 ID
 *                       example: 1
 *                     account:
 *                       type: string
 *                       description: 會員帳號
 *                       example: "user123"
 *                     name:
 *                       type: string
 *                       description: 會員姓名
 *                       example: "John Doe"
 *                     phone:
 *                       type: string
 *                       description: 會員電話號碼
 *                       example: "0912345678"
 *                     email:
 *                       type: string
 *                       description: 會員電子郵件
 *                       example: "user@example.com"
 *                     gender:
 *                       type: string
 *                       description: 會員性別
 *                       example: "male"
 *                     birthday:
 *                       type: string
 *                       format: date
 *                       description: 會員生日
 *                       example: "1990-01-01"
 *                     role:
 *                       type: string
 *                       description: 會員角色
 *                       example: "member"
 *                     accessToken:
 *                       type: string
 *                       description: JWT Access Token
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       description: JWT Refresh Token
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: 帳號或密碼錯誤
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
 *                   example: "密碼錯誤"
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

router.post(
  "/login",
  [body("accountOrEmail").notEmpty().withMessage("accountOrEmail is required"), body("password").notEmpty().withMessage("password is required")],
  async (req: IReq<LoginRequest>, res: IRes) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errText = errors
        .array()
        .map((error) => error.msg)
        .join(" \n");
      return res.status(400).json(responseFormat(req.body, errText));
    }
    try {
      const data = req.body;
      const member = await MemberModel.findOne({ where: { [Sequelize.Op.or]: [{ account: data.accountOrEmail }, { email: data.accountOrEmail }] } });
      if (!member) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此帳號或信箱，請重新確認"));
      }
      const passwordMatch = await compare(data.password, member.password);
      if (!passwordMatch) {
        return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "密碼錯誤"));
      }
      const accessMember: AccessMember = {
        id: member.id,
        account: member.account,
        name: member.name,
        phone: member.phone,
        email: member.email,
        gender: member.gender,
        birthday: member.birthday,
        role: member.role,
      };
      let jti = member.refreshTokenJti;
      if (!member.refreshTokenJti) {
        jti = uuidv4();
        await member.update({ refreshTokenJti: jti });
      }
      const accessToken = generateAccessToken(accessMember);
      const refreshToken = generateRefreshToken({ id: accessMember.id, jti });
      accessMember.accessToken = accessToken;
      accessMember.refreshToken = refreshToken;
      //加入購物車
      if (data.guestCart.length > 0) {
        let cart = await CartModel.findOne({
          where: { memberId: member.id },
        });
        if (!cart) {
          //如果沒有 新增購物車
          cart = await CartModel.create({ memberId: member.id });
        }
        data.guestCart.forEach(async (item) => {
          const cartItem = await CartItemModel.findOne({
            where: { cartId: cart.id, productId: item.productId },
          });
          if (cartItem) {
            await cartItem.update({ quantity: cartItem.quantity + item.quantity });
          } else {
            await CartItemModel.create({ cartId: cart.id, productId: item.productId, quantity: item.quantity });
          }
        });
      }

      res.status(HttpStatusCodes.OK).json(responseFormat(req.body, accessMember));
    } catch (err: any) {
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
    }
  }
);

/**
 * @swagger
 * /member:
 *   post:
 *     summary: 會員註冊
 *     description: 用於會員註冊，檢查帳號、手機號碼及電子郵件是否已被註冊，並將新會員資訊存儲到資料庫中。
 *     tags:
 *       - Member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               account:
 *                 type: string
 *                 description: 會員帳號
 *                 example: "newuser123"
 *               password:
 *                 type: string
 *                 description: 會員密碼，必須為8到16個字符
 *                 example: "securepassword"
 *               name:
 *                 type: string
 *                 description: 會員姓名
 *                 example: "Jane Doe"
 *               phone:
 *                 type: string
 *                 description: 會員電話號碼，必須為10位數
 *                 example: "0912345678"
 *               email:
 *                 type: string
 *                 description: 會員電子郵件
 *                 example: "jane.doe@example.com"
 *               birthday:
 *                 type: string
 *                 format: date
 *                 description: 會員生日，必須是有效的日期格式
 *                 example: "1990-01-01"
 *     responses:
 *       201:
 *         description: 註冊成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                 responseData:
 *                   type: string
 *                   description: 註冊成功的訊息
 *                   example: "註冊成功"
 *       400:
 *         description: 請求錯誤，例如缺少必填字段或驗證失敗
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
 *                   example: "account is required \n password is required"
 *       409:
 *         description: 衝突，例如帳號、手機號碼或電子郵件已被註冊
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                 responseData:
 *                   type: string
 *                   description: 衝突錯誤訊息
 *                   example: "使用者帳戶已經存在"
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

router.post(
  "/",
  [
    body("account").notEmpty().withMessage("account is required"),
    body("password").isLength({ min: 8, max: 16 }).withMessage("password is required"),
    body("name").notEmpty().withMessage("name is required"),
    body("phone").isLength({ min: 10, max: 10 }).notEmpty().withMessage("phone is required"),
    body("email").isEmail().withMessage("email is required and valided"),
    body("birthday").isDate().withMessage("birthday is required and must be a valid date"),
  ],
  async (req: IReq<RegisterData>, res: IRes) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errText = errors
        .array()
        .map((error) => error.msg)
        .join(" \n");
      return res.status(400).json(responseFormat(req.body, errText));
    }
    try {
      const data = req.body;
      //檢查account是否存在
      const existingAccount = await MemberModel.findOne({
        where: {
          account: data.account,
        },
      });
      if (existingAccount) {
        return res.status(HttpStatusCodes.CONFLICT).json(responseFormat(req.body, "使用者帳戶已經存在"));
      }
      // 檢查手機是否存在
      const existingPhone = await MemberModel.findOne({
        where: {
          phone: data.phone,
        },
      });
      if (existingPhone) {
        return res.status(HttpStatusCodes.CONFLICT).json(responseFormat(req.body, "手機已被註冊"));
      }
      // 檢查信箱是否存在
      const existingEmail = await MemberModel.findOne({
        where: {
          email: data.email,
        },
      });
      if (existingEmail) {
        return res.status(HttpStatusCodes.CONFLICT).json(responseFormat(req.body, "信箱已被註冊"));
      }
      data.password = await hash(data.password, 10);
      await MemberModel.create(data);
      res.status(HttpStatusCodes.CREATED).json(responseFormat(req.body, "註冊成功"));
    } catch (err: any) {
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
    }
  }
);

/**
 * @swagger
 * /member/logout:
 *   get:
 *     summary: 會員登出
 *     description: 用於會員登出，會清除該會員的 refreshTokenJti，並返回登出成功的消息。
 *     tags:
 *       - Member
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                 responseData:
 *                   type: string
 *                   description: 登出成功的訊息
 *                   example: "登出成功"
 *       401:
 *         description: 未經授權，未提供有效的授權令牌
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
 *                   example: "未提供有效的授權令牌"
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

router.get("/logout", authenticateAccessToken, async (req: JwtReq, res: IRes) => {
  try {
    const member = await MemberModel.findByPk(req.member!.id);
    await member!.update({ refreshTokenJti: "" });
    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, "登出成功"));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

type PatchRequest = {
  jsonPatch: jsonpatch.ReplaceOperation<any>[];
};

/**
 * @swagger
 * /member:
 *   patch:
 *     summary: 更新會員資料
 *     description: 根據提供的 JSON Patch 文件更新會員資料。
 *     tags:
 *       - Member
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       description: 包含 JSON Patch 操作的請求體
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jsonPatch:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     op:
 *                       type: string
 *                       description: 操作類型（add、remove、replace 等）
 *                     path:
 *                       type: string
 *                       description: 要更新的字段路徑
 *                     value:
 *                       type: any
 *                       description: 要設置的新值
 *             required:
 *               - jsonPatch
 *     responses:
 *       204:
 *         description: 成功更新會員資料
 *       400:
 *         description: 無此會員或請求格式錯誤
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
 *                   example: "無此會員，請重新登入"
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

//修改會員資料
router.patch("/", authenticateAccessToken, async (req: JwtReq<PatchRequest>, res: IRes) => {
  try {
    const patch = req.body.jsonPatch;
    const member = await MemberModel.findByPk(req.member!.id);
    if (!member) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此會員，請重新登入"));
    }
    const updateMember = jsonpatch.applyPatch(member.toJSON(), patch).newDocument;

    member.update(updateMember);
    res.status(HttpStatusCodes.NO_CONTENT).end();
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /member:
 *   get:
 *     summary: 取得會員資料
 *     description: 根據使用者的身份認證，取得會員的詳細資料。
 *     tags:
 *       - Member
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 成功取得會員資料
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                 responseData:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: 會員ID
 *                     account:
 *                       type: string
 *                       description: 會員帳號
 *                     name:
 *                       type: string
 *                       description: 會員姓名
 *                     phone:
 *                       type: string
 *                       description: 會員電話
 *                     email:
 *                       type: string
 *                       description: 會員電子郵件
 *                     gender:
 *                       type: string
 *                       description: 會員性別
 *                     role:
 *                       type: string
 *                       description: 會員角色
 *                     birthday:
 *                       type: string
 *                       format: date
 *                       description: 會員生日
 *       400:
 *         description: 無此帳號或請求格式錯誤
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
 *                   example: "無此帳號，請重新確認"
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

//取得會員資料
router.get("/", authenticateAccessToken, async (req: JwtReq, res: IRes) => {
  try {
    const id = req.member!.id;
    const member = await MemberModel.findByPk(id, { attributes: ["id", "account", "name", "phone", "email", "gender", "role", "birthday"] });
    if (!member) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此帳號，請重新確認"));
    }
    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, member));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /member/forgot-password:
 *   post:
 *     summary: 忘記密碼
 *     description: 根據提供的電子郵件地址發送重設密碼的郵件。郵件中包含一個有效期為1小時的重設密碼連結。
 *     tags:
 *       - Member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 註冊時使用的電子郵件地址
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: 成功發送重設密碼郵件
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestData:
 *                   type: object
 *                 responseData:
 *                   type: string
 *                   description: 成功訊息
 *                   example: "已發送重設密碼信件"
 *       400:
 *         description: 無此註冊信箱或請求格式錯誤
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
 *                   example: "無此註冊信箱 請重新確認"
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

type ForgetPasswordRequest = {
  email: string;
};
//忘記密碼
router.post("/forgot-password", async (req: IReq<ForgetPasswordRequest>, res: IRes) => {
  try {
    const { email } = req.body;
    const member = await MemberModel.findOne({ where: { email } });
    if (!member) {
      return res.status(HttpStatusCodes.BAD_REQUEST).json(responseFormat(req.body, "無此註冊信箱 請重新確認"));
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 令牌有效期 1 小時

    await PasswordResetModel.create({
      memberId: member.id,
      token,
      expires,
    });
    const resetUrl = `${process.env.FRONTEND_DOMAIN}/reset-password?token=${token}`;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_ACCOUNT, // 你的 Gmail 帳號
        pass: process.env.GMAIL_PASSWORD, // 你的 Gmail 密碼或應用專用密碼
      },
    });
    const mailOptions = {
      from: process.env.GMAIL_ACCOUNT, // 發件人
      to: member.email, // 收件人
      subject: "重設密碼", // 郵件主題
      html: `<p>點擊 <a href="${resetUrl}">網址</a>重設密碼</p>`,
    };
    await transporter.sendMail(mailOptions);
    res.status(HttpStatusCodes.OK).json(responseFormat(req.body, "已發送重設密碼信件"));
  } catch (err: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
  }
});

/**
 * @swagger
 * /member/reset-password:
 *   post:
 *     summary: 重設密碼
 *     description: 使用重設密碼的令牌來重設用戶的密碼。令牌有效期為1小時，過期後需重新申請。
 *     tags:
 *       - Member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: 密碼重設令牌
 *                 example: "a1b2c3d4e5f6g7h8i9j0k"
 *               newPassword:
 *                 type: string
 *                 description: 新密碼，長度必須為8到16位
 *                 example: "newSecurePassword123"
 *     responses:
 *       204:
 *         description: 密碼成功重設
 *       400:
 *         description: 無效的令牌或令牌已過期，或請求格式錯誤
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
 *                   example: "此連結已失效，請重新申請"
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

type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};
//重設密碼
router.post(
  "/reset-password",
  [body("newPassword").isLength({ min: 8, max: 16 }).withMessage("密碼長度必須為 8 到 16 位"), body("token").notEmpty().withMessage("無效token")],
  async (req: IReq<ResetPasswordRequest>, res: IRes) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errText = errors
        .array()
        .map((error) => error.msg)
        .join(" \n");
      return res.status(400).json(responseFormat(req.body, errText));
    }
    try {
      const { token, newPassword } = req.body;
      const resetRequest = await PasswordResetModel.findOne({
        where: { token },
        include: [
          {
            model: MemberModel,
            as: "member",
          },
        ],
      });
      if (!resetRequest || new Date(resetRequest.expires) < new Date() || !resetRequest.member) {
        return res.status(400).json({ message: "此連結已失效，請重新申請" });
      }
      const hashedPassword = await hash(newPassword, 10);
      await resetRequest.member.update({ password: hashedPassword });
      await PasswordResetModel.destroy({ where: { token } });
      res.status(HttpStatusCodes.NO_CONTENT).end();
    } catch (err: any) {
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json(responseFormat(req.body, err.message));
    }
  }
);
export default router;
