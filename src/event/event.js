const express = require('express')
const oracledb = require('oracledb')
const auth = require('../auth/auth')
const valid = require('./validation/event_validation')
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
const dbconnection = require('../../config/config')
const { DATE } = require('oracledb')
const { query } = require('express')

var router = express.Router()
let connAttr = dbconnection.connAttr

router.post('/addEvent', auth.verifyToken, valid.validateEventInfo ,async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let time = res.locals.time;
        let name=res.locals.name;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let founder_id = result.rows[0].ID;
        let binds = [
            name,
            time,
            founder_id
        ]
        query = "insert into event (name, happening_time, founder_id)"+
        "values  (:name, :happening_time, :founder_id)"
        result = await connection.execute(query,binds,{autoCommit:true})
        //trigger is executed to add the founder of the event as a participant
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

router.get('/showEvents', auth.verifyToken, async(req, res) => {
    let connection;
    let months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN','JUL','AUG','SEP','OCT','NOV','DEC']
    let date = new Date()
    let day = new Date().getDate()
    let month = months [new Date().getMonth()]
    let year = new Date().getFullYear().toString().substring(2)
    let hour = new Date().getHours()
    let minute = new Date().getMinutes()
    let second = new Date().getSeconds()
    let a;
    if(hour > 12)
    {
        a = 'PM'
    }
    else {
        a = 'AM'
    }
    hour = hour%12
    if (hour == 0) hour = 12
    try {
        connection = await oracledb.getConnection(connAttr);
        let query = "select (select first_name ||' '||last_name from users where id= founder_id) as founder_name, name, to_char(happening_time,'dd/mm/yyyy hh:mi:ss AM') as happening_time from event where happening_time >'"+day+"-"+month+"-"+year+" "+hour+"."+minute+"."+second+" "+a+"'";
        result = await connection.execute(query)
        if (result.rows[0] == null)
        {
            return res.json({success: true, msg:"There are no upcoming events"})
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

router.get('/showParticipatedEvents', auth.verifyToken, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let user_id = result.rows[0].ID;
        query = "select event_id from user_participate_event where user_id="+user_id
        result = await connection.execute(query)
        let domain =""
        result.rows.forEach((row)=> {
            domain += "'"+row.EVENT_ID+"',"
          })
        domain = domain.substring(0,domain.length -1)
        if(domain == "")
        {
            return res.json({success: true, msg:"There are no events you participated or will participate in"})
        }
        query = "select (select first_name ||' '||last_name from users where id= founder_id) as founder_name, name, to_char(happening_time,'dd/mm/yyyy hh:mi:ss AM') as happening_time from event where id in ("+domain+")"
        result = await connection.execute(query)
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

router.get('/showParticipatedUsers', auth.verifyToken, async(req, res) => { //Admin can know the participants of any event, normal user can know only the participants of the events he creates
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let user_id = result.rows[0].ID;
        let role = res.locals.decodedDetails.role;
        let event_id = req.body.id
        query = "select founder_id from event where id='"+ event_id+"'";
        result = await connection.execute(query)
        if(result.rows[0] == null)
        {
            return res.json({success: false, msg:"There is no such event"})
        }
        if (result.rows[0].FOUNDER_ID != user_id && role != "admin")
        {
            return res.json({success: false, msg:"Unauthorized"})
        }
        query = "select user_id from user_participate_event where event_id="+event_id
        result = await connection.execute(query)
        let domain =""
        result.rows.forEach((row)=> {
            domain += "'"+row.USER_ID+"',"
          })
        domain = domain.substring(0,domain.length -1)
        query = "select first_name ||' '||last_name as participant_name from users where id in ("+domain+")"
        result = await connection.execute(query)
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

router.post('/participateEvent', auth.verifyToken, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let event_id = req.body.id;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let user_id = result.rows[0].ID;
        query = "select * from event where id="+event_id;
        result = await connection.execute(query)
        if(result.rows[0]==null)
        {
            return res.json({success: false, msg:"There is no such event"})
        }
        query = "select * from user_participate_event where user_id="+user_id+" and event_id="+event_id;
        result = await connection.execute(query)
        if (result.rows[0] != null)
        {
            return res.json({success: false, msg:"You already are a participant in this event"})
        }
        let binds = [
            event_id,
            user_id
        ]
        query = "insert into user_participate_event (event_id, user_id)"+
        "values  (:event_id, :user_id)"
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

router.delete('/cancelParticipateEvent', auth.verifyToken, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let event_id = Number(res.locals.id);
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let user_id = result.rows[0].ID;
        query = "select event_id from user_participate_event where event_id="+event_id+" and user_id= "+user_id;
        result = await connection.execute(query)
        if(result.rows[0] == null)
        {
            return res.json({success: false, msg:"You are not a participant in this event"})
        }
        else {
            let query = "select founder_id from event where id='"+ event_id+"'";
            let result = await connection.execute(query)
            if (result.rows[0].FOUNDER_ID == user_id)
            {
                return res.json({success: false, msg:"You can not enroll yourself out of an avent you created"})
            }
            query = "delete from user_participate_event where event_id="+event_id+" and user_id= "+user_id;
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

router.put('/updateEvent', auth.verifyToken,valid.validateEventInfo ,async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let event_id = Number(req.body.id);
        let time= req.body.time
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let founder_id = result.rows[0].ID;
        query = "select founder_id from event where id="+event_id;
        result = await connection.execute(query)
        if(result.rows[0] == null)
        {
            return res.json({success: false, msg:"There is no such event"})
        }
        else if (result.rows[0].FOUNDER_ID != founder_id)
        {
            return res.json({success: false, msg:"Unauthorized"})
        }
        else {
            query = "update event set happening_time='"+ time +"' where id="+event_id+" and founder_id= "+founder_id;
            result = await connection.execute(query,{},{autoCommit:true})
            //A trigger will be performed now to send a message to people who are participant in this event to inform them of the update
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

router.delete('/deleteEvent', auth.verifyToken, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let event_id = Number(req.body.id);
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let founder_id = result.rows[0].ID;
        query = "select founder_id from event where id="+event_id;
        result = await connection.execute(query)
        if(result.rows[0] == null)
        {
            return res.json({success: false, msg:"There is no such event"})
        }
        else if (result.rows[0].FOUNDER_ID != founder_id)
        {
            return res.json({success: false, msg:"Unauthorized"})
        }
        else {
            /* trigger
            query = "delete from user_participate_event where id="+event_id";
            result = await connection.execute(query,{},{autoCommit:true}) */
            query = "delete from event where id="+event_id+" and founder_id= "+founder_id;
            result = await connection.execute(query,{},{autoCommit:true})
            //trigger to send a message to people who are participant in this event to inform them of the update
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