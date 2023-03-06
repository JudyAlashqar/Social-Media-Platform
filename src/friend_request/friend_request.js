const express = require('express')
const oracledb = require('oracledb')
const auth = require('../auth/auth')
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
const dbconnection = require('../../config/config')
var router = express.Router()
let connAttr = dbconnection.connAttr

router.post('/sendFriendRequest', auth.verifyToken, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let receiver_id = Number(req.body.id);
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let sender_id = result.rows[0].ID;
        if (sender_id == receiver_id)
        {
            return res.json({success: false, msg:"You can not send a friend request to yourself"})
        }
        query = "select * from friend_request where (sender_id="+sender_id+" and receiver_id="+receiver_id+")"+
        "or (sender_id="+receiver_id+" and receiver_id="+sender_id+")"
        result = await connection.execute(query)
        if(result.rows[0] != null)
        {
            return res.json({success: false, msg:"You have already sended a friend request to this person or he sended a friend request to you"})    
        }
        query = "select * from user_has_friend where (user_id="+sender_id+" and friend_id="+receiver_id+")"+
        "or (user_id="+receiver_id+" and friend_id="+sender_id+")"
        result = await connection.execute(query)
        if(result.rows[0] != null)
        {
            return res.json({success: false, msg:"You already are a friend with this person"})    
        }
        let binds = [
            sender_id,
            receiver_id,
            new Date()
        ]
        query = "insert into friend_request (sender_id, receiver_id, request_time)"+
        "values  (:sender_id, :receiver_id, :request_time)"
        result = await connection.execute(query,binds,{autoCommit:true})
        return res.json({success: true, result:result})
    }
    catch (err) {
        console.log(err)
        return res.json({success: false, msg:err.message})
    }
    finally {
        await connection.release();
    }
})

router.delete('/deleteSendedFriendRequest', auth.verifyToken, async(req, res) => {
    let connection;
    let email = res.locals.decodedDetails.email
    let receiver_id = Number(req.body.id);
    try {
        connection = await oracledb.getConnection(connAttr);
        let query = "select id from users where email='" + email+"'";
        let result = await connection.execute(query)
        let sender_id = result.rows[0].ID;
        query = "select sender_id, receiver_id from friend_request where sender_id=" + sender_id +" and receiver_id=" +receiver_id;
        result = await connection.execute(query)
        if(result.rows[0] == null) {
            return res.json({success: false, msg:"There is no friend request from you to this person"})
        }
        query = "delete from friend_request where sender_id=" + sender_id +" and receiver_id=" +receiver_id;
        result = await connection.execute(query,{},{autoCommit:true})
        return res.json({success: true, result:result})
    }
    catch (err) {
        console.log(err)
        return res.json({success: false, msg:err.message})
    }
    finally {
        await connection.release();
    }
    }
)

router.post('/acceptRequest',auth.verifyToken, async(req, res) => {
    let connection;
    let email = res.locals.decodedDetails.email
    let sender_id = Number(req.body.id)
    try
    {
        connection = await oracledb.getConnection(connAttr);
        let query = "select id from users where email='" + email+"'";
        let result = await connection.execute(query)
        let receiver_id = result.rows[0].ID;
        query = "select sender_id, receiver_id from friend_request where sender_id=" + sender_id +" and receiver_id=" +receiver_id;
        result = await connection.execute(query)
        if (result.rows[0] != null)
        {
            let binds = [
                sender_id,
                receiver_id,
                new Date()
            ]
            /* trigger
            query = "delete from friend_request where sender_id=" + sender_id +" and receiver_id=" +receiver_id;
            result = await connection.execute(query)
            */
            query = "insert into user_has_friend (user_id, friend_id, friendship_time)"+
            "values (:user_id, :friend_id, :friendship_time)"
            result = await connection.execute(query,binds,{autoCommit:true})
            return res.json({success: true, result:result})
        }
        else {
            return res.json({success: false, msg:"There is no friend request from you to this person"})
        }
    }
    catch (err) {
        console.log(err)
        return res.json({success: false, msg:err.message})
    }
    finally {
        await connection.release();
    }
})

router.delete('/deleteReceivedFriendRequest', auth.verifyToken, async(req, res) => {
    let connection;
    let email = res.locals.decodedDetails.email
    let sender_id = Number(req.body.id);
    try {
        connection = await oracledb.getConnection(connAttr);
        let query = "select id from users where email='" + email+"'";
        let result = await connection.execute(query)
        let receiver_id = result.rows[0].ID;
        query = "select sender_id, receiver_id from friend_request where sender_id=" + sender_id +" and receiver_id=" +receiver_id;
        result = await connection.execute(query)
        if(result.rows[0] == null) {
            return res.json({success: false, msg:"There is no friend request from this person to you"})
        }
        query = "delete from friend_request where sender_id=" + sender_id +" and receiver_id=" +receiver_id;
        result = await connection.execute(query,{},{autoCommit:true})
        return res.json({success: true, result:result})
    }
    catch (err) {
        console.log(err)
        return res.json({success: false, msg:err.message})
    }
    finally {
        await connection.release();
    }
})

router.get('/getSendedFriendRequests',auth.verifyToken, async(req, res) => {
    let connection;
    let email = res.locals.decodedDetails.email
    try {
        connection = await oracledb.getConnection(connAttr);
        let query = "select id from users where email='"+email+"'";
        let result = await connection.execute(query)
        user_id = result.rows[0].ID;
        let domain = ""
        query = "select receiver_id from friend_request where sender_id= '"+user_id+"'";
        result = await connection.execute(query)
        if (result.rows[0] == null)
        {
            return res.json({success: true, msg:"You have not sended any friend request"})
        }
        result.rows.forEach(async(row)=> {
            domain += "'"+row.RECEIVER_ID+"',"
          })
        domain = domain.substring(0,domain.length -1)
        query = "select first_name||' '||last_name as receiver_name from users where id in (" + domain + ")";
        result = await connection.execute(query)
        return res.json(result.rows)
    }
    catch (err) {
        console.log(err)
        return res.json({success: false, msg:err.message})
    }
    finally {
        await connection.release();
    }
    }
)

router.get('/getReceivedFriendRequests',auth.verifyToken, async(req, res) => {
    let connection;
    let email = res.locals.decodedDetails.email
    try {
        connection = await oracledb.getConnection(connAttr);
        let query = "select id from users where email='"+email+"'";
        let result = await connection.execute(query)
        user_id = result.rows[0].ID;
        let domain = ""
        query = "select sender_id from friend_request where receiver_id= '"+user_id+"'";
        result = await connection.execute(query)
        if (result.rows[0] == null)
        {
            return res.json({success: true, msg:"You have not received any friend request"})
        }
        result.rows.forEach(async(row)=> {
            domain += "'"+row.SENDER_ID+"',"
          })
        domain = domain.substring(0,domain.length -1)
        query = "select first_name||' '||last_name as sender_name from users where id in (" + domain + ")";
        result = await connection.execute(query)
        return res.json(result.rows)
    }
    catch (err) {
        console.log(err)
        return res.json({success: false, msg:err.message})
    }
    finally {
        await connection.release();
    }
    }
)

router.post('/getUserFriends', auth.verifyToken ,async(req, res) => { //Admin can get the friends of anyone, normal user can get only his friends
    let connection;
    let role = res.locals.decodedDetails.role
    let email = res.locals.decodedDetails.email
    let user_id = req.body.id
    if (user_id != null && role != "admin") {
        return res.json({success: false, msg:"Unauthorized"})
    }
    try {
        connection = await oracledb.getConnection(connAttr);
        let query = "select id from users where email='"+email+"'";
        let result = await connection.execute(query)
        if (user_id == null)
        {
            user_id = result.rows[0].ID
        }
        let domain = ""
        query = "select friend_id from user_has_friend where user_id= '"+user_id+"'"
        let result1 = await connection.execute(query)
        query = "select user_id from user_has_friend where friend_id= '"+user_id+"'"
        result = await connection.execute(query)
        if (result.rows[0] == null && result1.rows[0] ==null)
        {
            return res.json({success: true, msg:"This user has no friends"})
        }
        result1.rows.forEach((row)=> {
            domain += "'"+row.FRIEND_ID+"',"
          })
        result.rows.forEach((row)=> {
          domain += "'"+row.USER_ID+"',"
        })
        domain = domain.substring(0,domain.length -1)
        query = "select first_name||' '||last_name as friend_name from users where id in (" + domain + ")";
        result = await connection.execute(query)
        return res.json(result.rows)
    }
    catch (err) {
        console.log(err)
        return res.json({success: false, msg:err.message})
    }
    finally {
        await connection.release();
    }
})

router.delete('/deleteFriendship', auth.verifyToken, async(req, res) => {
    let connection
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email
        let friend_id = Number(req.body.id);
        let query = "select id from users where email='" + email+"'";
        let result = await connection.execute(query)
        let user_id = result.rows[0].ID;
        query = "select user_id from user_has_friend where user_id=" + user_id+" and friend_id="+friend_id;
        result = await connection.execute(query)
        query = "select user_id from user_has_friend where friend_id=" + user_id+" and user_id="+friend_id;
        let result1 = await connection.execute(query)
        if(result.rows[0] == null && result1.rows[0] == null)
        {
            return res.json({success: true, msg:"You are not a friend with this user"})
        }
        else{
            query = "delete from user_has_friend where (user_id=" + user_id+" and friend_id="+friend_id+") or (user_id=" + friend_id+" and friend_id="+user_id+") ";
            result = await connection.execute(query,{},{autoCommit:true})
            return res.json({success: true, result:result})
        }
    }
    catch (err) {
        console.log(err)
        return res.json({success: false, msg:err.message})
    }
    finally {
        await connection.release();
    }
})

module.exports = router;