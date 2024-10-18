const express = require('express');
const http = require('http');
const socketIO = require('socket.io'); // Correctly import socket.io

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Store users
let users = {};

// Serve the static files
app.use(express.static('public'));

// Listen for connections
io.on('connection', (socket) => {
    console.log('New user connected');

    // User joins with a username
    socket.on('join', (username) => {
        users[socket.id] = username; // Store the username associated with the socket ID
        io.emit('userList', Object.values(users)); // Send updated user list to everyone
        socket.broadcast.emit('message', { username: 'System', text: `${username} joined the chat!` });
    });

    // Send group messages
    socket.on('sendMessage', (message) => {
        io.emit('message', { username: users[socket.id], text: message }); // Broadcast message to all users
    });

    // Send private messages
    socket.on('privateMessage', (data) => {
        const recipientSocketId = Object.keys(users).find(key => users[key] === data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('privateMessage', { from: users[socket.id], text: data.message }); // Send private message to the recipient
        }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        const username = users[socket.id];
        delete users[socket.id]; // Remove user from the list
        io.emit('userList', Object.values(users)); // Send updated user list to all users
        socket.broadcast.emit('message', { username: 'System', text: `${username} left the chat!` }); // Notify others about the user leaving
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export the app for Vercel
module.exports = app;
