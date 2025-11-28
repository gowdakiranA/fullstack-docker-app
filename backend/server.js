
const express = require("express");
// const cors = require("cors"); // enable later if you need it

const app = express();

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Database connection
const db = require("./app/models");
db.mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch((err) => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Test application." });
});

// Health route (useful for Docker/monitoring)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Application routes
// NOTE: If the filename is actually "tutorial.routes.js", fix the typo below.
// Currently it points to "turorial.routes" per your original code.
require("./app/routes/turorial.routes")(app);

// set port, listen for requests
const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}.`);
});

