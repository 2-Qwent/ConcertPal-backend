const express = require("express");
const router = express.Router();

const API_KEY = process.env.API_KEY;
const Concert = require("../models/myConcerts");
const User = require("../models/users");

router.post("/", (req, res) => {
  const artist = req.body.artist;
  const venue = req.body.venue;
  const date = req.body.date;

  if (!artist && !venue && !date) {
    return res
      .status(400)
      .json({ error: "Au moins un des champs de saisie doit être renseigné" });
  }

  let venueId = null;

  // si une salle est fournie, on récupère son ID
  const getVenueId = venue
    ? fetch(
        `https://app.ticketmaster.com/discovery/v2/venues.json?apikey=${API_KEY}&keyword=${encodeURIComponent(
          venue
        )}`
      )
        .then((response) => response.json())
        .then((data) => {
          console.log("data", data);
          const venues = data._embedded?.venues;
          if (!venues || venues.length === 0) {
            throw new Error("Salle non trouvée");
          }
          venueId = venues[0].id;
        })
    : Promise.resolve(); // Pas de salle ? On saute l'étape

  getVenueId
    .then(() => {
      // Construire l’URL d'événements
      let eventUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}`;
      if (artist) eventUrl += `&keyword=${encodeURIComponent(artist)}`;
      if (venueId) eventUrl += `&venueId=${venueId}`;
      if (date) {
        eventUrl += `&startDateTime=${date}T00:00:00Z&endDateTime=${date}T23:59:59Z`;
      }

      return fetch(eventUrl);
    })
    .then((response) => response.json())
    .then((data) => {
      const events = data._embedded?.events || [];
      res.json({ result: true, concerts: events });
    })
    .catch((err) => {
      if (err.message === "Salle non trouvée") {
        res.status(404).json({ error: "Salle non trouvée" });
      } else {
        console.error(err);
        res
          .status(500)
          .json({ error: "Failed to fetch data from Ticketmaster" });
      }
    });
});

// Route pour stocker un concert dans la base de données
router.post("/add/:token", async (req, res) => {
  const newConcert = new Concert({
    artist: req.body.artist,
    venue: req.body.venue,
    date: req.body.date,
    city: req.body.city,
    pic: req.body.pic,
  });

  const concert = await newConcert.save();

  await User.updateOne(
    { token: req.params.token },
    { $push: { concertList: concert._id } }
  );
  res.status(201).json({ result: true });
});

// Route pour récupérer les concerts d'un utilisateur
router.get("/:token", async (req, res) => {
  try {
    const user = await User.findOne({ token: req.params.token }).populate(
      "concertList"
    );
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.json({ result: true, list: user.concertList });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des concerts" });
  }
});

module.exports = router;
