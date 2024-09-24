import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
import { PromotionModelType } from "./Promotion";
import { PromotionItemModelType } from "./PromotionItem";
import { CategoryModelType } from "./Category";

type ProductAttributes = {
  id: number;
  name: string;
  price: number;
  inventory: number;
  categoryId: number;
  status: string;
  descriptionDelta?: string;
  descriptionHtml?: string;
  imgUrl: string;
  createdAt?: Date;
  updatedAt?: Date;
  promotionItem?: PromotionItemModelType & {
    promotion: PromotionModelType;
  };
  // categoryName?: string;
  category?: CategoryModelType;
};
type ProductCreationAttributes = Optional<ProductAttributes, "id">;

class ProductModel extends Model<ProductAttributes, ProductCreationAttributes> {
  declare id: number;
  declare name: string;
  declare price: number;
  declare inventory: number;
  declare categoryId: number;
  declare status: string;
  declare descriptionDelta?: string;
  declare descriptionHtml?: string;
  declare imgUrl: string;
  declare createdAt: Date;
  declare updatedAt: Date;
  // declare categoryName?: string;
  declare promotionItem?: PromotionItemModelType & {
    promotion: PromotionModelType;
  };
  declare category?: CategoryModelType;
}
ProductModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    inventory: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      references: {
        model: "category",
        key: "id",
      },
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("0", "1"),
      allowNull: false,
      comment: "商品狀態 0:下架 1:上架",
    },
    descriptionDelta: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
      comment: "quill富文本編輯器的原生格式，專門用在quill編輯器上，可直接使用。",
    },
    descriptionHtml: {
      type: DataTypes.TEXT("medium"),
      allowNull: true,
      comment: "商品描述html格式，前端可直接使用。",
    },
    imgUrl: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "product",
    tableName: "product",
    timestamps: true,
  }
);
// ProductModel.sync({ force: true });
export default ProductModel;
export type ProductModelType = InstanceType<typeof ProductModel>;
