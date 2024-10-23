const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { MongoClient } = require('mongodb'); // Import MongoDB Client

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Use CORS middleware
app.use(cors()); // Enable CORS for all requests
app.use(express.static('public'));

const uri = 'mongodb+srv://ramkumarshort:Govardhan@cluster0.uwanp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // Replace with your MongoDB URI
const client = new MongoClient(uri);

// Connect to MongoDB
async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

// Call the function to connect to the database
connectToDatabase();

let users = {};

io.on('connection', (socket) => {
    console.log('New user connected');

    // Handle user joining with username
    socket.on('join', async (username) => {
        if (!username || Object.values(users).find(user => user.username === username)) {
            socket.emit('usernameError', 'Username is either empty or already taken.');
        } else {
            users[socket.id] = { username };
            io.emit('userList', Object.values(users).map(user => user.username));
            socket.broadcast.emit('message', { username: username, text: `${username} joined the chat!`, type: 'join' });

            // Fetch past messages and emit them
            await fetchMessages();
        }
    });

    // Handle sending a message to everyone
    socket.on('sendMessage', async (message) => {
        const username = users[socket.id].username;
        io.emit('message', { username: username, text: message });

        // Save message to the database
        const chatMessage = { username, text: message, timestamp: new Date() };
        const database = client.db('chatDB');
        const collection = database.collection('messages');
        await collection.insertOne(chatMessage);
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
            socket.broadcast.emit('message', { username: username, text: `${username} left the chat!`, type: 'leave' });
        }
    });
});

// Fetch past messages from the database
async function fetchMessages() {
    const database = client.db('chatDB');
    const collection = database.collection('messages');
    const messages = await collection.find({}).toArray();
    messages.forEach((message) => {
        io.emit('message', { username: message.username, text: message.text });
    });
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
