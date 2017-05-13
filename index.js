'use strict'

const bcrypt = require('bcrypt')
const express = require('express')
const bodyParser = require('body-parser')
const cookieSession = require('cookie-session')
const methodOverride = require('method-override')

const app = express()
const PORT = process.env.PORT || 8080

const urlDB = {
  // sample ulrs
  'user3RandomID': {
    'b2xVn2': {
      url: 'http://www.lighthouselabs.ca',
      totalVisits: 0,
      uniqueVisits: 0,
      visitors: {}
    },
    '9sm5xK': {
      url: 'http://www.google.com',
      totalVisits: 0,
      uniqueVisits: 0,
      visitors: {}
    }
  }
}

const usersDB = {
  // template user - do not try to log in, password not hashed
  'user3RandomID': {
    id: 'user3RandomID',
    email: 'user3@example.com',
    password: 'funk'
  }
}

// helper functions
function generateRandomString () {
  return Math.random().toString(36).substring(2, 8)
}
  // Get userID from login request if such user is present in DB
function getUserID (req, DB) {
  let userID = ''
  for (let key of Object.keys(DB)) {
    if (DB[key].email === req.body.email) { userID = DB[key].id }
  }
  return userID
}

  // Get userID if user is logged in,
  // if not - return empty string
function loggedUser (req) {
  return req.session['user_id']
        ? usersDB[req.session['user_id'].user_id]
        : ''
}

// Initial app settings
app.set('view engine', 'ejs')
app.use(express.static(`${__dirname}/public`))
app.use(bodyParser.urlencoded({extended: true}))
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}))
app.use(methodOverride('_method'))

// ---> INDEX page render
app.get('/', (req, res) => {
  loggedUser(req)
    ? res.status(301).redirect('/urls')
    : res.status(301).redirect('/login')
})

// --> /urls page render
app.get('/urls', (req, res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''
  let templateVars = {
    urls: urlDB[id],
    user: user
  }
  res.render('urls_index', templateVars)
})

// --> register page render
app.get('/register', (req, res) => {
  let user = loggedUser(req)
  let templateVars = {
    urls: urlDB,
    user
  }
  res.render('urls_register', templateVars)
})

// --> handle user registration
app.post('/register', (req, res) => {
  if (getUserID(req, usersDB)) {
    return res.status(400).send('Sorry, this email is already in use')
  }

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

// --> handle user login
app.post('/login', (req, res) => {
  let user = getUserID(req, usersDB)

  if (!user) return res.status(403).send('No user found')

  if (!bcrypt.compareSync(req.body.password, usersDB[user].password)) {
    return res.status(403).send('Password is incorrect')
  }

  req.session.user_id = { user_id: usersDB[user].id }
  res.status(301).redirect('/urls')
})

// --> login page render
app.get('/login', (req, res) => {
  let user = loggedUser(req)
  let templateVars = {
    urls: urlDB,
    user
  }
  res.render('urls_login', templateVars)
})

// --> handle user logout
app.post('/logout', (req, res) => {
  req.session = null
  res.clearCookie('user_id')
  res.status(301).redirect('http://localhost:8080/urls')
})

// --> add new address to DB
app.post('/urls', (req, res) => {
  let user = loggedUser(req)
  if (!user) return res.status(301).redirect('/login')

  // simple small check for http/https prefix
  let {longURL} = req.body
  if (!longURL.match(/^https?:\/\//gim)) {
    longURL = `https://${longURL}`
  }

  let shortURL = generateRandomString()
  urlDB[user.id][shortURL] = {
    url: longURL,
    totalVisits: 0,
    uniqueVisits: 0,
    visitors: {}
  }
  res.status(301).redirect(`http://localhost:8080/urls/${shortURL}`)
})

// --> delete address from DB
app.delete('/urls/:id/delete', (req, res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''
  let shortURL = req.params.id

  if (!urlDB[id]) return res.sendStatus(403)
  if (!urlDB[id][shortURL]) return res.sendStatus(404)

  delete urlDB[id][shortURL]
  res.status(301).redirect('/urls')
})

// --> update address in DB
app.put('/urls/:id/update', (req, res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''
  let shortURL = req.params.id

  if (!urlDB[id]) return res.sendStatus(403)
  if (!urlDB[id][shortURL]) return res.sendStatus(404)

  // check for http/https in the updated url
  let {longURL} = req.body
  if (!longURL.match(/^https?:\/\//gim)) {
    longURL = `https://${longURL}`
  }
  urlDB[id][shortURL] = {
    url: longURL,
    totalVisits: 0,
    uniqueVisits: 0,
    visitors: {}
  }
  res.status(301).redirect('/urls')
})

// --> render page to add new address
app.get('/urls/new', (req, res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''

  if (!user) return res.status(301).redirect('/login')
  let templateVars = {
    urls: urlDB[id],
    user: user
  }
  res.render('urls_new', templateVars)
})

// --> render the update page
app.get('/urls/:id', (req, res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''
  let shortURL = req.params.id

  if (!user) return res.status(301).redirect('/login')
  if (!urlDB[id][shortURL]) return res.sendStatus(403)
  let templateVars = {
    user,
    url: { long: urlDB[id][shortURL], short: shortURL }
  }
  res.render('urls_show', templateVars)
})

// --> redirection handler
app.get('/u/:shortURL', (req, res) => {
  let longURL, user, exist
  let {shortURL} = req.params

  // Check if url exits in DB
  // if it does - get the long url form DB and increment total visits
  for (let key of Object.keys(urlDB)) {
    if (urlDB[key].hasOwnProperty(shortURL)) {
      exist = true
      user = key
      longURL = urlDB[key][shortURL].url
      urlDB[key][shortURL].totalVisits++
    }
  }
  if (!exist) return res.sendStatus(404)
  // Check for uniqueness of visitor and set up a cookie
  if (!req.session[shortURL]) {
    urlDB[user][shortURL].uniqueVisits++
    urlDB[user][shortURL].visitors[`${generateRandomString()}-id`] = new Date()
    req.session[shortURL] = true
  }
  // Redirect
  res.status(301).redirect(longURL)
})

app.listen(PORT, () => console.log(`App listening on port ${PORT}`))
