var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors')
const databaseConnection = require('./database/connection')
var auth = require('./controller/auth');
var bscSwapping = require('./controller/bscSwapping');
var etherSwapping = require('./controller/etherSwapping');
var transaction = require('./controller/transaction')
var limitOrder = require("./controller/limitOrder");

var app = express();
databaseConnection();
app.use(cors({ origin: '*'}));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', auth);
app.use('/bscSwapping', bscSwapping);
app.use('/etherSwapping', etherSwapping);
app.use('/transaction', transaction);
app.use('/limitOrder', limitOrder);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
