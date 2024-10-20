document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let selectedUser = null;
    const messageSound = document.getElementById('messageSound');

    // Prompt user for username and emit only if valid
    let username;
    do {
        username = prompt("Enter your username:");
    } while (!username);  // Keep asking until a valid username is provided

    // Emit 'join' event
    socket.emit('join', username);

    // Handle username error
    socket.on('usernameError', (errorMessage) => {
        alert(errorMessage);
        location.reload(); // Reload the page to ask for a new username again
    });

    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
    });

    // Display users
    socket.on('userList', (userList) => {
        const usersUl = document.getElementById('users');
        usersUl.innerHTML = '';
        userList.forEach((user) => {
            const li = document.createElement('li');
            li.textContent = user;
            li.addEventListener('click', () => {
                selectedUser = user;
                openPrivateMessageModal();
                document.getElementById('privateUser').textContent = user; // Set the private user display
            });
            usersUl.appendChild(li);
        });
    });

    // Open the private message modal
    function openPrivateMessageModal() {
        const modal = document.getElementById('privateMessageModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    // Close the private message modal
    document.querySelector('.close').onclick = function () {
        document.getElementById('privateMessageModal').style.display = 'none';
    };

    // Send a private message
    document.getElementById('sendPrivateMessageButton').addEventListener('click', () => {
        const privateMessage = document.getElementById('privateMessageInput').value;
        if (selectedUser && privateMessage.trim()) {
            // Emit the private message to the server
            socket.emit('privateMessage', { to: selectedUser, message: privateMessage });

            // Display the private message on the sender's own screen
            displayMessage(`(You to ${selectedUser}): ${privateMessage}`);

            // Clear input and close modal
            document.getElementById('privateMessageInput').value = '';
            document.getElementById('privateMessageModal').style.display = 'none';
        } else {
            alert('Select a user for private messaging and enter a message!');
        }
    });

    // Display messages
    socket.on('message', (message) => {
        if (message.type === 'join') {
            displayStyledMessage(`${message.username} joined the chat!`, 'join');
        } else if (message.type === 'leave') {
            displayStyledMessage(`${message.username} left the chat!`, 'leave');
        } else {
            displayMessage(`${message.username}: ${message.text}`);
        }
        messageSound.play(); // Play sound on new message
        showNotification(message.username, message.text); // Show notification
    });

    // Display private messages
    socket.on('privateMessage', (message) => {
        // Only display the private message for the recipient
        displayMessage(`(Private) ${message.from}: ${message.text}`);
        messageSound.play(); // Play sound on new private message
        showNotification(`Private message from ${message.from}`, message.text); // Show notification
    });

    // Helper function to display messages
    function displayMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        const timestamp = new Date().toLocaleTimeString();

        messageDiv.innerHTML = `<strong style="color: #4caf50;">${message.split(':')[0]}:</strong> <span style="color: #555;">${message.split(':')[1]}</span> <small style="color: #888;">(${timestamp})</small>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Helper function to display styled messages (joined/left) with different colors
    function displayStyledMessage(message, type) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        const timestamp = new Date().toLocaleTimeString();

        // Style join message in green and leave message in red
        const styleColor = type === 'join' ? '#4caf50' : '#f44336';
        messageDiv.innerHTML = `<strong style="color: ${styleColor};">${message}</strong> <small style="color: #888;">(${timestamp})</small>`;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to show notification
    function showNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }

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
        setTimeout(() => {
            document.getElementById('typingIndicator').style.display = 'none';
        }, 1000);
    });

    // Send message
    document.getElementById('sendButton').addEventListener('click', () => {
        const message = document.getElementById('messageInput').value;
        if (message.trim()) {
            socket.emit('sendMessage', message); // Just send the message, no need to display it manually
            document.getElementById('messageInput').value = ''; // Clear the input field
        }
    });
});
