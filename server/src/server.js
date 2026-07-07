const app = require("./app");
const connectDB = require("./config/db");

const port = process.env.PORT || 5000;

connectDB()
  .then(() => app.listen(port, () => console.log(`WealthNest API running on ${port}`)))
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
