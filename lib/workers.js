//dependancies
var path =require("path")
var fs = require("fs")
var _data = require("./data")
var https = require("https")
var http = require("http")
var helpers = require("./helpers")
var url = require("url")
var _logs = require("./logs")
var util = require("util")
var debug = util.debuglog("workers")

var workers = {};

workers.gatherAllChecks= function(){
    //get all the checks
    _data.list("checks", function(err, checks){
        if(!err && checks && checks.length > 0){
            checks.forEach(function(check){
                //read in the check data
                _data.read("checks", check, function(err, originalCheckData){
                    if(!err && originalCheckData){
                        //validate the check data
                        workers.validateCheckData(originalCheckData)
                    }else{
                        debug("Error reading one of the check's data :", err)
                    }
                })
            })
        }else{
            debug("Could not find any check to process")
        }
    })
}

//validate checks
workers.validateCheckData = function(originalCheckData){
        originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
        originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
        originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
        originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http:','https:'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
        originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
        originalCheckData.method = typeof(originalCheckData.method) == 'string' &&  ['post','get','put','delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
        originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
        originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;
        // Set the keys that may not be set (if the workers have never seen this check before)
        originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
        originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;
        
        if(originalCheckData.id &&
            originalCheckData.userPhone &&
            originalCheckData.protocol &&
            originalCheckData.url &&
            originalCheckData.method &&
            originalCheckData.successCodes &&
            originalCheckData.timeoutSeconds){
                workers.performCheck(originalCheckData)
            }else{
                debug("Error : One of the checks is not properly formatted skipping")
            }

}
workers.performCheck = function(originalCheckData){
    //prepare the initial check outcome
    var checkOutcome = {
        "error": false,
        "responseCode": false
    }
    //mark that the outcome has not been sent yet
    var outComeSent = false;

    //parse the hostname and the path ou of the original checkData

    ///## possible error in spelling of protocol
    var parsedUrl = url.parse(originalCheckData.protocol+"//"+originalCheckData.url, true)
    var hostname = parsedUrl.hostname;
    var path = parsedUrl.path; // using path and not pathname coz i want a query string

    //construct the request
    var requestDetails = {
        'protocol' : originalCheckData.protocol,
        'hostname': hostname,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': 1000*60
    }
    //instansiate the module using either the http or https modules
    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    var req = _moduleToUse.request(requestDetails, function(res){
        //grab the status of the sent request
        var status = res.statusCode;
        //update the checkOutCome and pass the data along
        checkOutcome.responseCode = status;
        if(!outComeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome)
            outComeSent = true; 
        }
    })
    //bind to the error so nothing is thrown which could lead to the termination of the program
    req.on("error", function(e){
        checkOutcome.error = {"error": true, "value" : e}
        if(!outComeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outComeSent = true
        }
    })

    // Bind to the timeout event
    req.on('timeout',function(){
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {'error' : true, 'value' : 'timeout'};
        if(!outComeSent){
        workers.processCheckOutcome(originalCheckData,checkOutcome);
        outComeSent = true;
        }
    });

    //end the request
    req.end()
}

workers.processCheckOutcome = function(originalCheckData, checkOutcome){
    //status
    var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? "up" : "down";
    //identify if an alert is warranted
    var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Log the outcome
    var timeOfCheck = Date.now();
    workers.log(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck);

    
    //update the checkData
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now()

    //save the updates
    _data.update("checks", newCheckData.id, newCheckData, function(err){
        if(!err){
            if(alertWarranted){
                workers.alertUserToStatusChange(newCheckData)
            }else{
                debug("Check outcome has not changed no alert needed")
            }
        }else{
            debug("Error trying to save updtes to one of the checks")
        }
    })

}
workers.alertUserToStatusChange = function(newCheckData){
    var msg = 'Alert: Your check for '+newCheckData.method.toUpperCase()+' '+newCheckData.protocol+'//'+newCheckData.url+' is currently '+newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone, msg, function(err){
        if(!err){
            debug("User was alerted of status change ", msg)
        }else{
            debug("Error: could not send sms to user who had state changed in the i check" , err)
        }
        
    })
}
//worker logs
workers.log = function(originalCheckData, checkOutCome, state, alertWarranted, timeOfCheck){
    //form the logData
    var logData = {
        "check": originalCheckData,
        "outcome": checkOutCome,
        "state": state,
        "alert": alertWarranted,
        "time": timeOfCheck
    }

    //conver the data to a string
    var logString = JSON.stringify(logData)

    //determine the name of the logfile
    var logFileName = originalCheckData.id;

    //append the log string to the file
    _logs.append(logFileName, logString, function(err){
        if(!err){
            debug("Logging to file succeeded")
        }else[
            debug("Logging to file failed")
        ]
    })
}



workers.loop = function(){
    setInterval(function(){
        workers.gatherAllChecks()
    }, 1000 * 60)
}

//compress logs
workers.rotateLogs = function(){
    //list all the noon compressed logstring
    _logs.list(false, function(err, logs){
        if(!err && logs && logs.length > 0){
            logs.forEach(function(logName){
                var logId = logName.replace(".log", "")
                var newFileId = logId+"-"+Date.now();

                _logs.compress(logId, newFileId, function(err){
                    if(!err){
                        //truncate the log
                        _logs.truncate(logId, function(err){
                            if(!err){
                                debug("Success truncating the log file")
                            }else{
                                debug("Error truncating the log")
                            }
                        })
                    }else{
                        debug("Error compressing the file", err)
                    }
                })
            })
        }else{
            debug("Could not find any logs to rotate")
        }
    })
}

workers.logRotationLoop = function(){
    setInterval(function(){
        workers.rotateLogs()
    }, 1000*60*60*24)
}

workers.init = function(){
    console.log('\x1b[33m%s\x1b[0m', "Background workers are running")
    workers.gatherAllChecks()
    workers.loop()
    workers.logRotationLoop()
};

workers.init()

module.exports = workers;