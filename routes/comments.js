var express = require("express");
var router = express.Router();
const User = require("../models/users");
const Post = require("../models/posts");
const Comment = require("../models/comments")
const { checkBody } = require("../modules/checkBody");

require("../models/connection");

// ───── ⋆ ───── Commenter un post ───── ⋆ ─────
router.post('/:token/:postId', (req, res) => {
    if (!checkBody(req.body, ['text'])) {
        res.json({ result: false, error: 'Comment is empty' });
        return;
    }
    // ───── ⋆ ───── Vérifier que l'utilisateur est authentifié ───── ⋆ ─────
    User.findOne({ token: req.params.token}).then ((user) => {
        if (user.token === req.params.token) {
            const newComment = new Comment({
                text: req.body.text,
                author: user._id,
                date: new Date()
            })

            newComment.save().then(savedComment => {
                // ───── ⋆ ───── Update le post commenté ───── ⋆ ─────
                Post.updateOne(
                    {_id: req.params.postId},
                    { $push: { comments : savedComment._id}}
                ).then(() => {
                    // ───── ⋆ ───── Update l'utilisateur qui a commenté ───── ⋆ ─────
                    User.updateOne(
                        { token: req.params.token},
                        { $push: { comments: savedComment._id}}
                    ).then(() => {
                        // ───── ⋆ ───── Populate le commentaire et le renvoie ───── ⋆ ─────
                        Comment.findById(savedComment._id)
                        .populate('author')
                        .then(populatedComment => {
                            res.json({ result: true, comment: populatedComment.text})
                        })
                    })
                })
            })
        } else {
            // ───── ⋆ ───── L'utilisateur n'est pas authentifié ───── ⋆ ─────
            res.json({ result : false, error: 'User not authenticated'})
        }
    })
})

// ───── ⋆ ───── Recupérer les commentaires sous un post ───── ⋆ ─────
router.get('/post/:postId', (req, res) => {
  // ───── ⋆ ───── Trouver le post original ───── ⋆ ─────
  Post.findById(req.params.postId)
    .populate({ path: 'comments', populate: { path: 'author' } })
    .then((post) => {
      if (!post) {
        res.json({ result: false, error: 'Post not found' });
        return;
      }
      // ───── ⋆ ───── Trouver les commentaires du post ───── ⋆ ─────
      res.json({ result: true, comments: post.comments });
    })
    .catch((err) => {
      console.error(err);
      res.json({ result: false, error: 'Error fetching post' });
    });
});


module.exports = router;