const express = require("express");
const routes = require("./routes/routes");
const path = require("path");

const app = express();
const publicPath = path.join(__dirname, "public");
app.listen(3000);

// view engine e publics
app.set("view engine", "ejs");
app.use(express.static(publicPath));

app.use("/", routes);
