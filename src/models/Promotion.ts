import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
import { PromotionItemModelType } from "./PromotionItem";
import { ProductModelType } from "./Product";

type PromotionAttributes = {
  id: number;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  discountType: "PERCENTAGE";
  discountValue: number;
  imgUrl: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  productIds?: number[] | string;
  promotionItems?: (PromotionItemModelType & {
    product: ProductModelType;
  })[];
};
type PromotionCreationAttributes = Optional<PromotionAttributes, "id">;

class PromotionModel extends Model<PromotionAttributes, PromotionCreationAttributes> {
  declare id: number;
  declare name: string;
  declare description?: string;
  declare startDate: Date;
  declare endDate: Date;
  declare discountType: "PERCENTAGE";
  declare discountValue: number;
  declare imgUrl: string | null;
  declare isActive: boolean;
  declare createdAt?: Date;
  declare updatedAt?: Date;
  declare productIds: number[] | string;
  declare promotionItems?: (PromotionItemModelType & {
    product: ProductModelType;
  })[];
}
PromotionModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    discountType: {
      type: DataTypes.ENUM("PERCENTAGE"),
      allowNull: false,
      comment: "PERCENTAGE: 百分比",
    },
    discountValue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "discount_type = PERCENTAGE: 需/100",
    },
    imgUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "promotion",
    tableName: "promotion",
    timestamps: true,
  }
);

// PromotionModel.sync({ force: true });
export default PromotionModel;
// export type  PromotionModelType = typeof PromotionModel;
export type PromotionModelType = InstanceType<typeof PromotionModel>;
