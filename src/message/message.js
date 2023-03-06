const express = require('express')
const oracledb = require('oracledb')
const auth = require('../auth/auth')
const valid = require('./validation/message_validation')
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
const dbconnection = require('../../config/config')

var router = express.Router()
let connAttr = dbconnection.connAttr

router.post('/sendMessage', auth.verifyToken, valid.validateMessage ,async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let receiver_id = res.locals.receiver_id
        let text=res.locals.text;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let sender_id = result.rows[0].ID;
        let binds = [
            sender_id,
            receiver_id,
            text,
            new Date(),
            'no'
        ]
        query = "insert into message (sender_id, receiver_id, text, sending_time, have_seen)"+
        "values  (:sender_id, :receiver_id, :text, :sending_time, :have_seen)"
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

router.delete('/deleteSendedMessage', auth.verifyToken, async(req, res) => { //sender can delete message only from his side
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let message_id = Number(req.body.id);
        let query = "select id from users where email='"+email+"'";
        let result = await connection.execute(query)
        let sender_id = result.rows[0].ID;
        query = "select * from message where id="+message_id+" and sender_id= "+sender_id;
        result = await connection.execute(query)
        if (result.rows[0] == null){
            return res.json({success: false, msg:"You did no send this message"})    
        }
        query = "select receiver_erased from message where id="+message_id;
        result = await connection.execute(query)
        if (result.rows[0].RECEIVER_ERASED == "yes")
        {
            query =  "delete from message where id="+message_id;
            result = await connection.execute(query,{},{autoCommit:true})
        }
        else {
            query = "update message set sender_erased='yes' where id="+message_id;
            result = await connection.execute(query,{},{autoCommit:true})
        }
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

router.delete('/deleteReceivedMessage', auth.verifyToken, async(req, res) => { //receiver can delete message only from his side
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let message_id = Number(req.body.id);
        let query = "select id from users where email='"+email+"'";
        let result = await connection.execute(query)
        let receiver_id = result.rows[0].ID;
        query = "select * from message where id="+message_id+" and receiver_id= "+receiver_id;
        result = await connection.execute(query)
        if (result.rows[0] == null){
            return res.json({success: false, msg:"You did no receive this message"})    
        }
        query = "select sender_erased from message where id="+message_id;
        result = await connection.execute(query)
        if (result.rows[0].SENDER_ERASED == "yes")
        {
            query =  "delete from message where id="+message_id;
            result = await connection.execute(query,{},{autoCommit:true})
        }
        else {
            query = "update message set receiver_erased='yes' where id="+message_id;
            result = await connection.execute(query,{},{autoCommit:true})
        }
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

router.get('/showReceivedMessages', auth.verifyToken, async(req, res) => {
    let connection;
    let date = new Date()
    let day = new Date().getDate()
    let month = new Date().getMonth() + 1
    let year = new Date().getFullYear().toString()
    let hour = new Date().getHours()
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let receiver_id = result.rows[0].ID;
        query = "select name, founder_id from event where id in (select event_id from user_participate_event where user_id="+receiver_id+" and (   (Extract(day from event.happening_time) = "+day +" and Extract(hour from event.happening_time) >"+ hour+")    or  (Extract(day from event.happening_time)- "+day+" = 1)  ) and Extract(month from event.happening_time) = "+ month+" and Extract(year from event.happening_time) = "+ year+")"
        result = await connection.execute(query)
        if (result.rows[0] != null)
        {
            result.rows.forEach(async(row) => {
                let bending = [
                    row.FOUNDER_ID,
                    receiver_id,
                    'The event '+row.NAME+' you are participating in is soon, Do not forget!',
                    new Date(),
                    'no'
                ]
                query = "insert into message (sender_id, receiver_id, text, sending_time, have_seen)"+
                "values  (:sender_id, :receiver_id, :text, :sending_time, :have_seen)"
                await connection.execute(query,bending,{autoCommit:true})
            });
        }
        query = "update message set have_seen='yes' where receiver_id="+receiver_id;
        result = await connection.execute(query,{},{autoCommit:true})
        query = "select (select first_name ||' '||last_name from users where id= sender_id)as sender_name, text, to_char(sending_time,'dd/mm/yyyy hh:mi:ss AM') as sending_time from message where receiver_erased='no' and receiver_id="+receiver_id+
        "order by sending_time desc";
        result = await connection.execute(query)
        if(result.rows[0] == null)
        {
            return res.json({success: true, msg:"You have not received any message"})
        }
        return res.json({success: true, result:result.rows})
    }
    catch (err) {
        console.log(err)
        return res.json({success: false, msg:err.message})
    }
    finally {
        await connection.release();
    }
})

router.get('/showSendedMessages', auth.verifyToken, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let sender_id = result.rows[0].ID;
        query = "select (select first_name ||' '||last_name from users where id= receiver_id) as receiver_name, text, to_char(sending_time,'dd/mm/yyyy hh:mi:ss AM') as sending_time, have_seen from message where sender_erased='no' and sender_id="+sender_id+
        " order by sending_time desc";
        result = await connection.execute(query)
        if (result.rows[0] == null)
        {
            return res.json({success: true, msg:"You have not sended any message"})
        }
        return res.json({success: true, result:result.rows})
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