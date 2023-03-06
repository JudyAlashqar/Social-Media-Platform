const express = require('express')
const oracledb = require('oracledb')
const auth = require('../auth/auth')
const valid = require('./validation/post_validation')
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
const dbconnection = require('../../config/config')
const { OUT_FORMAT_OBJECT } = require('oracledb')
const { JsonWebTokenError } = require('jsonwebtoken')
const e = require('express')

var router = express.Router()
let connAttr = dbconnection.connAttr

router.get('/showPosts', auth.verifyToken, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let use_id = result.rows[0].ID;
        query = "select text, (select first_name ||' ' ||last_name from users where id= user_id) as post_writer_name"+
        ",to_char(creation_time,'dd/mm/yyyy hh:mi:ss AM') as creation_time, likes_counter(post.id) as likes_number,comments_counter(post.id) as comments_number from post where user_id in (select user_id from user_has_friend where friend_id="+use_id+") or"+
        " user_id in (select friend_id from user_has_friend where user_id="+use_id+") or user_id = "+use_id+" order by Extract (year from post.creation_time) desc, Extract(month from post.creation_time) desc, Extract (day from post.creation_time) desc ,likes_counter(post.id) + comments_counter(post.id) desc";
        result = await connection.execute(query)
        if(result.rows[0] == null)
        {
            return res.json({success: true, msg:"There are no posts"})
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

router.get('/showUserPosts', auth.verifyToken, async(req, res) => { //Only for admin to get the posts of certain user
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let role = res.locals.decodedDetails.role;
        let user_id = req.body.id;
        if (role != "admin")
        {
            return res.json({success: false, msg:"Unauthorized"})
        }
        let query = "select * from users where id="+user_id;
        result = await connection.execute(query)
        if (result.rows[0] == null)
        {
            return res.json({success: false, msg:"There is no such user"})
        }
        query = "select text, (select first_name ||' ' ||last_name from users where id= user_id) as post_writer_name, likes_counter(post.id) as likes_number,comments_counter(post.id) as comments_number"+
        ",to_char(creation_time,'dd/mm/yyyy hh:mi:ss AM') as creation_time from post where user_id="+user_id+" order by Extract (year from post.creation_time) desc, Extract(month from post.creation_time) desc, Extract (day from post.creation_time) desc ,likes_counter(post.id)+comments_counter(post.id) desc";
        result = await connection.execute(query)
        if (result.rows[0] == null){
            return res.json({success: false, msg:"There are no posts for this user"})
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

router.get('/showLikers'/auth.verifyToken, async(req,res)=>{ //Admin can see the likers of any post, normal user can only see the likers of the posts he creates
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let role = res.locals.decodedDetails.role;
        let post_id = req.body.id;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let user_id = result.rows[0].ID;
        query = "select user_id from post where post_id="+post_id
        result = await connection.execute(query)
        let founder_id = result.rows[0].USER_ID
        if (role != "admin" && user_id != founder_id)
        {
            return res.json({success:false, msg:'Unauthorized'})
        }
        query = "select (first_name ||' ' ||last_name) as liker_name from users where users.id in (select user_id from user_likes_post where post_id="+post_id+")";
        result = await connection.execute(query)
        return  res.json({success:false, msg:'Unauthorized'})
    }
    catch(err){

    }
    finally {
        await connection.release();
    }
})

router.get('/showCommenters'/auth.verifyToken, async(req,res)=>{ //Admin can see the commenters of any post, normal user can only see the commenters of the posts he creates 
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let role = res.locals.decodedDetails.role;
        let post_id = req.body.id;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let user_id = result.rows[0].ID;
        query = "select user_id from post where post_id="+post_id
        result = await connection.execute(query)
        let founder_id = result.rows[0].USER_ID
        if (role != "admin" && user_id != founder_id)
        {
            return res.json({success:false, msg:'Unauthorized'})
        }
        query = "select (first_name ||' ' ||last_name) as commenter_name from users where users.id in (select commenter_id from comments where post_id="+post_id+")";
        result = await connection.execute(query)
        return  res.json({success:false, msg:'Unauthorized'})
    }
    catch(err){

    }
    finally {
        await connection.release();
    }
})

router.post('/addPost', auth.verifyToken, valid.validatePost ,async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let text=res.locals.text;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let founder_id = result.rows[0].ID;
        let binds = [
            text,
            founder_id,
            new Date()
        ]
        query = "insert into post (text, user_id, creation_time)"+
        "values  (:text, :founder_id, :creation_time)"
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

router.put('/updatePost', auth.verifyToken,valid.validatePost, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let text = res.locals.text;
        let post_id = req.body.id;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let founder_id = result.rows[0].ID;
        query = "select user_id from post where id="+post_id;
        result = await connection.execute(query)
        if(result.rows[0] == null)
        {
            return res.json({success: false, result:"There is no such post"})
        }
        else if (result.rows[0].USER_ID != founder_id) {
            return res.json({success: false, msg:"Unauthorized"})
        }
        else {
            query = "update post set text='"+text+"' where id='"+post_id+"'";
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

router.delete('/deletePost', auth.verifyToken, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let post_id = Number (req.body.id);
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let founder_id = result.rows[0].ID;
        query = "select user_id from post where id="+post_id;
        result = await connection.execute(query)
        if(result.rows[0] == null)
        {
            return res.json({success: false, result:"There is no such post"})
        }
        else if (result.rows[0].USER_ID != founder_id) {
            return res.json({success: false, msg:"Unauthorized"})
        }
        else {
            /* trigger
            query = "delete from user_likes_post where post_id="+post_id;
            result = await connection.execute(query,{},{autoCommit:true})
            query = "delete from comments where post_id="+post_id;
            result = await connection.execute(query,{},{autoCommit:true}) */
            query = "delete from post where id= "+post_id;
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

router.post('/addComment', auth.verifyToken,valid.validateComment ,async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let text = res.locals.text;
        let post_id = req.body.id;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let commenter_id = result.rows[0].ID;
        query = "select user_id from post where id="+ post_id;
        result = await connection.execute(query)
        if (result.rows[0] == null)
        {
            return res.json({success: false, msg:'There is no such post'})
        }
        let founder_id = result.rows[0].USER_ID;
        query = "select friend_id from user_has_friend where user_id= '"+commenter_id+"'";
        result = await connection.execute(query)
        query = "select user_id from user_has_friend where friend_id= '"+commenter_id+"'"
        result1 = await connection.execute(query)
        let authorized ="no"
        result.rows.forEach((row)=> {
            if (founder_id == row.FRIEND_ID)
            {
                authorized = 'yes'
            }
        })
        result1.rows.forEach((row)=> {
            if (founder_id == row.USER_ID)
            {
                authorized = 'yes'
            }
        })
        if (founder_id == commenter_id)
        {
            authorized ='yes'
        }
        if (authorized == 'no')
        {
            return res.json({success: false, msg:'Unauthorized'})
        }
        let binds = [
            post_id,
            text,
            commenter_id
        ]
        query = "insert into comments (post_id, text, commenter_id)"+
        "values  (:post_id, :text, :commenter_id)"
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

router.put('/updateComment', auth.verifyToken,valid.validateComment, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let text = res.locals.text;
        let comment_id = req.body.id;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let user_id = result.rows[0].ID;
        query = "select commenter_id from comments where id= "+comment_id;
        result = await connection.execute(query)
        if (result.rows[0] == null)
        {
            return res.json({success: false, msg:'There is no such comment'})
        }
        let commenter_id = result.rows[0].COMMENTER_ID;
        if (user_id != commenter_id)
        {
            return res.json({success: false, msg:'Unauthorized'})
        }
        else {
            query = "update comments set text= '"+text+"' where id="+comment_id;
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

router.delete('/deleteComment', auth.verifyToken, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let comment_id = req.body.id;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let user_id = result.rows[0].ID;
        query = "select * from comments where id= "+comment_id;
        result = await connection.execute(query)
        if (result.rows[0] == null)
        {
            return res.json({success: false, msg:'There is no such comment'})
        }
        let commenter_id = result.rows[0].COMMENTER_ID;
        if (user_id != commenter_id)
        {
            return res.json({success: false, msg:'Unauthorized'})
        }
        else {
            query = "delete from comments where id="+comment_id;
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

router.post('/addLike', auth.verifyToken, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let post_id = req.body.id;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let liker_id = result.rows[0].ID;
        query = "select user_id from post where id='"+ post_id+"'";
        result = await connection.execute(query)
        if (result.rows[0] == null)
        {
            return res.json({success: false, msg:'There is no such post'})
        }
        let founder_id = result.rows[0].USER_ID;
        query = "select friend_id from user_has_friend where user_id= '"+liker_id+"'";
        result = await connection.execute(query)
        query = "select user_id from user_has_friend where friend_id= '"+liker_id+"'"
        result1 = await connection.execute(query)
        let authorized ="no"
        result.rows.forEach((row)=> {
            if (founder_id == row.FRIEND_ID)
            {
                authorized = 'yes'
            }
        })
        result1.rows.forEach((row)=> {
            if (founder_id == row.USER_ID)
            {
                authorized = 'yes'
            }
        })
        if (founder_id == liker_id)
        {
            authorized ='yes'
        }
        if (authorized == 'no')
        {
            return res.json({success: false, msg:'Unauthorized'})
        }
        query = "select * from user_likes_post where user_id= '"+liker_id+"' and post_id="+post_id;
        result = await connection.execute(query)
        if(result.rows[0] != null)
        {
            return res.json({success: false, msg:'You already like this post'})
        }
        let binds = [
            post_id,
            liker_id
        ]
        query = "insert into user_likes_post (post_id, user_id)"+
        "values  (:post_id, :user_id)"
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

router.delete('/cancelLike', auth.verifyToken, async(req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(connAttr);
        let email = res.locals.decodedDetails.email;
        let post_id = req.body.id;
        let query = "select id from users where email='"+ email+"'";
        let result = await connection.execute(query)
        let user_id = result.rows[0].ID;
        query = "select * from post where id='"+ post_id+"'";
        result = await connection.execute(query)
        if (result.rows[0] == null)
        {
            return res.json({success: false, msg:'There is no such post'})
        }
        query = "select user_id from user_likes_post where post_id= "+post_id+" and user_id="+user_id;
        result = await connection.execute(query)
        if (result.rows[0] == null)
        {
            return res.json({success: false, msg:'You did not like this post'})
        }
        else {
            query = "delete from user_likes_post where post_id= "+post_id+" and user_id="+user_id;
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