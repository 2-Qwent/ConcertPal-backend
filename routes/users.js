var express = require("express");
var router = express.Router();

require("../models/connection");
const User = require("../models/users");
const { checkBody } = require("../modules/checkBody");
const uid2 = require("uid2");
const bcrypt = require("bcrypt");
const cloudinary = require('cloudinary').v2
const fs = require("fs");
const uniqid = require("uniqid");

//créer un compte
router.post("/signup", (req, res) => {
  //vérifie si les champs sont bien remplis
  if (!checkBody(req.body, ["username", "email", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  //vérifie si l'utilisateur existe déjà
  User.findOne({
    username: { $regex: new RegExp(req.body.username, "i") },
  }).then((data) => {
    if (data === null) {
      const hash = bcrypt.hashSync(req.body.password, 10);

      const newUser = new User({
        email: req.body.email,
        username: req.body.username,
        password: hash,
        token: uid2(32),
        avatar: "default_avatar",
      });

      newUser.save().then((newDoc) => {
        res.json({ result: true, token: newDoc.token });
      });
    } else {
      //l'utilisateur existe déjà
      res.json({ result: false, error: "User already exists" });
    }
  });
});

//connexion à un compte
router.post("/signin", (req, res) => {
  console.log("Tentative de connexion avec :", req.body.username);
  //vérifie si les champs sont bien remplis
  if (!checkBody(req.body, ["username", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  //vérifie si on trouve l'utilisateur
  User.findOne({
    username: { $regex: new RegExp(`^${req.body.username}$`, "i") },
  }).then((data) => {
    console.log("Résultat de la recherche :", data);
    if (data && bcrypt.compareSync(req.body.password, data.password)) {
      res.json({ result: true, token: data.token });
    } else {
      //utilisateur non trouvé ou mot de passe incorrect
      res.json({ result: false, error: "User not found or wrong password" });
    }
  });
});

//récuperer les infos d'un utilisateur avec son token
router.get("/:token", (req, res) => {
  User.findOne({ token: req.params.token })
    .populate("posts")
    .then((data) => {
      if (data) {
        res.json({ result: true, user: data });
      } else {
        res.json({ result: false, error: "User not found" });
      }
    });
});

//supprimer un compte
router.delete("/:token", (req, res) => {
  User.deleteOne({ token: req.params.token }).then((data) => {
    if (data.aknowledged) {
      res.json({ result: true, message: "User deleted" });
    } else {
      res.json({ result: false, error: "Deletion failed" });
    }
  });
});


// Route de mise à jour du username et de l'avatar
router.put("/user/:token", async (req, res) => {
  try {
    // Rechercher l'utilisateur par token
    console.log(req.files)
    if (req.body.username) {
      const existingUser = await User.findOne({
        username: req.body.username,
        token: { $ne: req.params.token }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Ce nom d'utilisateur est déjà pris"
        });
      }
    }

    const updates = {};

    if (req.body.username) {
      updates.username = req.body.username;
    }

    if (req.files && req.files.avatar) {
      const filepath = `./tmp/${uniqid()}.jpg`;
      const resultMove = await req.files.avatar.mv(filepath);
      if (!resultMove) {
        const result = await cloudinary.uploader.upload(filepath);
        updates.avatar = result.secure_url;
      } else {
        return res.status(500).json({
          success: false,
          message: "Erreur lors du téléchargement de l'avatar"
        });
      }
    }

    // Mise à jour avec le token comme identifiant
    const updatedUser = await User.findOneAndUpdate(
      { token: req.params.token },
      updates,
      { new: true }
    );

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ success: false, error: error.message });
  }
});

//Follow un utilisateur
router.post("/follow/:userToken", async (req, res) => {
  const { userToken } = req.params;
  const { friendToken } = req.body;

  try {
    const user = await User.findOne({ token: userToken });
    const friend = await User.findOne({ token: friendToken });

    if (!user || !friend) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    await User.updateOne(
      { token: userToken },
      { $addToSet: { following: friend._id } }
    );
    await User.updateOne(
      { token: friendToken },
      { $addToSet: { followers: user._id } }
    );

    res.json({
      result: true,
      message: "Utilisateur suivi avec succès",
      friend: { token: friend.token, username: friend.username, avatar: friend.avatar },
    });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

//Unfollow un utilisateur
router.delete("/unfollow/:userToken", async (req, res) => {
  const { userToken } = req.params;
  const { friendToken } = req.body;

  try {
    const user = await User.findOne({ token: userToken });
    const friend = await User.findOne({ token: friendToken });

    if (!user || !friend) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    await User.updateOne(
      { token: userToken },
      { $pull: { following: friend._id } }
    );
    await User.updateOne(
      { token: friendToken },
      { $pull: { followers: user._id } }
    );

    res.json({
      result: true,
      message: "Utilisateur unfollow avec succès",
      friend: { token: friend.token, username: friend.username, avatar: friend.avatar },
    });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

//Récupérer les follows d'un utilisateur
router.get("/following/:token", (req, res) => {
  User.findOne({ token: req.params.token })
    .populate("following")
    .then((user) => {
      if (user) {
        res.json({ result: true, following: user.following });
      } else {
        res.json({ result: false, error: "User not found" });
      }
    });
});

//récupérer les followers d'un utilisateur
router.get("/followers/:token", (req, res) => {
  User.findOne({ token: req.params.token })
    .populate("followers")
    .then((user) => {
      if (user) {
        res.json({ result: true, followers: user.followers });
      } else {
        res.json({ result: false, error: "User not found" });
      }
    });
});

//Récupérer les utilisateurs d'un concert
router.get("/concertUsers/:concertId", (req, res) => {
  User.find({ concertList: req.params.concertId })
    .then((users) => {
      if (users.length > 0) {
        res.json({ result: true, users });
      } else {
        res.json({ result: false, error: "No users found for this concert" });
      }
    })
    .catch((error) => {
      res.status(500).json({ result: false, error: error.message });
    });
});

module.exports = router;
