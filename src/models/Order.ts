import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
import { OrderItemModelType } from "./OrderItem";
import { ProductModelType } from "./Product";
type OrderAttributes = {
  id: number;
  memberId: number;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  status: string;
  totalAmount: number;
  notes?: string;
  orderCreatedAt: Date;
  orderConfirmedAt?: Date;
  orderShippedAt?: Date;
  orderDeliveredAt?: Date;
  orderCanceledAt?: Date;
  updatedAt?: Date;
  createdAt?: Date;
  orderItems?: (OrderItemModelType & { product: ProductModelType })[];
};
type OrderCreationAttributes = Optional<OrderAttributes, "id">;

class OrderModel extends Model<OrderAttributes, OrderCreationAttributes> {
  declare id: number;
  declare memberId: number;
  declare recipientName: string;
  declare recipientPhone: string;
  declare recipientAddress: string;
  declare status: string;
  declare totalAmount: number;
  declare notes?: string;
  declare orderCreatedAt: Date;
  declare orderConfirmedAt?: Date;
  declare orderShippedAt?: Date;
  declare orderDeliveredAt?: Date;
  declare orderCanceledAt: Date;
  declare createdAt?: Date;
  declare updatedAt?: Date;
  declare orderItems?: (OrderItemModelType & { product: ProductModelType })[];
}
OrderModel.init(
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
    recipientName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recipientPhone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recipientAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("created", "confirmed", "shipped", "delivered", "canceled"),
      allowNull: false,
      comment: "created:確認訂單中(訂單已成立) confirmed:等待出貨中(已確認訂單) shipped:已出貨 delivered:已送達(已送到顧客手中) canceled:已取消訂單",
    },
    totalAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    orderCreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    orderConfirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    orderShippedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    orderDeliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    orderCanceledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "order",
    tableName: "order",
    timestamps: true,
  }
);

// OrderModel.sync({ force: true });
export default OrderModel;
export type OrderModelType = InstanceType<typeof OrderModel>;
