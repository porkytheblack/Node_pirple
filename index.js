const http = require("http")
const https = require("https")
var fs = require("fs")
var helpers = require("./lib/helpers")
const url = require("url")
var handlers = require("./lib/handlers")
const StringDecoder = require("string_decoder").StringDecoder
const config = require("./config")


//instanciating the http server
var httpServer = http.createServer(function(req, res){
    unifiedServer(req, res)
})


//starting the http server
httpServer.listen(config.httpPort, function(){
    console.log("server listening on port ",config.httpPort)
})

//httpsServerOptions
var httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};


//instanciating the https server
var httpsServer = https.createServer(httpsServerOptions,function(req,res){
    unifiedServer(req, res)
})

//start the https server
httpsServer.listen(config.httpsPort, function(){
    console.log("server listening on port ", config.httpsPort)
})





//unified server
var unifiedServer = function(req, res){
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
        var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

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
var router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens
}