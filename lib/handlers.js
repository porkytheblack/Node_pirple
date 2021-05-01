/*
*
* handlers 
*/

//dependancies
var _data = require('./data')
var helpers = require('./helpers')


//define the handlers
var handlers = {}

//sample handler
handlers.ping = function(data, callback){
    callback(200)
}

//user handler
handlers.users = function(data, callback){

    //defining  the acceptable methods notice they are all in lowercase
    var acceptableMethods = ['get', 'put', 'post', 'delete'];

    if(acceptableMethods.indexOf(data.method) > -1){
        // _users is a private method
        handlers._users[data.method](data, callback);
    }else{
        callback(405);
    }
}

//tokens handler
handlers.tokens = function(data, callback){
    //defining  the acceptable methods notice they are all in lowercase
    var acceptableMethods = ['get', 'put', 'post', 'delete'];

    if(acceptableMethods.indexOf(data.method) > -1){
        // _users is a private method
        handlers._tokens[data.method](data, callback);
    }else{
        callback(405);
    }
}

//private or sub-method _users
handlers._users = {
    
};

//Users - post
handlers._users.post = function(data, callback){

    //checking the fields
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0  ? data.payload.firstName.trim() : false;
    
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    
    //check on phone number or create a textnow accont to work with
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true: false;
    
    if(firstName && lastName && phone && password && tosAgreement){
        _data.read('users', phone, function(err, data){
            if(err){
                //hash the password
                var hashedPassword = helpers.hash(password)

                //create the userObject
                if(hashedPassword){
                    var userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'tosAgreement': true,
                        'hashedPassword': hashedPassword
                    }
                    //create new user identify by the phone
                    _data.create("users",phone, userObject, function(err){
                        if(!err){
                            callback(200)
                        }else{
                            console.log(err)
                            callback(500, {'Error': 'Could not create a new user'})
                        }
                    });
                }else{
                    callback(500, {"Error": "Error hashing the password"})
                }
            }else{
                callback(400, {"ERROR": "A user with that phone number already exists"})
            }
        })
    }else{
        callback(400, {"Error":"Missing required fields"})
    }
}

//Users - put
handlers._users.put = function(data, callback){
    //check the required fields
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone : false;
    //optional fields only one will be taken
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0  ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    //error if phone is invalid
    if(phone){
        if(firstName || lastName || password){
            //lookup the user
            _data.read("users", phone, function(err, userData){
                if(!err && userData){
                    //update the fields
                    if(firstName){
                        userData.firstName = firstName
                    }
                    if(lastName){
                        userData.lastName = lastName
                    }
                    if(password){
                        userData.hashedPassword = helpers.hash(password)
                    }
                    //store the updates

                    _data.update("users", phone,userData, function(err){
                        if(!err){
                            callback(200)
                        }else{
                            callback(500, {"Error":"Could not update the user"})
                        }
                    })
                }else{
                    console.log("marker", err," gello ", userData)
                    callback(400, {"Error": "the specified user does not exist"})
                }
            })
        }else{
            callback(400, {"Error": "Missing fields to update"})
        }
    }else{
        callback(400, {"Error": "Missing required field"})
    }

}

//Users - get
handlers._users.get = function(data, callback){
    //checkout the phone is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        //lookup the number 
         _data.read('users', phone, function(err, data){
             if(!err){
                //remove the hashed password
                delete data.hashedPassword;
                callback(200, data)
             }else{
                callback(404)
             }
         })
    }else{
        callback(400, {"Error": "Missing required field"});
    }
}

//Users - delete
handlers._users.delete = function(data, callback){
    //checkout the phone is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        //lookup the number 
         _data.read('users', phone, function(err, data){
             if(!err && data){
                _data.delete("users", phone, function(err){
                    if(!err){
                        callback(200)
                    }else{
                        callback(500, {"Error": "Could not delete the user"})
                    }
                })
             }else{
                callback(400)
             }
         })
    }else{
        callback(400, {"Error": "Missing required field"});
    }
}


//tokens sub method

handlers._tokens = {};

//post
//required : phone number and the password
handlers._tokens.post = function(data, callback){
    //check the required fields
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phone && password){
        //lookup the user with a matching phone number
        _data.read("users", phone, function(err, userData){
            if(!err && userData){
                //hash the sent password
                var hashedPassword = helpers.hash(password)
                if(hashedPassword == userData.hashedPassword){
                    //if valid password
                    //creating new token
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000*60*60;
                    var tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    };
                    //store the token
                    _data.create('tokens', tokenId, tokenObject, function(err){
                        if(!err){
                            callback(200, tokenObject)
                        }else{
                            callback(500, {"Error": "Could not create the new token"})
                        }
                    })
                }else{
                    callback(400, {"Error": "Password did not match the specified user"})
                }
            }else{
                callback(400, {"Error": "Could not find the specified user"})
            }
        })
    }else{
        callback(400, {"Error": "Missing required field(s)."})
    }
}

//notFoundHandler
handlers.notFound = function(data,callback){
    callback(404)
}

module.exports = handlers;