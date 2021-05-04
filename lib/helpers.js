/*
*helpers
*
*/

//dependancies
var crypto = require('crypto')
var config = require('../config')
var querystring = require("querystring")
var https = require("https")

//helpers container
var helpers = {}

//hasher
helpers.hash = function(str){
    if(typeof(str) == 'string' && str.length > 0){
        var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex')
        return hash;
    }else{
        return false
    }
}

//parseJson
helpers.parseJsonToObject = function(str){
    try{
        var obj = JSON.parse(str)
        return obj
    }catch(e){
        return {}
    }
}

//create randomstring
helpers.createRandomString = function(strLength){
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if(strLength){
        //define all the possible characters to go in
        var possibleCharacters = 'qazwsxedcrfvtgbyhnjmiklop1234567890QAZWSXEDCRFVTGBYHNUJMIKLOP';
        //the final string
        var str = "";
        for(i = 1; i<= strLength; i++){
            //getting the random character
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random()*possibleCharacters.length))
            //append to this character to the string
            str+=randomCharacter;
        }
        //return the final string
        return str;
    }else{
        return false;
    }
};

//send twilio sms
helpers.sendTwilioSms = function(phone, msg, callback){
    
    var phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone : false;
    var msg = msg.length > 0 && msg.length <= 1600 ? msg : false;

    if(phone && msg){

        //the payload to be sent
        var payload = {
            "From": config.twilio.fromPhone,
            "To": "+1"+phone,
            "Body": msg
        }

        //stringify the payload
        var stringPayload = querystring.stringify(payload)

        //request Details
        var requestDetails = {
            'protocol' : 'https:',
            'hostname' : 'api.twilio.com',
            'method' : 'POST',
            'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
            'headers' : {
              'Content-Type' : 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(stringPayload)
            }
          };
        //create a request
        var req = https.request(requestDetails, function(res){
            //status code
            var status = res.statusCode; 
            //verify if request was successful

            if(status==200 || status == 201){
                callback(false)
            }else{
                callback("Status code returned was"+status)
            }
        })
        //bind error
        req.on("error", function(e){
            callback(e)
        })

        //Add the payload
        req.write(stringPayload)

        //end the request
        req.end()
    }else{
        callback("Given parameters were missing or invalid")
    }
}











//export helpers module
module.exports = helpers