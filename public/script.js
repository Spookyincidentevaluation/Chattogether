const socket = io();
let selectedUser = null;
const messageSound = document.getElementById('messageSound');

// Prompt user for username
const username = prompt("Enter your username:");
socket.emit('join', username);

// Display users
socket.on('userList', (userList) => {
    const usersUl = document.getElementById('users');
    usersUl.innerHTML = '';
    userList.forEach((user) => {
        const li = document.createElement('li');
        li.textContent = user;
        li.addEventListener('click', () => {
            selectedUser = user;
            alert(`Private message mode: ${user}`);
        });
        usersUl.appendChild(li);
    });
});

// Display messages
socket.on('message', (message) => {
    displayMessage(`${message.username}: ${message.text}`);
    messageSound.play(); // Play sound on new message
});

// Display private messages
socket.on('privateMessage', (message) => {
    displayMessage(`(Private) ${message.from}: ${message.text}`);
    messageSound.play(); // Play sound on new message
});

// Typing indicator
let typingTimeout;
document.getElementById('messageInput').addEventListener('input', () => {
    clearTimeout(typingTimeout);
    socket.emit('typing', username);
    document.getElementById('typingIndicator').style.display = 'block';
    typingTimeout = setTimeout(() => {
        document.getElementById('typingIndicator').style.display = 'none';
    }, 1000);
});

// Receive typing indication
socket.on('typing', (username) => {
    document.getElementById('typingIndicator').textContent = `${username} is typing...`;
});

// Send a group message
document.getElementById('sendButton').addEventListener('click', () => {
    const message = document.getElementById('messageInput').value;
    socket.emit('sendMessage', message);
    document.getElementById('messageInput').value = '';
});

// Send a private message
document.getElementById('privateButton').addEventListener('click', () => {
    if (selectedUser) {
        const message = document.getElementById('messageInput').value;
        socket.emit('privateMessage', { to: selectedUser, message });
        displayMessage(`(You to ${selectedUser}): ${message}`);
        document.getElementById('messageInput').value = '';
    } else {
        alert('Select a user for private messaging!');
    }
});

// Helper function to display messages
function displayMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
