import { DataTypes, Model, Optional } from "sequelize";
import { CartItemModelType } from "./CartItem";
import sequelize from "../config/db";

type CartAttributes = {
  id: number;
  memberId: number;
  createdAt?: Date;
  updatedAt?: Date;
  cartItems?: CartItemModelType[];
};
type CartCreationAttributes = Optional<CartAttributes, "id">;

class CartModel extends Model<CartAttributes, CartCreationAttributes> {
  declare id: number;
  declare memberId: number;
  declare createdAt?: Date;
  declare updatedAt?: Date;
  declare cartItems?: CartItemModelType[];
}
CartModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "member",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "cart",
    tableName: "cart",
    timestamps: true,
  }
);

// CartModel.sync({ force: true });
export default CartModel;
export type CartModelType = InstanceType<typeof CartModel>;
