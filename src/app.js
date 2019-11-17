var express = require("express");
var cors = require('cors');
var bodyParser = require("body-parser");
var session = require('express-session');
const {Pool,Client} = require('pg');
var AWS = require('aws-sdk');
var jwt   = require('jsonwebtoken');
global.fetch = require('node-fetch');
//var request = require('request');
var AmazonCognitoIdentity = require('amazon-cognito-identity-js');
//const Video = require("./models/


const app = express();
app.use(cors());
app.use(bodyParser.json());

//app.use(session({secret: 'sdcc'}));

/*******************COGNITO********************/



var CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;

var poolData = { UserPoolId : 'us-east-1_WLaeGxYQd',
    ClientId : '4d76fpsdlldt729bkjufbj7gcb'
};

var userPool = new CognitoUserPool(poolData);
var idToken,accessToken;


/*******************************************************/


function findFirstDiffPos(a, b)
{
    var shorterLength = Math.min(a.length, b.length);

    for (var i = 0; i < shorterLength; i++)
    {
        if (a[i] !== b[i]) return i;
    }

    if (a.length !== b.length) return shorterLength;

    return -1;
}


const pool = new Pool({
    user:"postgres",
    host:"sdccrds.cv1l7z2qnpv7.us-east-1.rds.amazonaws.com",
    //host:"sdccdb.cq0cmm7hsjuw.eu-central-1.rds.amazonaws.com",
    database:"sdcc_rds",
    password:"postgres",
    port:5432
});

const creation = 'CREATE TABLE IF NOT EXISTS "users"(' +
    'username VARCHAR(50) PRIMARY KEY,' +
    'email VARCHAR(50) NOT NULL,' +
    'password VARCHAR(10),' +
    'name VARCHAR(20),' +
    'surname VARCHAR(20));';

pool.query(creation,(err,res) =>{
    console.log('querying!');
    if(err){
        console.log('error in creation: ' + err);
        //console.log(err);
    }
    else{
        console.log('not error');
        //console.log(err.stack);
    }
});



app.get("/", (req, res) => {
    res.json({ msg: "I'm users-micro, Up & Running" });
});

/*

app.get("/api/u1/users", async (req, res) => {
    const videos = await Video.find({});
    res.json(videos);
});*/
function cognitoLog(email, psw/*,session*/) {

    console.log('cognitoLogin!');
    var authenticationData = {
        Username : email,// 'closantoro@gmail.com',
        Password : psw,
    };
    var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
    var poolData = { UserPoolId : 'us-east-1_WLaeGxYQd',
        ClientId : '4d76fpsdlldt729bkjufbj7gcb'
    };
    var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    var userData = {
        Username : email,//'closantoro@gmail.com',
        Pool : userPool
    };
    var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
   // console.log('cognitoUser is: ' + JSON.stringify(cognitoUser));
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            accessToken = result.getAccessToken().getJwtToken();

            /* Use the idToken for Logins Map when Federating User Pools with identity pools or when passing through an Authorization Header to an API Gateway Authorizer */
            idToken = result.idToken.jwtToken;

           // console.log('Access token: ' + JSON.stringify(accessToken));
            //console.log('Id token: ' + JSON.stringify(idToken));

        },

        onFailure: function(err) {
            console.log('There was an error: ' + JSON.stringify(err));
            //alert(err);
        },

    });
}



function cognitoSignUp(email,psw) {

    var attribute = {
        Name : 'email',
        Value : email
    };
    var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(attribute);
    var attributeList = [];

    attributeList.push(attributeEmail);
    var cognitoUser;


    console.log('trying to signup; userPool is: '+ JSON.stringify(userPool));

    userPool.signUp(email, psw, attributeList, null, function(err, result) {
        if (err) {
            console.log('There was an error: ' + JSON.stringify(err));
            //alert(err);
            return;
        }
        cognitoUser = result.user;
    });




}


app.post("/users/registration", async (req, res) => {
    console.log('called');
    console.log('got request: ' + req);
    let user =req.body.username;
    let email= req.body.email;
    let psw = req.body.psw;
    let name = req.body.name;
    let surname = req.body.surname;
    console.log('got name: ' + user);
    console.log('got email: ' + email);
    console.log('got psw: ' + psw);
    console.log('got name: ' + name);
    console.log('got surname: ' + surname);


    const text = "INSERT INTO users(username, email,password,name,surname) VALUES($1, $2,$3,$4,$5) RETURNING *";
    const values = [user,email,psw,name,surname];
// callback
    pool.query(text,values,(err, res) => {
        console.log('query2');
        if (err) {
            console.log("error: "  + err);
        } else {
            console.log("not error in creation");
            cognitoSignUp(email,psw)

        }
    });


});


app.post("/users/login", (req, res) => {

    let email= req.body.em;
    let psw = req.body.pass;
    console.log('got email: ' + email);
    console.log('got psw: ' + psw);
    console.log('full url is: ' + req.url);
    console.log('e mail and psw: ' + JSON.stringify(email) + '   ' + JSON.stringify(psw));

    const text ="SELECT(email,password) FROM users WHERE email='"+email +"' AND password='"+psw +"'";

    console.log(JSON.stringify(text));
    pool.query(text,(err, data) => {
        console.log('query LOGIN');
    if (err) {
        console.log("error: "  + err);
        res.status(404).json({"error":"not  found","err":err});
       // return;
    } else {
        console.log('res is: ' + res);
        cognitoLog(email,psw);
    }

    });

   // console.log('setting accessToken: ' + JSON.stringify(accessToken));
    res.status(200);
    res.json({token: accessToken,name: email});
    return res;
    //res.send("Claudio Santoro");
});




app.get("/users/profile/*", (req, res) => {

    var response;
    //var email= req.body.email;
    var fullUrl = req.url;
    console.log('full url is: ' + fullUrl);
    //var index = fullUrl.lastIndexOf("/users/profile/");
    //console.log('index is: ' + index);

    var index = findFirstDiffPos("/users/profile/*",fullUrl);
    var email = fullUrl.substring(index);

    console.log('profile, got email: ' + email);

    const text ="SELECT * FROM users WHERE email='"+email +"';";
    console.log(JSON.stringify(text));

    pool.query(text, function (error, results) {
        if (error) throw error;
        console.log('The solution is: ', JSON.stringify(results["rows"]));
        return results["rows"];

    });

// console.log('setting accessToken: ' + JSON.stringify(accessToken));
    res.status(200);
    //res.json({token: accessToken,name: email});
    console.log('response is: ' + response);
    return response;
    //res.send("Claudio Santoro");
});




module.exports = app;