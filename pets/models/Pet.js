const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  name: String,
  species: String,
  breed: String,
  age: Number,
  gender: String,
  description: String,
  status: { type: String, default: 'available' },
});

module.exports = mongoose.model('Pet', petSchema);
