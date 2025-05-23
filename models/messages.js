const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
  channel: String, // ex: "private-chat-tokenA-tokenB"
  sender: String,  // token ou id de l'expéditeur
  message: String,
  date: { type: Date, default: Date.now }
});

const Message = mongoose.model('messages', messageSchema);
module.exports = Message;