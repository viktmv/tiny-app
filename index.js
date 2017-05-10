const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

let PORT  = process.env.PORT || 8080
let urlDB = {
  'b2xVn2': 'http://www.lighthouselabs.ca',
  '9sm5xK': 'http://www.google.com'
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
  res.render('urls_index', { urls: urlDB, username: req.cookies["username"] })
})

// --> login
app.post('/login', (req, res) => {
  res.cookie('username', req.body.username,
    { expires: new Date(Date.now() + 900000 )}
  )
  res.redirect(`http://localhost:8080/urls`)
})

app.post('/logout', (req, res) => {
  res.clearCookie('username')
  res.redirect(`http://localhost:8080/urls`)
})

// --> Add new address in DB
app.post('/urls', (req, res) => {
  let shortURL = generateRandomString()
  urlDB[shortURL] = req.body.longURL
  res.redirect(`http://localhost:8080/urls/${shortURL}`)
})

// --> Delete address from DB
app.post('/urls/:id/delete', (req, res) => {
  console.log(req.params.id + 'deleted')
  delete urlDB[req.params.id]
  res.redirect('/urls')
})

// --> Update address in DB
app.post('/urls/:id/update', (req, res) => {
  console.log(req.params.id + ' updated')
  urlDB[req.params.id] = req.body.longURL
  res.redirect('/urls')
})

// --> Render page to add new address
app.get('/urls/new', (req, res) => {
  res.render('urls_new', { username: req.cookies["username"] })
})

// --> Render the update page
app.get('/urls/:id', (req, res) => {
  res.render('urls_show', { shortURL: req.params.id, username: req.cookies["username"] })
})

// --> Redirection to long URLs
app.get('/u/:shortURL', (req, res) => {
  let longURL = urlDB[req.params.shortURL]
  res.redirect(longURL)
})

app.listen(PORT, () => console.log(`App listening on port ${PORT}`))

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8)
}
