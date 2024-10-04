import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const db = await open({
    filename: 'chat.db',
    driver: sqlite3.Database
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_offset TEXT UNIQUE,
      content TEXT,
      stream_type TEXT
  );
`);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {}
});

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public/html/index.html'));
});

io.on('connection', async (socket) => {
    let welcomeMsg = 'SYSTEM: connected as ' + socket.id;
    let globalMsg = 'SYSTEM: ' + socket.id + ' connected to the server.';
    let result = await storeAndGetOffset(globalMsg, 'system');
    socket.emit('system message', welcomeMsg, -1);
    socket.broadcast.emit('system message', globalMsg, result ? result.lastID : -1);

    socket.on('chat message', async (msg, clientOffset, callback) => {
        let result = await storeAndGetOffset(msg, 'chat', clientOffset)
        if (result != -1) {
            socket.broadcast.emit('chat message', socket.id + ': ' + msg, result ? result.lastID : -1);
        }
        callback();
    });

    socket.on('disconnect', async () => {
        let msg = 'SYSTEM: ' + socket.id + ' left the server.';
        let result = await storeAndGetOffset(msg, 'system')
        socket.broadcast.emit('system message', msg, result ? result.lastID : -1);
    });

    if (!socket.recovered) {
        // if the connection state recovery was not successful
        try {
            await db.each('SELECT id, content, stream_type FROM messages WHERE id > ?',
                [socket.handshake.auth.serverOffset || 0],
                (_err, row) => {
                    socket.emit(row.stream_type + ' message', row.content, row.id);
                }
            )
        } catch (e) {
            // something went wrong
        }
    }
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});

const storeAndGetOffset = async function (msg, streamType, clientOffset = null) {
    try {
        // store the message in the database
        if (clientOffset) {
            return await db.run('INSERT INTO messages (content, stream_type, client_offset) VALUES (?, ?, ?)', msg, streamType, clientOffset);
        } else {
            return await db.run('INSERT INTO messages (content, stream_type) VALUES (?, ?)', msg, streamType);
        }
    } catch (e) {
        if (e.errno === 19 /* SQLITE_CONSTRAINT */) {
            // the message was already inserted, so we notify the client
            return -1;
        } else {
            // nothing to do, just let the client retry
        }
        return;
    }
}