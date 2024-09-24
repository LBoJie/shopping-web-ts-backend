import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

type CarouselAttributes = {
  id: number;
  category: number;
  href: string;
  imgUrl: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
};
type CarouselCreationAttributes = Optional<CarouselAttributes, "id">;

class CarouselModel extends Model<CarouselAttributes, CarouselCreationAttributes> {
  declare id: number;
  declare category: number;
  declare href: string;
  declare imgUrl: string;
  declare order: number;
  declare createdAt?: Date;
  declare updatedAt?: Date;
}
CarouselModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    category: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "輪播分類 1:首頁",
    },
    href: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    imgUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "輪播順序",
    },
  },
  {
    sequelize,
    modelName: "carousel",
    tableName: "carousel",
    timestamps: true,
  }
);

// CarouselModel.sync({ force: true });
export default CarouselModel;
export type CarouselModelType = InstanceType<typeof CarouselModel>;
