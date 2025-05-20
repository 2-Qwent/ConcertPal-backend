const mongoose = require('mongoose')

const pictureSchema = mongoose.Schema({
    source: String,
    venueId: String,
})

const postSchema = mongoose.Schema({
    text: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    date: Date,
    picture: pictureSchema,
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "comments" }],
    likes: [String],
})

const Post = mongoose.model('posts', postSchema)
module.exports = Post