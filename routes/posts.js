var express = require("express");
const User = require("../models/users");
var router = express.Router();
const Post = require("../models/posts");
const { checkBody } = require("../modules/checkBody");
const Concert = require("../models/myConcerts")
const Comment = require("../models/comments"); // Ajoute l'import du modèle Comment

require("../models/connection");


//Ajout du token de la personne qui like le post
router.post("/likes", (req, res) => {
  Post.findById(req.body._id).then((data) => {
    const alreadyLiked = data.likes.some((like) => like === req.body.token);
    //si l'utilisateur n'a pas liké le post, on l'ajoute
    if (!alreadyLiked) {
      Post.updateOne(
        { _id: req.body._id },
        { $push: { likes: req.body.token } }
      ).then(() => {
        res.json({ result: true });
      });
    } else {
      //sinon on le retire
      Post.updateOne(
        { _id: req.body._id },
        { $pull: { likes: req.body.token } }
      ).then(() => {
        res.json({ result: true, data: data.likes });
      });
    }
  });
});


//créer un post
router.post("/:token", (req, res) => {
  if (!checkBody(req.body, ["text"])) {
    res.json({ result: false, error: "Post is empty" });
    return;
  }

  //vérifier que l'utilisateur est bien authentifié
  User.findOne({ token: req.params.token }).then((data) => {
    if (data.token === req.params.token) {
      const newPost = new Post({
        text: req.body.text,
        author: data._id,
        date: new Date(),
        concert: req.body.concertId || null
      });

      newPost.save().then((post) => {
        User.updateOne(
          { token: req.params.token },
          { $push: { posts: post._id } }
        ).then(() => {
          if (req.body.concertId) {
            Concert.updateOne(
              { _id: req.body.concertId },
              { $push: { posts: post._id } }
            ).then(() => {
              Post.findById(post._id)
              .populate("author")
              .then((populatedPost) => {
                res.json({ result: true, post: populatedPost })
              })
            })
          } else {
            Post.findById(post._id)
              .populate("author")
              .then((populatedPost) => {
                res.json({ result: true, post: populatedPost });
              });
          }
        });
      });
    } else {
      //l'utilisateur n'est pas authentifié
      res.json({ result: false, error: "User is not signed in" });
    }
  });
});

//récupérer tous les posts
router.get("/", (req, res) => {
  Post.find().sort({ date: -1 })
    .populate("author")
    .populate('concert')
    .populate('comments')
    .then((data) => {
      res.json({ result: true, posts: data });
    });
});

//récupérer les posts d'un utilisateur
router.get("/:token", (req, res) => {
  Post.find()
    .populate("author")
    .populate("concert")
    .populate('comments')
    .then((data) => {
      let userPosts = data.filter((e) => e.author.token === req.params.token);
      res.json({ result: true, posts: userPosts });
    });
});

//supprimer un post selon son id
router.delete("/:_id", async (req, res) => {
  try {
    const post = await Post.findById(req.params._id)
    if (!post) {
      return res.status(404).json({ result: false, error: "Post not found" })
    }

    // Supprime les commentaires liés au post
    await Comment.deleteMany({ _id: { $in: post.comments } })

    // Supprime le post
    await Post.findByIdAndDelete(req.params._id);

    res.json({ result: true })
  } catch (error) {
    res.json({ result: false, error: error.message})
  }
});




module.exports = router;
