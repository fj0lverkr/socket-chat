import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {}
});

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'html/index.html'));
});

io.on('connection', (socket) => {
    console.log('Client connected @ ' + socket.id);
    socket.emit('chat message', 'SYSTEM: connected as ' + socket.id);

    socket.on('chat message', (msg) => {
        console.log(socket.id + ': ' + msg);
        socket.broadcast.emit('chat message', socket.id + ': ' + msg);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected from ' + socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});