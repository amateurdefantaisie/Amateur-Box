require("dotenv").config();

const express = require("express");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  })
});

const db = admin.firestore();
const TOKEN = process.env.TELEGRAM_TOKEN;

// 🔥 TELEGRAM → IMAGE URL
async function getFileURL(file_id) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${file_id}`);
  const data = await res.json();
  return `https://api.telegram.org/file/bot${TOKEN}/${data.result.file_path}`;
}

// 🔥 TELEGRAM WEBHOOK
app.post("/webhook", async (req, res) => {
  const update = req.body;

  if (update.channel_post) {
    const post = update.channel_post;

    let photo = null;
    let video = null;

    if (post.photo) photo = await getFileURL(post.photo.pop().file_id);
    if (post.video) video = await getFileURL(post.video.file_id);

    await db.collection("posts").doc(String(post.message_id)).set({
      text: post.text || "",
      date: post.date,
      photo,
      video,
      likes: 0
    });
  }

  res.sendStatus(200);
});

// 🔥 GET POSTS
app.get("/posts", async (req, res) => {
  const snapshot = await db.collection("posts").orderBy("date", "desc").get();
  res.json(snapshot.docs.map(doc => doc.data()));
});

// 🔥 LIKE
app.post("/like/:id", async (req, res) => {
  const ref = db.collection("posts").doc(req.params.id);

  await ref.update({
    likes: admin.firestore.FieldValue.increment(1)
  });

  res.sendStatus(200);
});

// 🔥 COMMENTS
app.post("/comment/:id", async (req, res) => {
  await db.collection("comments").add({
    postId: req.params.id,
    text: req.body.text,
    date: Date.now()
  });

  res.sendStatus(200);
});

// 🔥 GET COMMENTS
app.get("/comments/:id", async (req, res) => {
  const snapshot = await db.collection("comments")
    .where("postId", "==", req.params.id)
    .orderBy("date", "desc")
    .get();

  res.json(snapshot.docs.map(doc => doc.data()));
});

app.listen(process.env.PORT, () => console.log("🔥 Server running"));
