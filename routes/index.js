var express = require('express');
var router = express.Router();
const Pusher = require("pusher");
const Message = require('../models/messages');
const User = require('../models/users');

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: "eu",
  useTLS: true,
});

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post("/messages/send", async (req, res) => {
  const { channel, sender, message } = req.body;
  const newMsg = new Message({ channel, sender, message });
  await newMsg.save();

  pusher.trigger(channel, "new-message", { sender, message });

  res.json({ result: true });
});

router.get("/messages/:channel", async (req, res) => {
  const messages = await Message.find({ channel: req.params.channel }).sort({ date: 1 });
  res.json({ result: true, history: messages });
});

router.get('/messages/last/:userToken', async (req, res) => {
  const userToken = req.params.userToken;

  // Récupère tous les messages où l'utilisateur est impliqué
  const messages = await Message.find({ channel: { $regex: userToken } }).sort({ date: -1 });

  const seenChannels = new Set();
  const lastMessages = [];

  for (const msg of messages) {
    if (!seenChannels.has(msg.channel)) {
      // Retire le préfixe "chat-"
      const channelWithoutPrefix = msg.channel.replace('chat-', '');
      // Récupère les deux tokens (32 caractères chacun)
      const tokenA = channelWithoutPrefix.slice(0, 32);
      const tokenB = channelWithoutPrefix.slice(-32);

      // Trouve le token du destinataire
      const destinataireToken = (tokenA === userToken) ? tokenB : tokenA;

      // Récupère le user du destinataire
      let destinataireUser = null;
      if (destinataireToken) {
        destinataireUser = await User.findOne({ token: destinataireToken }).select('username avatar token');
      }

      lastMessages.push({
        ...msg.toObject(),
        destinataire: destinataireUser,
      });
      seenChannels.add(msg.channel);
    }
  }

  res.json({ result: true, messages: lastMessages });
});

module.exports = router;
