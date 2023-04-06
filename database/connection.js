const mongoose = require("mongoose");  
require('dotenv').config()
const { DATABASEURL } = process.env;
const connectDB = async () => {
  try {
    let url = (DATABASEURL) ? DATABASEURL : "mongodb://localhost:27017/gulf_swap"
    mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('mongo is connected')
  } catch (err) {
    console.log(`Error ${err.message}`.blue);
    process.exit(1);
  }
};
module.exports = connectDB;
