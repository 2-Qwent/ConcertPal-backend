var express = require("express");
const User = require("../models/users");
var router = express.Router();
const Post = require("../models/posts");
const { checkBody } = require("../modules/checkBody");

require("../models/connection");


//Ajout du token de la personne qui like le post
router.post("/likes", (req, res) => {
  console.log("OUI", req.body)
  Post.findById(req.body._id).then((data) => {
    console.log("ICI", data)
    const alreadyLiked = data.likes.some(
      (like) => like === req.body.token
    );
    //si l'utilisateur n'a pas liké le post, on l'ajoute
    if (!alreadyLiked) {
      Post.updateOne(
        { _id: req.body._id },
        { $push: { likes:  req.body.token } }
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
      });

      newPost.save().then((data) => {
        res.json({ result: true, post: data });
      });
    } else {
      //l'utilisateur n'est pas authentifié
      res.json({ result: false, error: "User is not signed in" });
    }
  });
});

//récupérer tous les posts
router.get("/", (req, res) => {
  Post.find()
    .populate("author")
    .then((data) => {
      res.json({ result: true, posts: data });
    });
});

//récupérer les posts d'un utilisateur
router.get("/:token", (req, res) => {
  Post.find()
    .populate("author")
    .then((data) => {
      let userPosts = data.filter((e) => e.author.token === req.params.token);
      res.json({ result: true, posts: userPosts });
    });
});

//supprimer un post selon son id
router.delete("/:id", (req, res) => {
  Post.findByIdAndDelete(req.params.id).then((data) => {
    if (data) {
      res.json({ result: true });
    } else {
      res.json({ result: false, error: "Post not found" });
    }
  });
});



module.exports = router;
