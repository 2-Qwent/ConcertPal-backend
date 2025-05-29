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
router.post("/add/:token", (req, res) => {
  Concert.findOne({
    artist: req.body.artist,
    venue: req.body.venue,
    date: req.body.date,
  })
    .then((existingConcert) => {
      if (existingConcert) {
        // Si le concert existe déjà, on l'utilise
        return existingConcert;
      } else {
        // Sinon, on le crée
        const newConcert = new Concert({
          artist: req.body.artist,
          venue: req.body.venue,
          date: req.body.date,
          city: req.body.city,
          pic: req.body.pic,
          seatmap: req.body.seatmap,
          zones: [],
        });
        return newConcert.save();
      }
    })
    .then((concert) => {
      // Ajoute le concert à la liste du user (évite les doublons avec $addToSet)
      return User.updateOne(
        { token: req.params.token },
        { $addToSet: { concertList: concert._id } }
      ).then(() => concert);
    })
    .then((concert) => {
      res.status(201).json({ result: true, id: concert._id });
    })
    .catch((error) => {
      console.error(error);
      res
        .status(500)
        .json({ result: false, error: "Erreur lors de l'ajout du concert" });
    });
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

router.delete("/delete/:token", async (req, res) => {
  try {
    const user = await User.findOne({ token: req.params.token });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    const concertId = req.body.concertId;
    await Concert.deleteOne({ _id: concertId });
    await User.updateOne(
      { token: req.params.token },
      { $pull: { concertList: concertId } }
    );
    res.json({ result: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression du concert" });
  }
}
);


//Ajouter une zone à un concert
router.post("/addZone/:token", (req, res) => {
  const { concertId } = req.body;
  const zoneNumber = Number(req.body.zoneNumber);
  try {
    User.findOne({ token: req.params.token }).then((user) => {
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      Concert.findById(concertId).then((concert) => {
        if (!concert) {
          return res.status(404).json({ message: "Concert non trouvé" });
        }

        //Vérifier si la zone existe déjà
        const existingZone = concert.zones.find(
          (zone) => zone.number === zoneNumber
        );
        if (existingZone) {
          Concert.updateOne({ _id: concertId, "zones.number": zoneNumber }, { $push: { 'zones.$.users': user._id } })
            .then(() => {
              Concert.findById(concertId)
                .populate('zones.users')
                .then((updatedConcert) => {
                  res.json({ result: true, concert: updatedConcert });
                });
            })
        } else {
          //Ajouter une nouvelle zone
          const newZone = {
            number: zoneNumber,
            users: [user._id],
          };
          Concert.updateOne(
            { _id: concertId },
            { $push: { zones: newZone } }
          ).then(() => {
            res.json({ result: true });
          });
        }
      });
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Erreur lors de l'ajout de la zone",
        error: error.message,
      });
  }
});

//supprimer un utilisateur d'une zone d'un concert
router.delete("/removeUser/:token", (req, res) => {
  const { concertId } = req.body;
  const zoneNumber = Number(req.body.zoneNumber);
  try {
    User.findOne({ token: req.params.token }).then((user) => {
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      Concert.updateOne(
        { _id: concertId, "zones.number": zoneNumber },
        { $pull: { "zones.$.users": user._id } }
      ).then(() => {
        Concert.findById(concertId)
          .populate("zones.users")
          .then((updatedConcert) => {
            res.json({ result: true, concert: updatedConcert });
          });
      });
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Erreur lors de la suppression de l'utilisateur de la zone",
        error: error.message,
      });
  }
});

//route get pour récupérer les utilisateurs d'une zone
router.get('/getZoneUsers/:concertId/:zoneNumber', async (req, res) => {
  const { concertId, zoneNumber } = req.params;
  try {
    const concert = await Concert.findById(concertId).populate('zones.users');
    if (!concert) {
      return res.status(404).json({ message: 'Concert non trouvé' });
    }

    const zone = concert.zones.find(zone => zone.number === Number(zoneNumber));
    if (!zone) {
      return res.status(404).json({ message: 'Zone non trouvée' });
    }

    res.json({ result: true, users: zone.users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs de la zone' });
  }
});

router.get('/getUserZone/:concertId/:token', async (req, res) => {
  const { concertId, token } = req.params;
  try {
    const user = await User.findOne({ token });
    if (!user) return res.json({ result: false });

    const concert = await Concert.findById(concertId);
    if (!concert) return res.json({ result: false });

    const zone = concert.zones.find(z => z.users.map(u => u.toString()).includes(user._id.toString()));
    if (zone) {
      res.json({ result: true, zone: zone.number });
    } else {
      res.json({ result: true, zone: null });
    }
  } catch (error) {
    res.json({ result: false });
  }
});

// Route pour ajouter une photo à un concert
router.post('/photo', async (req, res) => {
  const { concertId, photoUri, token } = req.body;

  try {
    // Enregistrement dans la BDD
    const concert = await Concert.findById(concertId);
    concert.photos.push({
      uri: photoUri,
      user: token,
      date: new Date()
    });
    await concert.save();

    res.json({ success: true, photo: photoUri });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
