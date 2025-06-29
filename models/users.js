const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
  email: String,
  username: String,
  password: String,
  token: String,
  avatar: String,
  concertList: [{ type: mongoose.Schema.Types.ObjectId, ref: "myConcerts" }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "posts" }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "comments" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
});

const User = mongoose.model("users", UserSchema);
module.exports = User;
