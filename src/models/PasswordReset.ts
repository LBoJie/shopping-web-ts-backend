import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
import { MemberModelType } from "./Member";
type PasswordResetAttributes = {
  memberId: number;
  token: string;
  expires: Date;
  member?: MemberModelType;
};
// type PasswordResetCreationAttributes = Optional<PasswordResetAttributes, "id">;

class PasswordResetModel extends Model<PasswordResetAttributes> {
  declare memberId: number;
  declare token: string;
  declare expires: Date;
  declare productId: Date;
  declare member?: MemberModelType;
}
PasswordResetModel.init(
  {
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "member",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    expires: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "password_reset",
    tableName: "password_reset",
    timestamps: false,
  }
);

// PasswordResetModel.sync({ force: true });
export default PasswordResetModel;
export type PasswordResetModelType = InstanceType<typeof PasswordResetModel>;
