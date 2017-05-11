const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const cookieSession = require('cookie-session')

let PORT  = process.env.PORT || 8080

let urlDB = {
  'user3RandomID': {
    'b2xVn2': 'http://www.lighthouselabs.ca',
    '9sm5xK': 'http://www.google.com'
  }
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
    },
    'user3RandomID' : {
        id: "user3RandomID",
        email: "user3@example.com",
        password: "funk"
    }
  }

// Initial app settings
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(__dirname + '/public'))
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}))

// ---> INDEX page
app.get('/', (req, res) => {
  res.end('Welcome!\n')
})

// --> /urls
app.get('/urls', (req,res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''
  let templateVars = {
    urls: urlDB[id],
    user: user
  }
  res.render('urls_index', templateVars)
})

// --> register page
app.get('/register', (req,res) => {
  let user = loggedUser(req)
  let templateVars = {
    urls: urlDB,
    user
  }
  res.render('urls_register', templateVars)
})

// --> handle register req
app.post('/register', (req,res) => {
  if (getUserID(req, usersDB)) return res.sendStatus(400)

  let user_id = generateRandomString()
  urlDB[user_id] = {}

  usersDB[user_id] = {
    id: user_id,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 10)
    }
  req.session.user_id = { user_id }
  res.status(301).redirect('/urls')
})

// --> login
app.post('/login', (req, res) => {
  let user = getUserID(req, usersDB)
  let id = user ? user.id : ''

  if (!user) return res.status(403).end('No user found')

  if (!bcrypt.compareSync(req.body.password, usersDB[user].password)) return res.status(403).end('password does not match')

  let templateVars = {
    urls: urlDB,
    user: usersDB[user].id
  }
  req.session.user_id =  { user_id: usersDB[user].id }
  res.status(301).redirect('/urls')
})

// --> login page
app.get('/login', (req, res) => {
  let user = loggedUser(req)
  let templateVars = {
    urls: urlDB,
    user
  }
  res.render(`urls_login`, templateVars)
})

// --> logout
app.post('/logout', (req, res) => {
  req.session = null
  res.clearCookie('user_id')
  res.status(301).redirect(`http://localhost:8080/urls`)
})

// --> Add new address in DB
app.post('/urls', (req, res) => {
  let user = loggedUser(req)
  if (!user) return res.status(301).redirect('/login')

  let shortURL = generateRandomString()
  urlDB[user.id][shortURL] = req.body.longURL
  res.status(301).redirect(`http://localhost:8080/urls/${shortURL}`)
})

// --> Delete address from DB
app.post('/urls/:id/delete', (req, res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''
  if (!urlDB[id]) return res.sendStatus(403)
  if (!urlDB[id][req.params.id]) return res.sendStatus(404)
  console.log(req.params.id, 'deleted')
  delete urlDB[id][req.params.id]
  res.status(301).redirect('/urls')
})

// --> Update address in DB
app.post('/urls/:id/update', (req, res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''

  if (!urlDB[id]) return res.sendStatus(403)
  if (!urlDB[id][req.params.id]) return res.sendStatus(404)
  console.log(req.params.id, 'updated')
  urlDB[id][req.params.id] = req.body.longURL
  res.status(301).redirect('/urls')
})

// --> Render page to add new address
app.get('/urls/new', (req, res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''

  if (!user) return res.status(301).redirect('/login')
  let templateVars = {
    urls: urlDB[id],
    user
  }
  res.render('urls_new', templateVars)
})

// --> Render the update page
app.get('/urls/:id', (req, res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''
  let templateVars = {
    user,
    shortURL: req.params.id
  }
  if (!user) return res.status(301).redirect('/login')
  if (!urlDB[id][req.params.id]) return res.sendStatus(403)
  res.render('urls_show', templateVars)
})

// --> Redirection to long URLs
app.get('/u/:shortURL', (req, res) => {
  let longURL;
  for (let user of Object.keys(urlDB)) {
    if (urlDB[user].hasOwnProperty(req.params.shortURL))
      longURL = urlDB[user][req.params.shortURL]
  }

  res.status(301).redirect(longURL)
})

app.listen(PORT, () => console.log(`App listening on port ${PORT}`))

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8)
}

function emailInDB(req, DB) {
  let inDB = false
  for (let key of Object.keys(DB)) {
    if(DB[key].email == req.body.email)
      inDB = true
  }
  return inDB
}

function getUserID(req, DB) {
  let userID = ''
  for (let key of Object.keys(usersDB)) {
    if(usersDB[key].email == req.body.email)
      userID = usersDB[key].id
  }
  return userID
}

function loggedUser(req) {
  return req.session['user_id'] ? usersDB[req.session["user_id"].user_id] : ''
}
