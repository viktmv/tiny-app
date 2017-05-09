const express = require('express')
const app = express()
const bodyParser = require("body-parser");


let PORT  = process.env.PORT || 8080

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

let urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
}

app.get('/', (req, res) => {
  res.end('Welcome!\n')
})

app.get('/urls', (req,res) => {
  res.render('urls_index', { urls: urlDatabase })
})

app.post('/urls', (req, res) => {
  let shortURL = generateRandomString()
  urlDatabase[shortURL] = req.params.longURL
  res.redirect(`http://localhost:8080/urls/${shortURL}`)
})

app.get("/urls/new", (req, res) => {
  res.render("urls_new");
})

app.get('/urls/:id', (req, res) => {
  res.render('urls_show', { shortURL: req.params.id })
})

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL]
  res.redirect(longURL);
})

app.listen(PORT, () => console.log(`App listening on port ${PORT}`))

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}
