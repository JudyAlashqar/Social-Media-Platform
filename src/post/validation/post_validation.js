const express = require('express')


const validatePost =  async (req, res, next) => {
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
                msg += "Post text can not be empty, "
            }
        }
        if (x == 1)
        {
            return res.json ({success:false, msg:msg})
        }
        res.locals.text = text;
        next()
    }
    catch(err) {
        res.json({success:false, msg:err.message})  
    }
}

const validateComment =  async (req, res, next) => {
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
                msg += "Comment text can not be empty, "
            }
        }
        if (x == 1)
        {
            return res.json ({success:false, msg:msg})
        }
        res.locals.text = text;
        next()
    }
    catch(err) {
        res.json({success:false, msg:err.message})  
    }
}

const postValidation = {
    validatePost,
    validateComment
}
module.exports = postValidation