var express = require("express");
var router = express.Router();

require("../models/connection");
const User = require("../models/users");
const { checkBody } = require("../modules/checkBody");
const uid2 = require("uid2");
const bcrypt = require("bcrypt");
const cloudinary = require('cloudinary').v2
const fileUpload = require("express-fileupload");

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
  //vérifie si les champs sont bien remplis
  if (!checkBody(req.body, ["username", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  //vérifie si on trouve l'utilisateur
  User.findOne({
    username: { $regex: new RegExp(req.body.username, "i") },
  }).then((data) => {
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

// Middleware pour l'upload de fichiers
router.use(fileUpload({ useTempFiles: true }));

// Route de mise à jour du username et de l'avatar
router.put("/user/:token", async (req, res) => {
  try {
    // Rechercher l'utilisateur par token
    const user = await User.findOne({ token: req.params.token });
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
    }

    const updates = {};

    if (req.body.username) {
      updates.username = req.body.username;
    }

    if (req.files && req.files.avatar) {
      const result = await cloudinary.uploader.upload(req.files.avatar.tempFilePath);
      updates.avatar = result.secure_url;
    }

    // Mise à jour avec le token comme identifiant
    const updatedUser = await User.findOneAndUpdate(
        { token: req.params.token },
        updates,
        { new: true }
    );

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
