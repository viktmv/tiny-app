const bcrypt = require('bcrypt')
const express = require('express')
const bodyParser = require('body-parser')
const cookieSession = require('cookie-session')
const methodOverride = require('method-override')

const app = express()

let PORT  = process.env.PORT || 8080

// let urlDB = {
//   'user3RandomID': {
//     'b2xVn2': ['http://www.lighthouselabs.ca', 0, 0],
//     '9sm5xK': ['http://www.google.com', 0, 0]
//   }
// }
let urlDB = {
  'user3RandomID': {
    'b2xVn2': {
      url: 'http://www.lighthouselabs.ca',
      totalVisits: 0,
      uniqueVisits: 0,
      visitors: {
        // visitorID : timestamp
      }
    },
    '9sm5xK': {
      url: 'http://www.google.com',
      totalVisits: 0,
      uniqueVisits: 0,
      visitors: {}
    }
  }
}

let usersDB = {
  'userRandomID': {
    id: 'userRandomID',
    email: 'user@example.com',
    password: 'purple-monkey-dinosaur'
  },
  'user2RandomID': {
    id: 'user2RandomID',
    email: 'user2@example.com',
    password: 'dishwasher-funk'
  },
  'user3RandomID' : {
    id: 'user3RandomID',
    email: 'user3@example.com',
    password: 'funk'
  }
}

let uniqueVisitors = 0

// Initial app settings
app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/public'))
app.use(bodyParser.urlencoded({extended: true}))
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}))
app.use(methodOverride('_method'))

// ---> INDEX page render
app.get('/', (req, res) => {
  res.end('Welcome!\n')
})

// --> /urls page render
app.get('/urls', (req,res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''
  let templateVars = {
    urls: urlDB[id],
    user: user
  }
  res.render('urls_index', templateVars)
})

// --> register page render
app.get('/register', (req,res) => {
  let user = loggedUser(req)
  let templateVars = {
    urls: urlDB,
    user
  }
  res.render('urls_register', templateVars)
})

// --> handle user registration
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

// --> handle user login
app.post('/login', (req, res) => {
  let user = getUserID(req, usersDB)

  if (!user) return res.status(403).end('No user found')

  if (!bcrypt.compareSync(req.body.password, usersDB[user].password)) return res.status(403).end('password does not match')

  req.session.user_id =  { user_id: usersDB[user].id }
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

// --> Add new address to DB
app.post('/urls', (req, res) => {
  let user = loggedUser(req)
  if (!user) return res.status(301).redirect('/login')

  let shortURL = generateRandomString()
  urlDB[user.id][shortURL] =  {
    url: req.body.longURL,
    totalVisits: 0,
    uniqueVisits: 0,
    visitors: {}
  }
  res.status(301).redirect(`http://localhost:8080/urls/${shortURL}`)
})

// --> Delete address from DB
app.delete('/urls/:id/delete', (req, res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''
  if (!urlDB[id]) return res.sendStatus(403)
  if (!urlDB[id][req.params.id]) return res.sendStatus(404)
  console.log(req.params.id, 'deleted')
  delete urlDB[id][req.params.id]
  res.status(301).redirect('/urls')
})

// --> Update address in DB
app.put('/urls/:id/update', (req, res) => {
  let user = loggedUser(req)
  let id = user ? user.id : ''

  if (!urlDB[id]) return res.sendStatus(403)
  if (!urlDB[id][req.params.id]) return res.sendStatus(404)
  console.log(req.params.id, 'updated')
  urlDB[id][req.params.id] = {
    url: req.body.longURL,
    totalVisits: 0,
    uniqueVisits: 0,
    visitors: {}
  }
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
  if (!user) return res.status(301).redirect('/login')
  if (!urlDB[id][req.params.id]) return res.sendStatus(403)
  let templateVars = {
    user,
    url: { long: urlDB[id][req.params.id], short: req.params.id}
  }
  res.render('urls_show', templateVars)
})

// --> Redirection to long URLs
app.get('/u/:shortURL', (req, res) => {
  let longURL, user, exist
  let {shortURL} = req.params
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
  console.log(urlDB[user][shortURL])
  // Redirect
  res.status(301).redirect(longURL)
})

app.listen(PORT, () => console.log(`App listening on port ${PORT}`))

// Helper functions
function generateRandomString() {
  return Math.random().toString(36).substring(2, 8)
}

function getUserID(req, DB) {
  let userID = ''
  for (let key of Object.keys(DB)) {
    if(DB[key].email == req.body.email)
      userID = DB[key].id
  }
  return userID
}

function loggedUser(req) {
  return req.session['user_id']
        ? usersDB[req.session['user_id'].user_id]
        : ''
}
