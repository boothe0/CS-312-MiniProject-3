import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
const app = express()
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "BlogDB",
  password: "W1n10_G4m3r",
  port: 5432,
});

app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false
}));
db.connect();

let blog_post_array = []

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", async(req, res) => {

  const result = await db.query(
    "SELECT * FROM blogs"
  );
  blog_post_array = result.rows;
  // res.render("home.ejs");
  console.log("Session name:", req.session.display_name);
  console.log("Session id: ", req.session.user_id)
  res.render("home.ejs", { blogPosts: blog_post_array, display_name: req.session.display_name});
});

app.get("/sign-up", (req, res)=>{
  res.render("sign-up.ejs")
})

app.get("/sign-in", (req, res)=>{
  res.render("sign-in.ejs")
})

app.post("/sign-up", async(req, res)=>{
  const {user_id, password, name} = req.body;

  const user_exists = await db.query(
    "SELECT user_id FROM users WHERE user_id = $1",
    [user_id]
  );

  if (user_exists.rows.length === 0){
    await db.query("INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)",
      [user_id, password, name]
    );
    res.redirect("/sign-in");
  }
  else{
    res.redirect("/sign-up");
  }
});

app.post("/sign-in", async(req, res)=>{
  const {user_id, password, name} = req.body;
  console.log(user_id, password);
  const password_id_match = await db.query(
    "SELECT user_id FROM users WHERE user_id = $1 AND password = $2",
    [user_id, password]
  );
  if (password_id_match.rows.length === 0){
    res.redirect("/sign-in");
  }
  else{
    const result = await db.query(
      "SELECT name, user_id FROM users WHERE user_id = $1", [user_id]
    );
    req.session.display_name = result.rows[0].name;
    req.session.user_id = result.rows[0].user_id;
    res.redirect("/");
  }
});

app.post("/delete", async(req, res)=>{
  const date_created = new Date(req.body.date_created);
  const post_id = await db.query(
    "SELECT creator_user_id FROM blogs WHERE date_created = $1", [date_created]
  );

  if (post_id.rows.length > 0 && post_id.rows[0].creator_user_id === req.session.user_id){
    await db.query(
      "DELETE FROM blogs WHERE date_created = $1", [date_created]
    );
    res.redirect("/");
  }
  else{
    console.log("Couldnt delete not matching user that created the post");
    res.redirect("/");
  }
  
});


app.post("/edit", async (req, res) => {
  const user_id = req.session.user_id;
  const post_id = req.body.post_id;
  const body = req.body.body_text;

  if (!user_id) {
    return res.redirect("/sign-in");
  }

  const check = await db.query(
    "SELECT blog_id, creator_user_id FROM blogs WHERE blog_id = $1",
    [post_id]
  );

  console.log("Matching blog:", check.rows);

  const result = await db.query(
    `UPDATE blogs
     SET body = $1
     WHERE blog_id = $2
     AND creator_user_id = $3`,
    [body, post_id, user_id]
  );

  console.log("Rows updated:", result.rowCount);

  if (result.rowCount === 0) {
    console.log("Post not found or you do not own this post");
  }

  return res.redirect("/");
});


app.post("/submit", async(req, res) => {
    // pass in the form values of:
    // name
    // date 
    // blog title
    // blog information
    // category choosen
    const {title, body, date_created} = req.body;
    const user_id = req.session.user_id;
    const creator_name = req.session.display_name;

    await db.query(
      "INSERT INTO blogs (creator_name, creator_user_id, title, body, date_created) VALUES ($1, $2, $3, $4, $5)",
      [creator_name, user_id, title, body, date_created]
    );
    console.log("Creating post as:", user_id, creator_name);

    res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});