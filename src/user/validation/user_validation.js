const express = require('express')


const validateUserInfo =  async (req, res, next) => {
    try {
        let msg =""
        var phoneformat=/09\d{8}/;
        var emailformat=/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        let x = 0
        let fname = req.body.first_name
        let lname = req.body.last_name
        let email = req.body.email
        let password = req.body.password
        let phone_number = req.body.phone_number
        let address = req.body.address
        if (fname == null || lname == null || email == null || password == null)
        {
            return res.json({success:false, msg:"First name, Last name, email and password are required"})
        }
        fname = fname.trim();
        lname = lname.trim();
        email = email.trim();
        if (phone_number != null)
        {
            phone_number = phone_number.trim();
            let st = ""
            st = phone_number
            if(!st.match(phoneformat)){
                x=1;
                msg+="The phone format is not valid, ";
            }
        }
        if (address != null)
        {
            address = address.trim();
        }
        if (fname == "")
        {
            x = 1;
            msg += "First name can not be empty, "
        }
        if (lname == "")
        {
            x = 1;
            msg += "Last name can not be empty, "
        }
        if (email == "")
        {
            x = 1;
            msg += "Email can not be empty, "
        }
        let em =""
        em = email
        if(!em.match(emailformat)){
            x=1;
            msg+="The email is not valid, ";
        }
        if (password == null || password == "")
        {
            x = 1;
            msg += "Password can not be empty, "
        }
        if (x == 1)
        {
            return res.json ({success:false, msg:msg})
        }
        res.locals.first_name = fname;
        res.locals.last_name = lname;
        res.locals.email = email;
        res.locals.password = password;
        res.locals.address = req.body.address;
        res.locals.phone_number = req.body.phone_number;
        next()
    }
    catch(err) {
        res.json({success:false, msg:err.message})  
    }
}

const validateUpdateInfo = async (req, res, next) => {
    try {
        let msg =""
        var phoneformat=/09\d{8}/;
        var emailformat=/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        let x = 0
        let fname = req.body.first_name
        let lname = req.body.last_name
        let email = req.body.email
        let password = req.body.password
        let phone_number = req.body.phone_number
        let address = req.body.address
        if (fname != null)
        {
            fname = fname.trim();
            if (fname == "")
            {
                x = 1;
                msg += "First name can not be empty, "
            }
        }
        if (lname != null)
        {
            lname = lname.trim();
            if (lname == "")
            {
                x = 1;
                msg += "Last name can not be empty, "
            }
        }
        if (email != null)
        {
            email = email.trim();
            if (email == "")
            {
                x = 1;
                msg += "Email can not be empty, "
            }
            let em =""
            em = email
            if(!em.match(emailformat)){
                x=1;
                msg="The email is not valid, ";
            }
        }
        if (phone_number != null)
        {
            phone_number = phone_number.trim();
            let ph = ""
            ph = phone_number
            if(ph != "" && !ph.match(phoneformat)){
                x=1;
                msg+="The phone format is not valid, ";
            }
        }
        if (address != null)
        {
            address = address.trim();
        }
        if (password == "")
        {
            x = 1;
            msg += "Password can not be empty, "
        }
        if (x == 1)
        {
            return res.json ({success:false, msg:msg})
        }
        res.locals.first_name = fname;
        res.locals.last_name = lname;
        res.locals.email = email;
        res.locals.password = password;
        res.locals.address = req.body.address;
        res.locals.phone_number = req.body.phone_number;
        next()
    }
    catch(err) {
        res.json({success:false, msg:err.message})  
    }
}

const userValidation = {
    validateUserInfo,
    validateUpdateInfo
}
module.exports = userValidation