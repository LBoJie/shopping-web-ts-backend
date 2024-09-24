import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
type CategoryAttributes = {
  id: number;
  name: string;
};
type CategoryCreationAttributes = Optional<CategoryAttributes, "id">;

class CategoryModel extends Model<CategoryAttributes, CategoryCreationAttributes> {
  declare id: number;
  declare name: string;
}
CategoryModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "category",
    tableName: "category",
    timestamps: false,
  }
);
// CategoryModel.sync({ force: true });
export default CategoryModel;
export type CategoryModelType = InstanceType<typeof CategoryModel>;