/*
*helpers
*
*/

//dependancies
var crypto = require('crypto')
var config = require('../config')

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












//export helpers module
module.exports = helpers