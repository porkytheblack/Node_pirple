/*
*Data storage logic happens here
*
*/

//dependancies

var fs = require("fs")
var path = require("path")

//container for the module to be exported
var lib = {}

//the base dir
lib.baseDir = path.join(__dirname,'/../.data/')

//lets write data to a file
lib.create = function(dir, filename, data, callback){
    //open the file
    fs.open(lib.baseDir+dir+'/'+filename+'.json', 'wx', function(err, fileDescriptor){
        if(!err && fileDescriptor){
            //convert data to string
            var stringData = JSON.stringify(data)

            //write to file then close it
            fs.writeFile(fileDescriptor, stringData, function(err){
                if(!err){
                    fs.close(fileDescriptor, function(err){
                        if(!err){
                            callback(false)
                        }else{
                            callback("Error closing the file")
                        }
                    })
                }else{
                    callback("Error writing to file")
                }
            })
        }else{
            callback("Could not create a new file it may already exist")
        }
    })
}

//read from the file
lib.read = function(dir, filename, callback){
    fs.readFile(lib.baseDir+dir+'/'+filename+'.json', 'utf-8',function(err, data){
        callback(err, data)
    } )
}

//updating data in the file
lib.update = function(dir, filename, data, callback){
    //open up the file
    fs.open(lib.baseDir+dir+'/'+filename+'.json', 'r+', function(err, fileDescriptor){
        if(!err && fileDescriptor){
            //converting the file data to a string
            var stringData = JSON.stringify(data)

            //truncating the data
            fs.ftruncate(fileDescriptor, function(err){
                if(!err){
                    fs.writeFile(fileDescriptor, stringData, function(err){
                        if(!err){
                            fs.close(fileDescriptor, function(err){
                                if(!err){
                                    callback(false)
                                }else{
                                    callback("Error closing an existing file")
                                }
                            })
                        }else{
                            callback("Error writting to an existing file")
                        }
                    })
                }else{
                    callback("Error truncating")
                }
            })
        }
    })
}
//deleting data
lib.delete = function(dir, filename,callback){
        //perform the unlinking 
        fs.unlink(lib.baseDir+dir+'/'+filename+'.json', function(err){
            if(!err){
                callback(false)
            }else{
                callback("Error deleting file")
            }
        })
}

//export the module
module.exports = lib;