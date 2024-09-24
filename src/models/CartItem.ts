import { DataTypes, Model, Optional } from "sequelize";
import { ProductModelType } from "./Product";
import sequelize from "../config/db";
type CartItemAttributes = {
  id: number;
  cartId: number;
  productId: number;
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
  product?: ProductModelType;
};
type CartItemCreationAttributes = Optional<CartItemAttributes, "id">;

class CartItemModel extends Model<CartItemAttributes, CartItemCreationAttributes> {
  declare id: number;
  declare cartId: number;
  declare productId: number;
  declare quantity: number;
  declare createdAt?: Date;
  declare updatedAt?: Date;
  declare product?: ProductModelType;
}
CartItemModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    cartId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "cart",
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
  },
  {
    sequelize,
    modelName: "cartItem",
    tableName: "cartItem",
    timestamps: true,
  }
);
// CartItemModel.sync({ force: true });
export default CartItemModel;
export type CartItemModelType = InstanceType<typeof CartItemModel>;
