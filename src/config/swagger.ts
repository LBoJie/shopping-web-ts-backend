import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
require("dotenv").config();
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "商城api",
      version: "1.0.0",
      description: "商城前後台api文件",
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    servers: [
      {
        url: `${process.env.BASE_URL}/api`,
      },
    ],
  },
  // 這裡配置需要掃描的路徑
  apis: ["./src/routes/**/*.ts", "./dist/routes/**/*.js"],
};

const specs = swaggerJsdoc(options);

const setupSwagger = (app: Express) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
};

export default setupSwagger;
