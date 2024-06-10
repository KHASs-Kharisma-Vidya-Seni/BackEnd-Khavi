import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathJoin = (pathJoins) => {
  return path.join(__dirname, "../../public", pathJoins);
};

export default pathJoin;
