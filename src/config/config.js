import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Fix __dirname in ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default {
  development: {
    url: process.env.DATABASE_URL,
    dialect: "postgres"
  }
};

