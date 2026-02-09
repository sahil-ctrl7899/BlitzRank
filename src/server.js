import path from "path";
import dotenv from "dotenv";
dotenv.config(); 
import { fileURLToPath } from "url";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import "./cron/tournament.cron.js";

// Fix for __dirname in ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PORT = process.env.PORT || 3000;

(async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port -> ${PORT}`);
  });
})();


