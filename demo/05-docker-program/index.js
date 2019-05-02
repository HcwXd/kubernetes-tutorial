const express = require('express');
const app = express();
const fs = require('fs');
const docker = fs.readFileSync('./blue-docker.html', 'utf8');

app.get('/', function(req, res) {
  res.send(docker);
});
const server = require('http').Server(app);
const port = process.env.PORT || 3000;

server.listen(port, function() {
  console.log(`listening on port ${port}`);
});
