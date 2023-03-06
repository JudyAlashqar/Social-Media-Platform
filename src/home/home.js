const express=require('express')
const oracledb = require('oracledb')
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
const jwt = require('jsonwebtoken')
let router=express.Router()
const config = require('../../config/config')
const connAttr = config.connAttr
const CryptoJS = require('crypto-js');


router.post("/login", async(req,res)=>{
    const email = req.body.email
    const password = req.body.password
    try {
        let connection = await oracledb.getConnection(connAttr);
        let query = "select email, password, role from users where email='"+email+"'";
        const result = await connection.execute(query)
        if (result.rows[0] == null)
        {
            return res.json({success: false, msg:"There is no user with this email"})
        }
        let bytes = CryptoJS.AES.decrypt(result.rows[0].PASSWORD.toString(),'password')
        let original = bytes.toString(CryptoJS.enc.Utf8)
        if (password != original)
        {
            return res.json({success: false, msg:"The password you entered is not correct"})
        }
        const role = result.rows[0].ROLE;
        const user_details = {
        email,
        password,
        role
        }
        const secretKeyAccess = config.accessKey
        const secretKeyResfresh = config.refreshKey
        const AccessToken = jwt.sign(user_details, secretKeyAccess, {expiresIn:60})
        const RefreshToken = jwt.sign(user_details, secretKeyResfresh, {expiresIn:100000})
        return res.json({success:true, accessToken: AccessToken, refreshToken: RefreshToken})
    }
    catch (err){
        return res.json({success:false, msg:err.message})
    }
})

router.post("/sendRefreshToken", async(req,res)=>{
    const secretKeyAccess = config.accessKey
    const secretKeyResfresh = config.refreshKey
    const token = req.body.refreshToken
    try {
        decodedDetails = await jwt.verify(token, secretKeyResfresh);
        {   email = decodedDetails.email
            password = decodedDetails.password
            role = decodedDetails.role
        }
        user_details = {
            email,
            password,
            role
        }
        AccessToken = jwt.sign(user_details, secretKeyAccess, {expiresIn:60})
    }
    catch(err) {
        return res.json({success:false, msg:'Log in again please'})  
    }
    return res.json({success:true, accessToken: AccessToken})
    
})

module.exports = router;