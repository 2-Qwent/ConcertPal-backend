const mongoose = require('mongoose')

const pictureSchema = mongoose.Schema({
    source: String,
    venueId: String,
})

const commentSchema = mongoose.Schema({
    text: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    date: Date,
    picture: pictureSchema,
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "comments" }],
    likes: [String],
})

const Comment = mongoose.model('comments', commentSchema)
module.exports = Comment