/*
*
* handlers 
*/

//define the handlers
var handler = {}

//sample handler
handler.ping = function(data, callback){
    callback(200)
}

handler.users = function(data, callback){
    var acceptableMethods = ['get', 'put', 'post', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data, callback);
    }else{
        callback(405);
    }
}

//notFoundHandler
handler.notFound = function(data,callback){
    callback(404)
}

module.exports = handler;