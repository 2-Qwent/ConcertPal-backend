// modèle de données pour les concerts
const mongoose = require('mongoose');

const ConcertSchema = mongoose.Schema({
  artist: String,
  venue: String,
  date: Date,
  city: String,
  pic: String,
  seatmap: String,
});

const Concert = mongoose.model('myConcerts', ConcertSchema);
module.exports = Concert;