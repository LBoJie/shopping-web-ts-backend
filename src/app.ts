import express from "express";
import helmet from "helmet";
import setupSwagger from "./config/swagger";
import morgan from "morgan";
import cors from "cors";
import apiRouter from "./routes/index";
import { rateLimit } from "express-rate-limit";
import cron from "node-cron";
import { PromotionModel, PromotionItemModel, PasswordResetModel } from "./models/index";
import Sequelize from "sequelize";
// import sequelize from './config/db';
//限制同一ip請求數量
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false,
  message: "短時間內多次請求 請稍後再試", // Disable the `X-RateLimit-*` headers.
});

//每天凌晨 12 點例行清理
cron.schedule("0 0 * * *", async () => {
  try {
    const currentDate = new Date();
    const expiredPromotions = await PromotionModel.findAll({
      where: {
        endDate: {
          [Sequelize.Op.lt]: currentDate,
        },
        isActive: {
          [Sequelize.Op.eq]: true,
        },
      },
    });
    expiredPromotions.forEach(async (item) => {
      await PromotionItemModel.destroy({
        where: {
          promotionId: item.id,
        },
      });

      item.isActive = false;
      await item.save();
    });

    const expiredPasswordResets = await PasswordResetModel.findAll({
      where: {
        expires: {
          [Sequelize.Op.lt]: currentDate,
        },
      },
    });
    expiredPasswordResets.forEach(async (item) => {
      await item.destroy();
    });
  } catch (error) {
    console.log(error);
  }
});

const app = express();

require("dotenv").config();

app.use(cors());
app.set('trust proxy', true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
setupSwagger(app);
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(helmet());
  app.use(limiter);
}

// const startServer = async () => {
//   try {
//     // 同步所有模型
//     await sequelize.sync({ alter: true }); // alter: true 會自動創建/更新表格
//     console.log('Database synced successfully.');

//     // 啟動你的 Express 應用
//     // app.listen(...) 或其他啟動代碼

//   } catch (error) {
//     console.error('Unable to sync database:', error);
//   }
// };

// startServer();

app.use("/api", apiRouter);

app.listen(process.env.PORT, () => {
  console.log(`Server is running at port:${process.env.PORT}`);
});
