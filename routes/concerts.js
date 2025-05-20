const express = require('express');
const router = express.Router();

const API_KEY = process.env.API_KEY;

router.get('/', (req, res) => {
  const artist = req.body.artist
  const venue = req.body.venue
  const date = req.body.date

  if (!artist && !venue && !date) {
    return res.status(400).json({ error: 'Au moins un des champs de saisie doit être renseigné' });
  }

  let venueId = null;

  // Étape 1 : si une salle est fournie, on récupère son ID
  const getVenueId = venue
    ? fetch(`https://app.ticketmaster.com/discovery/v2/venues.json?apikey=${API_KEY}&keyword=${encodeURIComponent(venue)}`)
        .then(response => response.json())
        .then(data => {
            console.log(data)
          const venues = data._embedded?.venues;
          if (!venues || venues.length === 0) {
            throw new Error('Salle non trouvée');
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
    .then(response => response.json())
    .then(data => {
      const events = data._embedded?.events || [];
      res.json(events);
    })
    .catch(err => {
      if (err.message === 'Salle non trouvée') {
        res.status(404).json({ error: 'Salle non trouvée' });
      } else {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch data from Ticketmaster' });
      }
    });
});

module.exports = router;