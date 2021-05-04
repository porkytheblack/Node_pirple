/*
*
* handlers 
*/

//dependancies
var _data = require('./data')
var helpers = require('./helpers')
var config = require('../config')


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

            //get the token from the headers
            var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            //verify that the given token is valid for the phone
            handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
                if(tokenIsValid){
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
                    callback(403, {"Error": "Missing required token in the header, or token is invalid"})
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

        //get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        //verify that the given token is valid for the phone
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
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
                callback(403, {"Error": "Missing required token in the header, or token is invalid"})
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

        //get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        //verify that the given token is valid for the phone
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                //lookup the number 
            _data.read('users', phone, function(err, data){
                if(!err && data){
                _data.delete("users", phone, function(err){
                    if(!err){
                        var userChecks = typeof(data.checks) == 'object' && data.checks instanceof Array ? data.checks : [];
                        var checksToDelete = userChecks.length;
                        if(checksToDelete > 0){
                            var checksDeleted = 0
                            var deletionErrors = false
                            //loop through the checks
                            userChecks.forEach(function(checkId){
                                //delete the check
                                _data.delete('checks', checkId, function(err){
                                    if(err){
                                        deletionErrors = true;
                                    }
                                    checksDeleted++;
                                    if(checksDeleted == checksToDelete){
                                        if(!deletionErrors){
                                            callback(200)
                                        }else{
                                            callback(500, {"Error":"Errors encountered while trying to delete all of the users checks. All checks may not have been deleted successfully"})
                                        }
                                    }
                                })
                            })
                        }
                    }else{
                        callback(500, {"Error": "Could not delete the user"})
                    }
                })
                }else{
                callback(400)
                }
            })
            }else{
                callback(403, {"Error": "Missing required token in the header, or token is invalid"})
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

//tokens get
handlers._tokens.get = function(data, callback){
    //check that id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    console.log(id, "this is id")
    if(id){
        //lookup the number 
         _data.read('tokens', id, function(err, tokenData){
             if(!err && tokenData){
                callback(200, tokenData)
             }else{
                callback(404)
             }
         })
    }else{
        callback(400, {"Error": "Missing required field, or field is invalid"});
    }
}

//tokens put
//only required field is id $ extend

handlers._tokens.put = function(data, callback){
    var id  = typeof(data.payload.id) == "string" && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == "boolean" && data.payload.extend == true ? true : false;
    if (id && extend){
        //lookup the existing token
        _data.read("tokens", id, function(err, tokenData){
            if(!err && tokenData){
                //check to make sure the token is not already expired
                if(tokenData.expires > Date.now()){
                    //set the expiration to an hour in the future
                    tokenData.expires = Date.now() + 1000*60*60;
                    //Store the new updates
                    _data.update("tokens", id, tokenData, function(err){
                        if(!err){
                            callback(200)
                        }else{
                            callback(500, {'Error' : "Could not update the token's expireation"})
                        }
                    })
                }else{
                    callback(400, {"Error": "The token is already expired, and cannot be extended"})
                }
            }else{
                callback(400, {"Error": "Specified user does not exist"})
            }
        })
    }else{
        callback(400, {"Error" : "Missing field(s) or field(s) are invalid"})
    }
}

//tokens -delete
handlers._tokens.delete = function(data, callback){
    //check that the id exists
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        //lookup the number 
         _data.read('tokens', id, function(err, data){
             if(!err && data){
                _data.delete("tokens", id, function(err){
                    if(!err){
                        callback(200)
                    }else{
                        callback(500, {"Error": "Could not delete the token"})
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

//verify the token is valid
handlers._tokens.verifyToken = function(id, phone, callback){
    //lookup the token
    _data.read('tokens', id, function(err, tokenData){
        if(!err && tokenData){
            //check that the token for the given user has not expired
            if(tokenData.phone == phone && tokenData.expires > Date.now()){
                callback(true);
            }else{
                callback(false)
            }
        }else{
            callback(false)
        }
    })
}

//checks handler
handlers.checks = function(data, callback){
    //defining  the acceptable methods notice they are all in lowercase
    var acceptableMethods = ['get', 'put', 'post', 'delete'];

    if(acceptableMethods.indexOf(data.method) > -1){
        // _users is a private method
        handlers._checks[data.method](data, callback);
    }else{
        callback(405);
    }
}

//checks private method
handlers._checks = {}

//post method
handlers._checks.post= function(data, callback){
    //validate inputs
    var protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol)>-1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false;
    var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <=5 ? data.payload.timeoutSeconds : false;
    
    if(protocol && url && method && successCodes && timeoutSeconds){
        //get the token from the headers
        var token = typeof(data.headers.token) == 'string' && data.headers.token.trim().length == 20? data.headers.token : false;
        
        //validate the token
        _data.read("tokens", token, function(err, tokenData){
            if(!err && tokenData){
                var userPhone = tokenData.phone;
                _data.read("users", userPhone, function(err, userData){
                    if(!err && userData){
                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        //verify the user has fewer number of checks than the maximum
                        if(userChecks.length < config.maxChecks){
                            //generate rndom id
                            var checkId = helpers.createRandomString(20);

                            //create check object including the userPhone
                            var checkObject = {
                                "id" : checkId,
                                "userPhone" : userPhone,
                                "protocol": protocol,
                                "url": url,
                                "method" : method,
                                "successCodes" : successCodes,
                                "timeoutSeconds": timeoutSeconds
                            };
                            _data.create("checks", checkId, checkObject, function(err){
                                
                                if(!err){
                                    //add checkId to the users object
                                    userData.checks = userChecks
                                    userData.checks.push(checkId)
                                    //save the new data to the user object
                                    _data.update("users", userPhone, userData, function(err){
                                        if(!err){
                                            callback(200, checkObject)
                                        }else{
                                            callback(500, {"Error": "Could not update the user with the new check"})
                                        }
                                    })
                                }else{
                                    callback(500, {"Error": "Could not create the new check"})
                                }
                            })
                        }else{
                            callback(400, {"Error": 'The user alreadyhas the maximum number of checks ('+config.maxChecks+')'})
                        }
                    }else{
                        callback(403)
                    }
                })
            }else{
                callback(403, {"Error" : "the user is not authorised"})
            }
        })
    }else{
        callback(400, {"Error": "Missing required field(s) or input(s) are invalid"})
    }
}

handlers._checks.get = function(data, callback){
    //check that id is valid 
    //checkout the phone is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        _data.read("checks", id, function(err, checkData){
            if(!err && checkData){
                //get the token from the headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                //verify that the given token is valid for the phone
                console.log("this is check Data :", checkData)
                handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
                    if(tokenIsValid){
                        //return thechaeck data
                        callback(200, checkData)
                    }else{
                        callback(403, {"Error": "Missing required token in the header, or token is invalid"})
                    }
                })
            }else{
                callback(404)
            }
        })
    }else{
        callback(400, {"Error": "Missing required field"});
    }
}

handlers._checks.put = function(data, callback){
    //check for the required field
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    //check for optional fields
    var protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol)>-1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false;
    var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <=5 ? data.payload.timeoutSeconds : false;

    //Error if id is invalid
    if(id){
        //Error if nothing is sent to update
        if(protocol || url || method || successCodes || timeoutSeconds){
            //lookup the check
            _data.read("checks", id, function(err, checkData){
                if(!err && checkData){
                    //get the token sent in the headers
                    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                     //verify that the given token is valid for the phone
                    handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
                        if(tokenIsValid){
                            //update the checkData where necessary
                            if(protocol){
                                checkData.protocol = protocol
                            }
                            if(url){
                                checkData.url = url
                            }
                            if(method){
                                checkData.method = method
                            }
                            if(successCodes){
                                checkData.successCodes = successCodes
                            }
                            if(timeoutSeconds){
                                checkData.timeoutSeconds = timeoutSeconds
                            }

                            //store the new data
                            _data.update("checks", id, checkData, function(err){
                                if(!err){
                                    callback(200)
                                }else{
                                    callback(500, {"Error": "COuld not update the check"})
                                }
                            })
                        }else{
                            callback(403)
                        }
                    })
                }else{
                    callback(400, {"Error":"Check id does not exist"})
                }
            })
        }else{
            callback(400, {"Error": "Missing fields to update"})
        }
    }else{
        callback(400, {"Error": "Missing required field"})
    }
}

//handler for deleting checks
handlers._checks.delete = function(data, callback){
    //checkout the phone is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){

        _data.read("checks", id, function(err, checkData){
            if(!err && checkData){
                //get the token from the headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                //verify that the given token is valid for the phone
            handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
                if(tokenIsValid){
                //lookup the number 
                _data.delete("checks", id, function(err){
                    if(!err){
                        _data.read("users", checkData.userPhone, function(err, userData){
                            if(!err && userData){
                                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks :[];

                                //remove the deleted check
                                var checkPosition = userChecks.indexOf(id)

                                if(checkPosition > -1){
                                    userChecks.splice(checkPosition, 1)

                                    //Re-save the usetrs data
                                    userData.checks = userChecks;
                                    _data.update('users', checkData.userPhone, userData,function(err){
                                        if(!err){
                                            callback(200)
                                        }else{
                                            callback(500, {"Error": "Could not update the user"})
                                        }
                                    })
                                }else{
                                    callback(500, {"Error": "Could not find the check on the user's object, so could not remove it"})
                                }

                            }else{
                                callback(500, {"Error" : "Could not find the user who created the check"})
                            }
                        })
                    }else{
                        callback(500, {"Error": "Failed to delete the check"})
                    }
                })
                }else{
                    callback(403, {"Error": "Missing required token in the header, or token is invalid"})
                }
            })
            }else{
                callback(400, {"Error": "Missing valid id"})
            }
        })
        
    }else{
        callback(400, {"Error": "Missing required field checkid"});
    }
}

//notFoundHandler
handlers.notFound = function(data,callback){
    callback(404)
}

module.exports = handlers;