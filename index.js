const express = require('express')
const app = express()
const bodyParser = require("body-parser");


let PORT  = process.env.PORT || 8080

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/views'))

let urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
}


// ---> INDEX
app.get('/', (req, res) => {
  res.end('Welcome!\n')
})

// --> /urls
app.get('/urls', (req,res) => {
  res.render('urls_index', { urls: urlDatabase })
})

app.post('/urls', (req, res) => {
  let shortURL = generateRandomString()
  urlDatabase[shortURL] = req.body.longURL
  res.redirect(`http://localhost:8080/urls/${shortURL}`)
})

app.post('/urls/:id/delete', (req, res) => {
  console.log(req.params.id + 'deleted')
  delete urlDatabase[req.params.id]
  res.redirect('/urls')
})

app.post('/urls/:id/update', (req, res) => {
  console.log(req.params.id + ' updated')
  urlDatabase[req.params.id] = req.body.longURL
  res.redirect('/urls')
})

// --> /urls/...
app.get("/urls/new", (req, res) => {
  res.render("urls_new");
})

app.get('/urls/:id', (req, res) => {
  res.render('urls_show', { shortURL: req.params.id })
})

// --> /u/... <--- Redirection to long URLs
app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL]
  res.redirect(longURL);
})

app.listen(PORT, () => console.log(`App listening on port ${PORT}`))

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}
