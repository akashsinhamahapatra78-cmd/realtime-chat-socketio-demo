const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected users
const users = {};
const messages = [];

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Get all messages
app.get('/messages', (req, res) => {
  res.json({ messages });
});

// Get connected users
app.get('/users', (req, res) => {
  res.json({ users: Object.values(users) });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Handle user registration
  socket.on('register', (userData) => {
    users[socket.id] = { id: socket.id, name: userData.name };
    console.log('User registered:', userData.name);
    
    // Broadcast user list to all clients
    io.emit('userList', { users: Object.values(users) });
    
    // Notify all users that someone joined
    io.emit('userJoined', { 
      message: `${userData.name} joined the chat`,
      user: users[socket.id]
    });
  });

  // Handle incoming messages
  socket.on('sendMessage', (messageData) => {
    const user = users[socket.id];
    if (user) {
      const message = {
        id: socket.id,
        userName: user.name,
        text: messageData.text,
        timestamp: new Date().toISOString()
      };
      messages.push(message);
      
      // Broadcast message to all clients
      io.emit('receiveMessage', message);
      console.log(`Message from ${user.name}: ${messageData.text}`);
    }
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      console.log('User disconnected:', user.name);
      delete users[socket.id];
      
      // Broadcast updated user list
      io.emit('userList', { users: Object.values(users) });
      
      // Notify all users that someone left
      io.emit('userLeft', {
        message: `${user.name} left the chat`,
        user: user
      });
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

module.exports = server;
