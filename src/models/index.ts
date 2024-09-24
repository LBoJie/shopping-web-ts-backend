import CartModel from "./Cart";
import CartItemModel from "./CartItem";
import CategoryModel from "./Category";
import MemberModel from "./Member";
import PromotionModel from "./Promotion";
import PromotionItemModel from "./PromotionItem";
import OrderModel from "./Order";
import ProductModel from "./Product";
import OrderItemModel from "./OrderItem";
import PasswordResetModel from "./PasswordReset";
import CarouselModel from "./Carousel";

// associations
// ProductModel
ProductModel.belongsTo(CategoryModel, {
  foreignKey: "categoryId",
  as: "category",
});
ProductModel.hasOne(PromotionItemModel, {
  foreignKey: "productId", // 在 PromotionItem 表中存储 productId
  as: "promotionItem", // 别名
});

//PromotionItemModel
PromotionItemModel.belongsTo(PromotionModel, {
  foreignKey: "promotionId",
  as: "promotion",
});
PromotionItemModel.belongsTo(ProductModel, {
  foreignKey: "productId",
  as: "product",
});

PromotionModel.hasMany(PromotionItemModel, {
  foreignKey: "promotionId",
  as: "promotionItems",
});

//CartModel
CartModel.hasMany(CartItemModel, {
  foreignKey: "cartId",
  as: "cartItems",
});
//CartItemModel
CartItemModel.belongsTo(ProductModel, {
  foreignKey: "productId",
  as: "product",
});

//OrderModel
OrderModel.hasMany(OrderItemModel, {
  foreignKey: "orderId",
  as: "orderItems",
});
//OrderItemModel
OrderItemModel.belongsTo(ProductModel, {
  foreignKey: "productId",
  as: "product",
});

//PasswordResetModel
PasswordResetModel.belongsTo(MemberModel, {
  foreignKey: "memberId",
  as: "member",
});

// associations
export { OrderItemModel, OrderModel, CartItemModel, CartModel, CategoryModel, MemberModel, PromotionModel, PromotionItemModel, ProductModel, PasswordResetModel, CarouselModel };
