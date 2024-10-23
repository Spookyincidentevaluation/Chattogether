const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(cors());
app.use(express.static('public'));

const uri = 'mongodb+srv://ramkumarshort:Govardhan@cluster0.uwanp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

connectToDatabase();

let users = {};
const botNames = ['Arun', 'Sneha', 'Anu', 'Mahi', 'Vaishu'];

// Messages for each bot to choose from
const botMessages = {
    'Arun': ['Hi Anu How are you', 'Why Noone is Responding', 'Anyone interested in Chat', 'Hey how are you after long time', 'I am busy'],
    'Sneha': ['What’s your favorite movie?', 'I enjoy reading books.', 'Anyone here play video games?', 'I love pizza!', 'What’s your favorite food?'],
    'Anu': ['Let’s talk about travel!', 'Anyone been to Paris?', 'What’s your dream destination?', 'I love hiking!', 'The beach is my happy place.'],
    'Mahi': ['Music is life! What’s your favorite genre?', 'I can’t stop listening to pop music!', 'Do you play any instruments?', 'I love concerts!', 'What’s your favorite band?'],
    'Vaishu': ['How’s everyone doing?', 'Nice to meet you!', 'What’s up?', 'Anyone here into tech?', 'I love cooking']
};

// Add bots to the users object so they appear in the user list
botNames.forEach(botName => {
    users[botName] = { username: botName, isBot: true };
});

// Function to make bots send messages at intervals
function simulateBotMessages() {
    setInterval(() => {
        const bot = botNames[Math.floor(Math.random() * botNames.length)];
        const randomMessage = botMessages[bot][Math.floor(Math.random() * botMessages[bot].length)];

        // Send the bot's message to all clients
        io.emit('message', { username: bot, text: randomMessage });

        // DO NOT save the bot messages to the database
    }, 10000); // Bots send messages every 10 seconds (adjust as needed)
}

simulateBotMessages();

io.on('connection', (socket) => {
    console.log('New user connected');

    // Emit the user list including bots to the connected user
    socket.emit('userList', Object.values(users).map(user => user.username));

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

        // Send the message to all clients
        io.emit('message', { username: username, text: message });

        // Save message to the database (except for bot messages)
        if (!users[socket.id].isBot) {  // Check if the sender is not a bot
            const chatMessage = { username, text: message, timestamp: new Date() };
            const database = client.db('chatDB');
            const collection = database.collection('messages');
            await collection.insertOne(chatMessage);
        }
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
