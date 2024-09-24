import { Sequelize } from "sequelize";
require("dotenv").config();
const sequelize = new Sequelize(process.env.DATABASE!, process.env.DB_USER!, process.env.DB_PASSWORD!, {
  host: process.env.DB_HOST,
  dialect: "mysql",
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
    timezone: "+08:00",
  },
  define: {
    underscored: true,
  },
  timezone: "+08:00",
});
export default sequelize;
