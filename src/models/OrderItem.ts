import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
type OrderItemAttributes = {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  discountPrice: number | null;
  createdAt?: Date;
  updatedAt?: Date;
};
type OrderItemCreationAttributes = Optional<OrderItemAttributes, "id">;

class OrderItemModel extends Model<OrderItemAttributes, OrderItemCreationAttributes> {
  declare id: number;
  declare orderId: number;
  declare productId: number;
  declare quantity: number;
  declare price: number;
  declare discountPrice: number | null;
  declare createdAt?: Date;
  declare updatedAt?: Date;
}
OrderItemModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "order",
        key: "id",
      },
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "product",
        key: "id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "訂單成立當下的商品定價"    
    },
    discountPrice: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "訂單成立當下的商品實際價格"    
    },
  },
  {
    sequelize,
    modelName: "order_item",
    tableName: "order_item",
    timestamps: true,
  }
);
// OrderItemModel.sync({ force: true });
export default OrderItemModel;
export type OrderItemModelType = InstanceType<typeof OrderItemModel>;
