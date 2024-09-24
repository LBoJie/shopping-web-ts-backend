import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

type MemberAttributes = {
  id: number;
  account: string;
  password: string;
  name: string;
  phone: string;
  email: string;
  gender: "0" | "1";
  birthday: Date;
  role: "member" | "admin";
  refreshTokenJti?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
type MemberCreationAttributes = Optional<MemberAttributes, "id">;

class MemberModel extends Model<MemberAttributes, MemberCreationAttributes> {
  declare id: number;
  declare account: string;
  declare password: string;
  declare name: string;
  declare phone: string;
  declare email: string;
  declare gender: "0" | "1";
  declare birthday: Date;
  declare role: "member" | "admin";
  declare refreshTokenJti?: string;
  declare createdAt?: Date;
  declare updatedAt?: Date;
}
MemberModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    account: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    gender: {
      type: DataTypes.ENUM("0", "1"),
      allowNull: false,
      comment: "0=男 1=女",
    },
    birthday: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("member", "admin"),
      allowNull: false,
      defaultValue: "member",
    },
    refreshTokenJti: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "member",
    tableName: "member",
    timestamps: true,
  }
);
// MemberModel.sync({ force: true });
export default MemberModel;
export type MemberModelType = InstanceType<typeof MemberModel>;
