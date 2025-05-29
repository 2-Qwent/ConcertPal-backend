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



//Ajout du token de la personne qui like le commentaire
router.post("/likes", (req, res) => {
  Comment.findById(req.body._id).then((data) => {
    const alreadyLiked = data.likes.some((like) => like === req.body.token);
    //si l'utilisateur n'a pas liké le post, on l'ajoute
    if (!alreadyLiked) {
      Comment.updateOne(
        { _id: req.body._id },
        { $push: { likes: req.body.token } }
      ).then(() => {
        res.json({ result: true });
      });
    } else {
      //sinon on le retire
      Comment.updateOne(
        { _id: req.body._id },
        { $pull: { likes: req.body.token } }
      ).then(() => {
        res.json({ result: true, data: data.likes });
      });
    }
  });
});

//Supprimer un commentaire
router.delete("/:commentId", (req, res) => {
  Comment.findByIdAndDelete(req.params.commentId).then((data) => {
    if (data) {
      res.json({ result: true, data });
    } else {
      res.json({ result: false, error: "Post not found" });
    }
  });
});

module.exports = router;