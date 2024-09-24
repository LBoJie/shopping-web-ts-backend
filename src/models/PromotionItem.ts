import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

type PromotionItemAttributes = {
  id: number;
  promotionId: number;
  productId: number;
  createdAt?: Date;
  updatedAt?: Date;
};
type PromotionItemCreationAttributes = Optional<PromotionItemAttributes, "id">;

class PromotionItemModel extends Model<PromotionItemAttributes, PromotionItemCreationAttributes> {
  declare id: number;
  declare promotionId: number;
  declare productId: number;
  declare createdAt?: Date;
  declare updatedAt?: Date;
}
PromotionItemModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    promotionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "promotion",
        key: "id",
      },
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: "product",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "promotion_item",
    tableName: "promotion_item",
    timestamps: true,
  }
);

//  PromotionItemModel.sync({ force: true });
export default PromotionItemModel;
export type PromotionItemModelType = InstanceType<typeof PromotionItemModel>;
