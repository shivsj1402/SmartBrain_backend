const express = require('express');
const bcrypt = require('bcryptjs');
var cors = require('cors')

const Clarifai = require('clarifai');

const Capp = new Clarifai.App({
    apiKey: '675456be9868458fba9b135ee3503583'
   });

const knex = require('knex')
var salt = bcrypt.genSaltSync(10);

const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'postgres',
      password : 'shivsj1402',
      database : 'smart_brain'
    }
  });

const app = express();
app.use(express.json());
app.use(cors());

app.post('/signin', (req, res)=>{
    const {email,password } = req.body;
    if(!email || !password ){
        return res.status(400).json('Incorrect form data')
    }

    db.select('email','hash').from('login')
    .where('email',email).then(users=>{
    const isValid =  bcrypt.compareSync(password, users[0].hash);
    if(isValid){
       return db.select('*').from('users').where('email', email)
        .then(data =>{
            res.json(data[0]);
        })
        .catch(err=>{ res.status(400).json('unable to login')})
    }else{
        res.status(400).json('wrong credentials')
    }
    })
    .catch(err=>{ res.status(400).json('wrong credentials')})
})

app.post('/register', (req, res)=>{
const {email,password, name } = req.body;
if(!email || !password || !name ){
    return res.status(400).json('Incorrect form data')
}

var hash = bcrypt.hashSync(password, salt);
    db.transaction(trx=>{
        trx.insert({
            hash : hash,
            email : email, 
        }).into('login')
        .returning('email')
        .then(loginemail =>{
            return trx('users')
            .returning('*')
            .insert({
                name : name,
                email : loginemail[0],
                joined : new Date()
            }).then(user =>{
                res.json(user[0]);
            })
         }).then(trx.commit)
         .catch(trx.rollback)
    })
    .catch(err=>{ res.status(400).json('unable to register')})
})

app.get('/profile/:id', (req, res)=>{
    const { id } = req.params;
    db.select('*').from('users').where('id',id).then(user=>{
        if(user.length){
            res.json(user[0]);
        }else{
            res.status(400).json('no such user');
        }
    }).catch(err=>{ res.status(400).json('error getting user')})
})


app.post('/imageClarafai',(req,res)=>{

    Capp.models.predict(
        Clarifai.FACE_DETECT_MODEL,
        req.body.input)
        .then(data =>{
            res.json(data)
        })
        .catch(err=>{ res.status(400).json('Clarafai error')})

})


app.put('/image',(req, res)=>{
    const { id } = req.body;

    db('users').where('id',id)
    .increment('entries',1)
    .returning('entries')
    .then(entries=>{
        res.json(entries[0]);
    }).catch(err=>{ res.status(400).json('unable to get entries')})

})

app.listen(process.env.PORT || 3000,()=>{
    console.log(`app is running ${process.env.PORT}`);
});