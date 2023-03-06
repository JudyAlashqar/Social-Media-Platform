const express = require('express')
const oracledb = require('oracledb')
const auth = require('../auth/auth')
const valid = require('./validation/user_validation')
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
const dbconnection = require('../../config/config')
const crypto = require('crypto-js');
var router = express.Router()
let connAttr = dbconnection.connAttr

router.get('/getUsers', auth.verifyToken, async(req, res) => { //Only for admin
    let connection;
    let role = res.locals.decodedDetails.role
    if (role == "admin")
    {
        try {
            connection = await oracledb.getConnection(connAttr);
            let query = "select first_name, last_name, email, phone_number, address, role from users";
            const result = await connection.execute(query)
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
    else {
        return res.json({success: false, msg:'Unauthorized'})
    }
})

router.get('/getUserInformation',auth.verifyToken, async(req, res) => { //Admin can get the info of anyone, normal user can get only his info
    let connection;
    let email = res.locals.decodedDetails.email
    let role  = res.locals.decodedDetails.role
    let id = req.body.id
    try {
        connection = await oracledb.getConnection(connAttr);
        let query ="select id from users where email='"+email+"'"
        let result = await connection.execute(query)
        if( id != null && id != result.rows[0].ID && role != "admin")
        {
            return res.json({msg:"Unauthorized"})
        }
        else {
            if (id == null)
            {
                id = result.rows[0].ID
            }
            query =  "select first_name, last_name, email, phone_number, address from users where id='"+id+"'";
            result = await connection.execute(query)
            if (result.rows[0] == null)
            {
                return res.json({success:false, msg:'There is no such user'})
            }
            return res.json(result.rows)
        }
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

router.post('/register', valid.validateUserInfo ,async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let enc_pass = crypto.AES.encrypt(res.locals.password,"password").toString()
        let binds = [
            res.locals.first_name,
            res.locals.last_name,
            res.locals.email,
            enc_pass,
            res.locals.phone_number,
            res.locals.address,
            'normal_user'
        ]
        let query = "select * from users where email='"+req.body.email+"'";
        let result = await connection.execute(query)
        if(result.rows[0] == null)
        {
            query = "insert into users (first_name, last_name, email, password, phone_number, address, role)"+
            "values  (:first_name, :last_name, :email, :password, :phone_number, :address, :role)"
            result = await connection.execute(query,binds,{autoCommit:true})
            return res.json({success: true, result:result})
        }
        return res.json({success: false, msg:"You are already registerd"})
    }
    catch (err) {
        console.log(err)
        return res.json({success: false, msg:err.message})
    }
    finally {
        await connection.release();
    }
})

router.put('/updatePersonalInformation',auth.verifyToken, valid.validateUpdateInfo ,async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let user_id = result.rows[0].ID;
        let attr =[]
        let val = []
        if (res.locals.first_name != null )
        {
            attr.push('first_name')
            val.push(res.locals.first_name)
        }
        if (res.locals.last_name != null)
        {
            attr.push('last_name')
            val.push(res.locals.last_name)
        }
        if (res.locals.phone_number != null)
        {
            attr.push('phone_number')
            val.push(res.locals.phone_number)
        }
        if (res.locals.address != null)
        {
            attr.push('address')
            val.push(res.locals.address)
        }
        if (res.locals.password != null)
        {
            attr.push('password')
            val.push(crypto.AES.encrypt(res.locals.password,"password").toString())
        }
        let update=""
        let x=1;
        attr.forEach((element)=>{
            update += element+"=:"+x+" ,"
            x++;
        })
        update = update.substring(0,update.length -1)
        query ="update users set "+update+" where id="+user_id;
        result = await connection.execute(query,val,{autoCommit:true})
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

router.delete('/deleteAccount', auth.verifyToken, async(req, res) => { //Admin can delete anyone, normal user can delete only himeself
    let connection;
    let role = res.locals.decodedDetails.role
    let email = res.locals.decodedDetails.email
    let user_id =req.body.id;
    if (user_id != null && role != "admin")
    {
        return res.json({success: false, msg:'Unauthorized'})
    }
    try {
        connection = await oracledb.getConnection(connAttr);
        let query ="select id from users where email='"+email+"'"
        let result = await connection.execute(query)
        if (user_id == null)
        {
            user_id = result.rows[0].ID;
        }
        /* trigger
        query = "delete from friend_request where sender_id='"+user_id+"' or receiver_id='"+user_id+"'";
        result = await connection.execute(query,{},{autoCommit:true})
        query = "delete from message where sender_id='"+user_id+"' or receiver_id='"+user_id+"'";
        result = await connection.execute(query,{},{autoCommit:true})
        query = "delete from user_likes_post where user_id='"+user_id+"'";
        result = await connection.execute(query,{},{autoCommit:true})
        query = "delete from user_has_friend where user_id="+user_id+" or friend_id="+user_id;
        result = await connection.execute(query,{},{autoCommit:true})
        query = "delete from user_participate_event where user_id="+user_id;
        result = await connection.execute(query,{},{autoCommit:true})
        query = "delete from comments where commenter_id='"+user_id+"'";
        result = await connection.execute(query,{},{autoCommit:true})
        query = "delete from post where user_id='"+user_id+"'";
        result = await connection.execute(query,{},{autoCommit:true})
        query = "delete from event where founder_id='"+user_id+"'";
        result = await connection.execute(query,{},{autoCommit:true}) */
        query =  "delete from users where id='"+user_id+"'";
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

module.exports = router;