const express=require('express')
var app=express();
app.use(express.json())
app.use(express.urlencoded({
    extended:true
}));

 const home=require('./src/home/home')
 app.use('/',home)

 const user=require('./src/user/user')
 app.use('/user',user)

 const friend_request=require('./src/friend_request/friend_request')
 app.use('/friend_request',friend_request)

 const message=require('./src/message/message')
 app.use('/message',message)

 const event=require('./src/event/event')
 app.use('/event',event)

 const post=require('./src/post/post')
 app.use('/post',post)

 var port=5000
 app.listen(port,()=>{
     console.log("Web server is ready on port: "+port)
 })