const express = require('express')


const validateMessage =  async (req, res, next) => {
    try {
        let msg =""
        let x = 0
        let text = req.body.text
        if (text != null)
        {
            text = text.trim();
            if (text == "")
            {
                x = 1;
                msg += "Message text can not be empty, "
            }
        }
        if (x == 1)
        {
            return res.json ({success:false, msg:msg})
        }
        res.locals.text = text;
        res.locals.receiver_id = req.body.id;
        next()
    }
    catch(err) {
        res.json({success:false, msg:err.message})  
    }
}

const messageValidation = {
    validateMessage
}
module.exports = messageValidation