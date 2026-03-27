const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");

const app = express();
app.use(bodyParser.json());

// 🔥 Firebase config
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 🔥 Webhook Telegram
app.post("/webhook", async (req, res) => {
  const update = req.body;

  if (update.channel_post) {
    const post = update.channel_post;

    const data = {
      text: post.text || "",
      date: post.date,
      message_id: post.message_id,
      photo: post.photo ? post.photo[post.photo.length - 1].file_id : null,
      video: post.video ? post.video.file_id : null
    };

    await db.collection("posts").doc(String(post.message_id)).set(data);
  }

  res.sendStatus(200);
});

// 🔥 API pour le frontend
app.get("/posts", async (req, res) => {
  const snapshot = await db.collection("posts").orderBy("date", "desc").get();

  const posts = snapshot.docs.map(doc => doc.data());
  res.json(posts);
});

app.listen(3000, () => console.log("🔥 Server running"));
