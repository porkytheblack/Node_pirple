const server = require("./lib/server")
const workers = require("./lib/workers")


//the app
var app = {};

app.init = function(){
    //run the server
    server.init()
    //run the workers
    workers.init()
}

app.init()

module.exports = app;