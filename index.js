const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

let PORT  = process.env.PORT || 8080
let urlDB = {
  'b2xVn2': 'http://www.lighthouselabs.ca',
  '9sm5xK': 'http://www.google.com'
}
let usersDB = {
    "userRandomID": {
      id: "userRandomID",
      email: "user@example.com",
      password: "purple-monkey-dinosaur"
    },
    "user2RandomID": {
        id: "user2RandomID",
        email: "user2@example.com",
        password: "dishwasher-funk"
      }
  }

// Initial app settings
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(__dirname + '/public'))
app.use(cookieParser())

// ---> INDEX page
app.get('/', (req, res) => {
  res.end('Welcome!\n')
})

// --> /urls
app.get('/urls', (req,res) => {
  let user = req.cookies['user_id'] ? usersDB[req.cookies["user_id"].user_id] : ''
  let templateVars = {
    urls: urlDB,
    user: user
  }
  res.render('urls_index', templateVars)
})

// --> register page
app.get('/register', (req,res) => {
  let user = req.cookies['user_id'] ? usersDB[req.cookies["user_id"].user_id] : ''
  let templateVars = {
    urls: urlDB,
    user
  }
  res.render('urls_register', templateVars)
})

// --> handle register req
app.post('/register', (req,res) => {
  let inDB = false
  for (let key of Object.keys(usersDB)) {
    if(usersDB[key].email == req.body.email)
      inDB = true
  }
  if (inDB) return res.status(400).end('Reponded with 400')

  let user_id = generateRandomString()
  usersDB[user_id] = {
    id: user_id,
    email: req.body.email,
    password: req.body.password
    }
  res.cookie('user_id', { user_id })
  res.status(301).redirect('/urls')
})

// --> login
app.post('/login', (req, res) => {
  let userID = ''
  for (let key of Object.keys(usersDB)) {
    if(usersDB[key].email == req.body.email)
      userID = usersDB[key].id
  }
  if (!userID) return res.status(403).end('No user found')

  if (!(usersDB[userID].password == req.body.password)) return res.status(403).end('password does not match')

  let templateVars = {
    urls: urlDB,
    user: usersDB[userID].id
  }
  res.cookie('user_id', { user_id: usersDB[userID].id })
  res.status(301).redirect('/urls')
})

// --> login page
app.get('/login', (req, res) => {
  let user = req.cookies['user_id'] ? usersDB[req.cookies["user_id"].user_id] : ''
  let templateVars = {
    urls: urlDB,
    user
  }
  res.render(`urls_login`, templateVars)
})

// --> logout
app.post('/logout', (req, res) => {
  res.clearCookie('user_id')
  res.status(301).redirect(`http://localhost:8080/urls`)
})

// --> Add new address in DB
app.post('/urls', (req, res) => {
  let shortURL = generateRandomString()
  urlDB[shortURL] = req.body.longURL
  res.status(301).redirect(`http://localhost:8080/urls/${shortURL}`)
})

// --> Delete address from DB
app.post('/urls/:id/delete', (req, res) => {
  console.log(req.params.id + 'deleted')
  delete urlDB[req.params.id]
  res.status(301).redirect('/urls')
})

// --> Update address in DB
app.post('/urls/:id/update', (req, res) => {
  console.log(req.params.id + ' updated')
  urlDB[req.params.id] = req.body.longURL
  res.status(301).redirect('/urls')
})

// --> Render page to add new address
app.get('/urls/new', (req, res) => {
  let user = req.cookies['user_id'] ? usersDB[req.cookies["user_id"].user_id] : ''
  let templateVars = {
    urls: urlDB,
    user
  }
  res.render('urls_new', templateVars)
})

// --> Render the update page
app.get('/urls/:id', (req, res) => {
  let user = req.cookies['user_id'] ? usersDB[req.cookies["user_id"].user_id] : ''
  let templateVars = {
    user,
    shortURL: req.params.id
  }
  res.render('urls_show', templateVars)
})

// --> Redirection to long URLs
app.get('/u/:shortURL', (req, res) => {
  let longURL = urlDB[req.params.shortURL]
  res.status(301).redirect(longURL)
})

app.listen(PORT, () => console.log(`App listening on port ${PORT}`))

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8)
}
