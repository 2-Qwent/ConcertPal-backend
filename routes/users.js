var express = require("express");
var router = express.Router();

require("../models/connection");
const User = require("../models/users");
const { checkBody } = require("../modules/checkBody");
const uid2 = require("uid2");
const bcrypt = require("bcrypt");

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
        avatar: "default_avatar"
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
  User.findOne({ token: req.params.token }).then((data) => {
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

module.exports = router;
