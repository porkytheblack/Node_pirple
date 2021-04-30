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












//export helpers module
module.exports = helpers