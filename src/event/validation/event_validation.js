const express = require('express')
const { DATE } = require('oracledb')


const validateEventInfo =  async (req, res, next) => {
    try {
        let msg =""
        let x = 0
        let name = req.body.name
        let time = req.body.time
        if (name != null)
        {
            name = name.trim();
            if (name == "")
            {
                x = 1;
                msg += "Event name can not be empty, "
            }
        }
        if (time != null)
        {
            time = time.trim();
            if (time == "")
            {
                x = 1;
                msg += "Event happening time can not be empty, "
            }
            else {
                let d = new Date();
                let myArray = time.split(/[ -.:/]/);
                myArray = myArray.filter((el) => {
                    return  el !== '' ;
                  });
                if (myArray.length<3)
                {
                    return res.json({success:false, msg:'The happening time is not valid, you need at least day, month and a year'})
                }
                if (isNaN(Number(myArray[0]))|| Number(myArray[0])<1 || Number(myArray[0])>31)
                {
                    return res.json({success:false, msg:'The happening time is not valid, day between 1 and 31'})
                }
                d.setDate(Number(myArray[0]));
                month = ''
                if (myArray[1].trim() == 'JAN') month = 0;
                if (myArray[1].trim() == 'FEB') month = 1;
                if (myArray[1].trim() == 'MAR') month = 2;
                if (myArray[1].trim() == 'APR') month = 3;
                if (myArray[1].trim() == 'MAY') month = 4;
                if (myArray[1].trim() == 'JUN') month = 5;
                if (myArray[1].trim() == 'JUL') month = 6;
                if (myArray[1].trim() == 'AUG') month = 7;
                if (myArray[1].trim() == 'SEP') month = 8;
                if (myArray[1].trim() == 'OCT') month = 9;
                if (myArray[1].trim() == 'NOV') month = 10;
                if (myArray[1].trim() == 'DEC') month = 11;
                if (month === '')
                {
                    return res.json({success:false, msg:'The happening time is not valid, month is expressed by its first 3 letters in upper case, ex: JAN, FEB,...'})
                }
                d.setMonth(Number(month));
                if (myArray[2].length==2)
                {
                    let st = '20'
                    myArray[2] = st + myArray[2]
                }
                if (isNaN(Number(myArray[2])))
                {
                    return res.json({success:false,msg:'The happening time is not valid, year should be a number'})
                }
                d.setFullYear(myArray[2])
                if (myArray.length > 3)
                {
                    if (isNaN(Number(myArray[3])) || Number(myArray[3])>12 || Number(myArray[3])<1)
                    {
                        return res.json({success:false,msg:'The happening time is not valid, hour should be between 1 and 12'})
                    }
                    if (myArray[myArray.length -1]!='AM' && myArray[myArray.length -1]!='PM')
                    {
                        return res.json({success:false,msg:'You should determine if the time is AM or PM'})
                    }
                    if (myArray[myArray.length -1]=='AM' && myArray[3]==12)
                        myArray[3] = 0;
                    else{
                        myArray[3] =  Number(myArray[3]) + 12;
                        if (myArray[3] == 24) myArray[3]=0;
                    }
                    d.setHours(myArray[3])
                }
                if (myArray.length > 4)
                {
                    if (isNaN(Number(myArray[4])) || Number(myArray[4])>59 || Number(myArray[4])<0)
                    {
                        return res.json({success:false,msg:'The happening time is not valid, minutes should be between 0 and 59'})
                    }
                    d.setMinutes(myArray[4])
                }
                if (new Date() > d)
            {
                msg +='The event time can not be in the past'
                x = 1
            }
        }
        }
        if (x == 1)
        {
            return res.json ({success:false, msg:msg})
        }
        res.locals.name = name;
        res.locals.time = time;
        next()
    }
    catch(err) {
        res.json({success:false, msg:err.message})  
    }
}

const eventValidation = {
    validateEventInfo,
}
module.exports = eventValidation