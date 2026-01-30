const path = require("path");
// require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { Sequelize } = require("sequelize");



const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB Connected");
  } catch (err) {
    console.error("❌ DB Connection Failed:", err.message);
    process.exit(1); 
  }
};

//for checking at development
// connectDB();
module.exports = {sequelize,connectDB};
