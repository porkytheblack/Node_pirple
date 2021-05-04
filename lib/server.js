const http = require("http")
const https = require("https")
var fs = require("fs")
var helpers = require("./helpers")
const url = require("url")
var handlers = require("./handlers")
const StringDecoder = require("string_decoder").StringDecoder
const config = require("./../config")
const path = require("path")


var server = {};

//instanciating the http server
server.httpServer = http.createServer(function(req, res){
    server.unifiedServer(req, res)
})


//httpsServerOptions
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
   'cert': fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};


//instanciating the https server
server.httpsServer = https.createServer(server.httpsServerOptions,function(req,res){
    server.unifiedServer(req, res)
})





//unified server
server.unifiedServer = function(req, res){
    var parsedUrl = url.parse(req.url, true)
    var path = parsedUrl.pathname
    var trimmedPath = path.replace(/^\/+|\/+$/g, "")
    var queryStringObject = parsedUrl.query
    var method = req.method.toLowerCase()
    var headers = req.headers
    //getting payload if any
    var decoder = new StringDecoder("utf-8")
    var buffer = ""
    req.on("data", function(data){
        buffer  += decoder.write(data)
    })
    req.on("end", function(){
        buffer += decoder.end()

        //choose handler
        var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        //construct data object to send to the handlers
        var data = {
            'trimmedPath' : trimmedPath,
            'queryStringObject' : queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        }
        //route the request to the handler chosen
        chosenHandler(data, function(statusCode, payload){
            statusCode = typeof(statusCode) == 'number' ? statusCode: 200;
            payload = typeof(payload) == 'object' ? payload : {};

            var payloadString = JSON.stringify(payload)
            res.setHeader("Content-Type","application/json")
            res.writeHead(statusCode)
            res.end(payloadString)
            console.log(trimmedPath, statusCode)
        })
    })
}

//define router
server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
}

server.init = function(){
    //starting the http server
    server.httpServer.listen(config.httpPort, function(){
        console.log('\x1b[36m%s\x1b[0m',"server listening on port "+config.httpPort)
    })


    //start the https server
    server.httpsServer.listen(config.httpsPort, function(){
        console.log('\x1b[35m%s\x1b[0m',"server listening on port "+ config.httpsPort)
    })
}

module.exports = server;