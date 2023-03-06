const express = require('express')
const jwt = require('jsonwebtoken')
const secret = require('../../config/config')

const verifyToken = async (req, res, next) => {
    let token
    if(req.headers.authorization && req.headers.authorization.split(' ')[0]==='Bearer') {
        token = req.headers.authorization.split(' ')[1]
    }
    else {
        return res.json({success:false, msg:'No Token Provided'})
    }
    if(!token){
        return res.json({success:false, msg:'No Token Provided'})        
    }
    const secretKeyAccess = secret.accessKey
    try {
        const decodedDetails = await jwt.verify(token, secretKeyAccess);
        res.locals.decodedDetails = decodedDetails 
        next()
    }
    catch(err) {
        return res.json({success:false, msg:err.message})  
    }
}
const auhJWT = {
    verifyToken
}
module.exports = auhJWT