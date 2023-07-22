var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var database = require('./database');
const morgan = require('morgan');
const { error } = require('console');
const multer = require('multer');

var app = express();

app.use(session({
  secret: 'akhshay',
  resave: true,
  saveUninitialized: true
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'))

app.get('/', function (req, res, next) {
  var requests, users;
  var query = `SELECT * FROM user_login`;
  database.query(query, (error, data) => {
    if (error) console.log(error);
    else {
      users = Array.from(data);
      if (req.session.user_id) {
        var query = `SELECT * FROM friends WHERE fr_id=?`;
        database.query(query, [req.session.user_id], (error, data) => {
          if (error) console.log(error);
          else {
              requests = Array.from(data)
              // var query= `DELETE FROM friends WHERE status=? AND fr_id=?`;
              // database.query(query, ["d", req.session.user_id],(error, data)=>{
              //   if(error) console.log(error);
              //   else{
              //   }
              // })
              res.render("home", { title: 'Home', data: users, requests: requests, session: req.session })
          }
        })
      }else{
        res.render("home", { title: 'Home', data: users, requests: requests, session: req.session })
      }
    }
  })
});

app.get("/acceptRequest/:id", (req, res) => {
  var id = req.params.id;
  var query = `UPDATE friends SET status=? WHERE user_id=? AND fr_id=?`;
  database.query(query, ["a", id, req.session.user_id], (error, data) => {
    if (error) console.log(error);
    else {
      res.redirect("/")
    }
  })
})

app.get("/declineRequest/:id", (req, res) => {
  var id = req.params.id;
  var query = `UPDATE friends SET status=? WHERE user_id=? AND fr_id=?`;
  database.query(query, ["d", id, req.session.user_id], (error, data) => {
    if (error) console.log(error);
    else {
      res.redirect("/")
    }
  })
})

app.get('/about', function (req, res, next) {
  res.render('about', { title: 'About', session: req.session });
});

const addQuizName = async (attempts) => {
  attempts.forEach((attempt) => {
    var query = `SELECT quiz_name FROM quizlist WHERE quiz_id=?`
    database.query(query, [attempt.quiz_id], (error, data) => {
      if (error) console.log(error);
      else {
        // console.log(data)
        attempt.quiz_name = data[0].quiz_name;
      }
    })
  })
  return attempts;
}

app.get('/view/:id', (req, res) => {
  var id = req.params.id;
  var attempts, user, frlist, isFriend=false, isPending=false, temp,status;
  if (!id) {
    res.redirect('/login');
  }
  var query = `SELECT * FROM user_login WHERE user_id=?`;
  database.query(query, [id], (error, data) => {
    if (error) console.log(error);
    else {
      user = data[0]
      var query = `SELECT * FROM quizlist WHERE user_id=?`;
      database.query(query, [id], (error, response) => {
        if (error) console.log(error);
        else {
          var query = `SELECT * FROM user_scores WHERE user_id=?`
          database.query(query, [id], async (error, data) => {
            if (error) console.log(error);
            else {
              attempts = await addQuizName(Array.from(data))
              var query = `SELECT * FROM friends WHERE user_id=?`;
              database.query(query, [req.session.user_id], (error, data) => {
                if (error) console.log(error);
                else {
                  if (data) {
                    frlist = Array.from(data)
                    // console.log(frlist);
                    if (id != req.session.user_id) {
                      temp =  frlist.find((user) =>  user.fr_id == id )
                      // console.log(temp);
                    }
                  }
                  res.render('profile', { title: 'Profile', user: user, quizlist: Array.from(response), attempts: attempts, isPending, isFriend,temp, friends: frlist, session: req.session });
                }
              })
            }
          })
        }
      })
    }
  })
})

const upload = multer({
  dest: 'public/images',
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/png'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG, and PNG files are allowed.'));
    }
  },
});

app.post('/upload', upload.single('image'), async (req, res) => {
  const imagePath = `${req.file.filename}`;
  const query = 'UPDATE user_login SET image = ? WHERE user_id= ?';
  database.query(query, [imagePath, req.session.user_id], (error, data) => {
    if (error) console.log(error);
    else res.redirect(`/view/${req.session.user_id}`);
  });
});

app.get('/public/image/:path', (req, res) => {
  res.sendFile(`../public/images/${req.params.path}`)
})

app.get('/create', (req, res) => {
  if (!req.session.user_id) {
    // console.log(req.session)
    res.redirect('/login')
  } else {
    res.render('create', { title: 'Create', session: req.session })
  }
})

app.post('/create', (req, res) => {
  const { quiz_name, quiz_desc, type } = req.body
  if (quiz_name) {
    var id = req.session.user_id;
    var query = `INSERT INTO quizlist (user_id, quiz_name, quiz_desc, type) values (?,?,?,?) `;
    database.query(query, [id, quiz_name, quiz_desc, type], (error, dat) => {
      if (error) console.log(error);
      else {
        var query = `SELECT quiz_id FROM quizlist WHERE quiz_name=? AND user_id=?`;
        database.query(query, [quiz_name, req.session.user_id], (error, data) => {
          if (error) console.log(error)
          // console.log(data)
          res.redirect(`/displayQuiz/${data[0].quiz_id}`);
        })
      }
    })
  } else {
    res.redirect('/create');
  }
})

app.get('/displayQuiz/:id', (req, res) => {
  var quiz_id = req.params.id;
  var query = `SELECT * FROM qs WHERE quiz_id=?`;
  database.query(query, [quiz_id], (error, data) => {
    if (error) console.log(error);
    else {
      var query = `SELECT * FROM quizlist WHERE quiz_id=? `;
      database.query(query, [quiz_id], (err, result) => {
        if (err) console.log(err);
        res.render('displayQuiz', { title: 'Display Quiz', session: req.session, data: Array.from(data), quiz: result[0] });
      })
    }
  })
})

app.get('/addQ/:id', (req, res) => {
  var quiz_id = req.params.id;
  res.render('addQ', { title: 'Add Q', session: req.session, quiz_id: quiz_id });
})

app.post('/addQ/:id', (req, res) => {
  const { q, a } = req.body;
  var id = req.params.id;
  if (q && a) {
    var query = `INSERT INTO qs (quiz_id, q, answer) VALUES (?,?,?)`;
    database.query(query, [id, q, a], (error, data) => {
      if (error) console.log(error);
      else {
        res.redirect(`/displayQuiz/${req.params.id}`);
      }
    })
  }
})

app.get("/requestFriend/:id", (req, res) => {
  var fr_id = req.params.id;
  var user_id = req.session.user_id;
  var status = "p";
  var query = `INSERT INTO friends VALUES (?,?,?)`;
  database.query(query, [user_id, fr_id, status], (error, data) => {
    if (error) console.log(error);
    else {
      res.redirect(`/view/${fr_id}`)
    }
  })

})

app.get('/attemptQuiz/:id', (req, res) => {
  var quiz_id = req.params.id;
  var query = `SELECT * FROM user_scores WHERE user_id=? AND quiz_id=?`;
  database.query(query, [req.session.user_id, quiz_id], (error, data) => {
    if (error) console.log(error)
    else {
      if (!data[0]) {
        var query = `SELECT * FROM qs WHERE quiz_id=?`;
        database.query(query, [quiz_id], (error, data) => {
          if (error) console.log(error);
          else {
            var result = shuffle(Array.from(data))
            res.render('attemptQuiz', { title: 'Attempt', data: result, quiz_id: quiz_id, session: req.session });
          }
        })
      } else {
        res.redirect(`/report/${quiz_id}`);
      }
    }
  })
})

const shuffle = (arr) => {
  for (let i = 0; i < arr.length; i++) {
    var j = Math.floor(Math.random(arr.length - i - 1));
    let temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr
}

app.post('/attempQuiz/:id', (req, res) => {
  var quiz_id = req.params.id;
  let id = req.session.user_id;
  for (let ans in req.body) {
    var query = `INSERT INTO response VALUES(?, ?, ?, ?)`;
    database.query(query, [parseInt(quiz_id), parseInt(ans), id, req.body[ans]], (error, data) => {
      if (error) console.log(error)
    })
  }
  res.redirect(`/report/${quiz_id}`)
})

const allSpacesRemoved = (str) => { return (str.replaceAll(' ', '')).toLowerCase() };

function wrap() {
  return new Promise((resolve) => setTimeout(resolve, 2000));
}

const calculateScore = async (reels, reals) => {
  // console.log(reels, reals)
  var sum = 0
  for (let i = 0; i < reels.length; i++) {
    let temp = reals.find((user) => user.q_id == reels[i].q_id);
    if (await allSpacesRemoved(temp.answer) == await allSpacesRemoved(reels[i].answer)) sum++;
  }
  return sum;
}

app.get('/report/:id', async (req, res) => {
  var quiz_id = req.params.id;
  var reels, reals, createdBy, score, cid;
  var query = `SELECT * FROM response WHERE user_id=? AND quiz_id=?`;
  database.query(query, [req.session.user_id, quiz_id], (error, data) => {
    if (error) console.log(error);
    else {
      reels = Array.from(data);
      var query = `SELECT user_id from quizlist WHERE quiz_id= ?`;
      database.query(query, [quiz_id], (error, data) => {
        if (error) console.log(error)
        else {
          cid = data[0].user_id;
          var query = `SELECT user_name FROM user_login WHERE user_id=?`;
          database.query(query, [cid], (error, data) => {
            if (error) console.log(error)
            else {
              createdBy = data[0].user_name;
              var query = `SELECT * FROM qs WHERE quiz_id=?`;
              database.query(query, [quiz_id], async (error, data) => {
                if (error) console.log(error);
                else {
                  reals = Array.from(data);
                  var query = `SELECT score FROM user_scores WHERE user_id=? AND quiz_id=?`;
                  database.query(query, [req.session.user_id, quiz_id], async (error, data) => {
                    if (error) console.log(error);
                    else {
                      if (data[0]) {
                        // console.log(data[0]);
                        score = data[0].score;
                        res.render('report', { title: "Report", ans: reels, act: reals, score: score, doneBy: createdBy, session: req.session });
                      }
                      else {
                        score = await calculateScore(reels, reals);
                        // console.log(score)
                        var query = `INSERT INTO user_scores VALUES(?, ?, ?, 0 ,?)`;
                        database.query(query, [req.session.user_id, quiz_id, score, req.query.body], (error, data) => {
                          if (error) console.log(error);
                          else res.render('report', { title: "Report", ans: reels, act: reals, score: score, doneBy: createdBy, session: req.session });
                        })
                      }
                    }
                  })
                }
              })
            }
          })
        }
      })
    }
  })
})

app.get('/signup', function (req, res) {
  res.render('signup', { title: 'Sign Up', msg: ' ', session: req.session });
});

app.post('/signup', function (req, res) {
  var query = `SELECT MAX(user_id) from user_login`
  database.query(query, function (error, data) {
    var x = parseInt(Object.values(data[0])[0]);
  })
  var user_email_address = req.body.user_email_address;
  var user_password = req.body.user_password;
  var re_password = req.body.re_password;
  if (user_email_address && user_password && re_password) {
    if (user_password == re_password) {
      query = `SELECT * FROM user_login WHERE user_email = "${user_email_address}" `;
      database.query(query, function (error, data) {
        if (data.length == 0) {
          query = `INSERT INTO user_login (user_email, user_password, user_name) VALUES ('${user_email_address}',${user_password},'${req.body.user_name} ')`;
          database.query(query)
          query = `SELECT user_id FROM user_login WHERE user_email = "${user_email_address}"`;
          database.query(query, function (error, data) {
            // console.log(data[0]['user_id'])
            req.session.user_id = data[0]['user_id'];
          })
          res.redirect("/");
        } else {
          res.render('signup', { title: 'Sign Up', msg: 'Email Already Exists <a href="/login">Login</a> ', session: req.session });
        }
      })
    } else {
      res.render('signup', { title: 'Sign Up', msg: 'Incorrect Password ', session: req.session });
    }
  } else {
    res.render('signup', { title: 'Sign Up', msg: 'Enter Email and Password', session: req.session });
  }
})

app.get('/login', function (req, res, next) {
  res.render('login', { title: 'Login', msg: ' ', session: req.session });
});

app.post('/login', function (req, res, next) {
  var user_email_address = req.body.user_email_address;
  var user_password = req.body.user_password;
  if (user_email_address && user_password) {
    query = `SELECT * FROM user_login WHERE user_email = "${user_email_address}"`;
    database.query(query, function (error, data) {
      if (data.length > 0) {
        for (var count = 0; count < data.length; count++) {
          if (data[count].user_password == user_password) {
            req.session.user_id = data[count].user_id;
            res.redirect("/");
          } else {
            res.render('login', { title: 'Login', session: req.session, msg: 'Incorrect password ', session: req.session });
          }
        }
      } else {
        res.render('login', { title: 'Login', session: req.session, msg: 'Incorrect Email', session: req.session });
      }
      res.end();
    });
  } else {
    res.render('login', { title: 'Login', session: req.session, msg: 'Enter Email Id and Password', session: req.session });
    res.end();
  }
});

app.get('/logout', function (req, res, next) {
  req.session.destroy();
  res.redirect("/");
});

// catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   next(createError(404));
// });

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', { title: 'Error', session: req.session });
});

app.listen(3000, function (err) {
  if (err) console.log("Error in server setup")
  console.log("Server listening on Port");
})

module.exports = app;
