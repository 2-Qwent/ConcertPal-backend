var express = require("express");
const User = require("../models/users");
const Concert = require("../models/myConcerts");
var router = express.Router();
const Post = require("../models/posts");
const { checkBody } = require("../modules/checkBody");

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
      });

      newPost.save().then((post) => {
        User.updateOne(
          { token: req.params.token },
          { $push: { posts: post._id } }
        ).then(() => {
          Post.findById(post._id)
            .populate("author")
            .then((populatedPost) => {
              res.json({ result: true, post: populatedPost });
            });
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
router.delete("/:_id", (req, res) => {
  Post.findByIdAndDelete(req.params._id).then((data) => {
    if (data) {
      res.json({ result: true });
    } else {
      res.json({ result: false, error: "Post not found" });
    }
  });
});

router.post("/photos/:token", async (req, res) => {
  const { concertId, photoUri } = req.body;

  try {
    const user = await User.findOne({ token: req.params.token });
    if (!user) {
      return res.status(404).json({ result: false, error: "Utilisateur non trouvé" });
    }

    const concert = await Concert.findById(concertId);
    if (!concert) {
      return res.status(404).json({ result: false, error: "Concert non trouvé" });
    }

    concert.photos.push({
      uri: photoUri,
      user: user._id,
      date: new Date()
    });

    await concert.save();
    res.json({ result: true, photo: concert.photos[concert.photos.length - 1] });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

module.exports = router;
