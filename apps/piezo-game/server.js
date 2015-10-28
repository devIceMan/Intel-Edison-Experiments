var express = require('express');
var app = express();
var path = require('path');

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

var libPath = path.join(__dirname, 'lib');
app.use(express.static(__dirname));

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Game app listening at http://%s:%s', host, port);
});

var io = require('socket.io').listen(server);
io.on('connection', function (socket) {
  console.log('a user connected');
  socket.on('disconnect', function () {
    console.log('user disconnected');
  });

  socket.on('room', function (room) {
    socket.join(room);
  });
});

//io.sockets.adapter.rooms['iot-game']

setInterval(function () {
  var x = io.sockets;
  var d = x;
}, 1000);