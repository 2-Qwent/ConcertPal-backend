// modèle de données pour les concerts
const mongoose = require('mongoose');

const ZoneSchema = mongoose.Schema({
  number: Number,
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }]
})

const ConcertSchema = mongoose.Schema({
  artist: String,
  venue: String,
  date: Date,
  city: String,
  pic: String,
  seatmap: String,
  zones: [ZoneSchema],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "posts" }]
});

const Concert = mongoose.model('myConcerts', ConcertSchema);
module.exports = Concert;