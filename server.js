const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let users = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New user connected');

    // Handle user joining with username
    socket.on('join', (username) => {
        // Ensure the username is not empty and doesn't already exist
        if (!username || Object.values(users).find(user => user.username === username)) {
            socket.emit('usernameError', 'Username is either empty or already taken.');
        } else {
            users[socket.id] = { username };
            io.emit('userList', Object.values(users).map(user => user.username));
            // Emit a message using the actual username
            socket.broadcast.emit('message', { username: username, text: `${username} joined the chat!`, type: 'join' });
        }
    });

    // Handle sending a message to everyone
    socket.on('sendMessage', (message) => {
        const username = users[socket.id].username;
        io.emit('message', { username: username, text: message });
    });

    // Handle sending a private message
    socket.on('privateMessage', (data) => {
        const recipientSocketId = Object.keys(users).find(key => users[key].username === data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('privateMessage', { from: users[socket.id].username, text: data.message });
        }
    });

    // Handle typing indicator
    socket.on('typing', (username) => {
        socket.broadcast.emit('typing', username);
    });

    // Handle user disconnecting
    socket.on('disconnect', () => {
        const username = users[socket.id]?.username;
        if (username) {
            delete users[socket.id];
            io.emit('userList', Object.values(users).map(user => user.username));
            // Emit a message using the actual username
            socket.broadcast.emit('message', { username: username, text: `${username} left the chat!`, type: 'leave' });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
