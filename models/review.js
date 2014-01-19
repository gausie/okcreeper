var mongoose = require('mongoose');

module.exports = function() {

  var ReviewSchema = new mongoose.Schema({
    reviewer_name: String,
    reviewer_fbid: Number,
    message: String,
    okcupid_username: String
  });
  
  mongoose.model('Review', ReviewSchema);

};
