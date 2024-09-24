import { Router } from "express";
import { authAdmin } from "../utils/authAdmin";
import productRouter from "./product";
import memberRouter from "./member";
import authRouter from "./auth";
import categoryRouter from "./category";
import adminRouter from "./admin/index";
import cartRouter from "./cart";
import orderRouter from "./order";
import promotionRouter from "./promotion";
import carouselRouter from "./admin/carousel";

const router = Router();

router.use("/product", productRouter);
router.use("/member", memberRouter);
router.use("/auth", authRouter);
router.use("/category", categoryRouter);
router.use("/cart", cartRouter);
router.use("/order", orderRouter);
router.use("/admin", authAdmin, adminRouter);
router.use("/promotion", promotionRouter);
router.use("/carousel", carouselRouter);    
export default router;
