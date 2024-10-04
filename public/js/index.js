let counter = 0;

const socket = io({
    auth: {
        serverOffset: 0
    },
    // enable retries
    ackTimeout: 10000,
    retries: 3,
});

const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
        // compute a unique offset
        const clientOffset = `${socket.id}-${counter++}`;
        socket.emit('chat message', input.value, clientOffset);

        const item = document.createElement('li');
        item.classList.add('li_message_own');
        item.textContent = input.value;
        messages.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
        input.value = '';
    }
});

socket.on('chat message', (msg, serverOffset) => {
    const item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
    socket.auth.serverOffset = serverOffset;
});

socket.on('system message', (msg, serverOffset) => {
    const item = document.createElement('li');
    item.classList.add('li_message_system')
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
    socket.auth.serverOffset = serverOffset;
});