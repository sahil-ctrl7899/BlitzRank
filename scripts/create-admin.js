// Usage: ADMIN_USERNAME=alice ADMIN_PASSWORD='...' node scripts/create-admin.js
// Admins can't be created through the public API; this is the only bootstrap path.
import bcrypt from "bcrypt";
import { User } from "../src/models/index.js";
import { sequelize } from "../src/config/db.js";

const { ADMIN_USERNAME: username, ADMIN_PASSWORD: password } = process.env;
if (!username || !password || password.length < 12) {
  console.error("Set ADMIN_USERNAME and ADMIN_PASSWORD (>= 12 chars)");
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);
const [user, created] = await User.findOrCreate({ where: { username }, defaults: { password: hash, role: "ADMIN" } });
if (!created) await user.update({ password: hash, role: "ADMIN" });
console.log(`${created ? "Created" : "Updated"} admin '${username}'`);
await sequelize.close();
