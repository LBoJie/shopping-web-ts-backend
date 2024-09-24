import { Router } from "express";
import productRouter from "./product";
import uploadRouter from "./upload";
import categoryRouter from "./category";
import promotionRouter from "./promotion";
import orderRouter from "./order";
import carouselRouter from "./carousel";
const router = Router();

router.use("/product", productRouter);
router.use("/upload", uploadRouter);
router.use("/category", categoryRouter);
router.use("/promotion", promotionRouter);
router.use("/order", orderRouter);
router.use("/carousel", carouselRouter);
export default router;
