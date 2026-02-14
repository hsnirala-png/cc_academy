import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT ?? 5000);

app.listen(PORT, () => {
  console.log(`CC Academy API running on port ${PORT}`);
});
