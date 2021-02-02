var createError = require("http-errors");
var express = require("express");
var session = require("express-session");
var bodyParser = require("body-parser");
var port = process.env.PORT || 8001;
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");

var app = express();
var requestIp = require("request-ip");

app.use(requestIp.mw());
app.listen(port);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");
app.disable("etag");

app.get("/", function (req, res) {
  res.render("index");
});

app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(
  express.urlencoded({ extended: true, limit: "50mb", parameterLimit: 50000 })
);
app.use(cookieParser());

app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
    httpOnly: true,
  })
);

app.use(express.static(path.join(__dirname, "public")));

const ipMiddleware = function (req, res, next) {
  const clientIp = req.clientIp;
	var ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
  console.log("~ clientIp", ip);
  next();
};

app.use("/digitalpartnership-microsite-service", ipMiddleware, indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
