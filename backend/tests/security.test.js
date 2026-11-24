const http = require('http');
const request = require('supertest');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { config } = require('../src/config/environment');
const initializeSocket = require('../src/socket/socketManager');
const Message = require('../src/models/Message.model');
const Room = require('../src/models/Room.model');
const db = require('./db_setup');

let server;
let io;
let url;
let host;
let guest;
let outsider;
let room;
const open = [];

const register = async (username) => {
    const res = await request(app)
        .post('/api/auth/register')
        .send({ username, email: `${username}@example.com`, password: 'password123' });
    return res.body.data;
};
const as = (who, req) => req.set('Authorization', `Bearer ${who.token}`);
const once = (socket, event) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), 3000);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
});
const socketFor = (token) => {
    const socket = connect(url, { auth: { token }, forceNew: true, reconnection: false });
    open.push(socket);
    return socket;
};
const connected = async (who) => {
    const socket = socketFor(who.token);
    await once(socket, 'connect');
    return socket;
};
const joined = async (who, roomId = room.id) => {
    const socket = await connected(who);
    const result = await socket.timeout(3000).emitWithAck('join-room', { roomId });
    expect(result.ok).toBe(true);
    return socket;
};

beforeAll(async () => {
    await db.connect();
    server = http.createServer(app);
    io = new Server(server);
    initializeSocket(io);
    app.set('io', io);
    await new Promise((resolve) => server.listen(0, resolve));
    url = `http://localhost:${server.address().port}`;

    host = await register('host');
    guest = await register('guest');
    outsider = await register('outsider');
    const created = await as(host, request(app).post('/api/rooms')).send({ name: 'Private' });
    room = created.body.data.room;
    await as(guest, request(app).post('/api/rooms/join')).send({ code: room.code }).expect(200);
});

afterEach(() => {
    open.splice(0).forEach((socket) => socket.close());
});

afterAll(async () => {
    await new Promise((resolve) => io.close(resolve));
    await db.close();
});

describe('Room membership (REST)', () => {
    it('lists only rooms the user belongs to, without notes', async () => {
        const mine = await as(guest, request(app).get('/api/rooms'));
        expect(mine.body.data.rooms.map((r) => r._id)).toEqual([room.id]);
        expect(mine.body.data.rooms[0]).not.toHaveProperty('documentContent');

        const theirs = await as(outsider, request(app).get('/api/rooms'));
        expect(theirs.body.data.rooms).toEqual([]);
    });

    it('blocks outsiders from the room and its messages', async () => {
        await as(outsider, request(app).get(`/api/rooms/${room.id}`)).expect(403);
        await as(outsider, request(app).get(`/api/rooms/${room.id}/messages`)).expect(403);
        await as(guest, request(app).get(`/api/rooms/${room.id}`)).expect(200);
        await as(guest, request(app).get(`/api/rooms/${room.id}/messages`)).expect(200);
    });

    it('lets only the host delete', async () => {
        await as(guest, request(app).delete(`/api/rooms/${room.id}`)).expect(403);
    });

    it('limits room code guessing per user', async () => {
        const guesser = await register('guesser');
        const guess = () => as(guesser, request(app).post('/api/rooms/join')).send({ code: '000000' });
        for (let i = 0; i < 10; i++) await guess().expect(404);
        const blocked = await guess();
        expect(blocked.statusCode).toBe(429);
        expect(blocked.body.error).toMatch(/wrong room codes/);
    });

    it('honours RATE_LIMIT_MAX', async () => {
        const res = await request(app).get('/api/health');
        expect(res.headers['ratelimit-limit']).toBe(String(config.rateLimit.max));
    });
});

describe('Socket security', () => {
    it.each([
        ['missing', undefined],
        ['garbage', 'nope'],
        ['forged', jwt.sign({ userId: 'x' }, 'wrong-secret', { expiresIn: '1h' })],
    ])('rejects a %s token', async (_name, token) => {
        const error = await once(socketFor(token), 'connect_error');
        expect(error.message).toBe('Unauthorized');
    });

    it('rejects an expired token', async () => {
        const token = jwt.sign({ userId: host.user.id }, config.jwt.secret, { expiresIn: -1 });
        expect((await once(socketFor(token), 'connect_error')).message).toBe('Unauthorized');
    });

    it('disconnects when the token expires', async () => {
        const token = jwt.sign({ userId: host.user.id, username: 'host' }, config.jwt.secret, { expiresIn: 2 });
        const socket = socketFor(token);
        const gone = once(socket, 'disconnect');
        await once(socket, 'connect');
        await expect(gone).resolves.toBe('io server disconnect');
    });

    it('survives malformed events', async () => {
        const socket = await connected(guest);
        const events = ['join-room', 'join-call', 'leave-call', 'media-state', 'leave-room', 'video-offer', 'video-answer',
            'ice-candidate', 'chat-message', 'notes-open', 'notes-update'];
        for (const event of events) {
            for (const payload of [undefined, null, 'x', 5, []]) {
                const error = once(socket, 'error');
                socket.emit(event, payload);
                expect((await error).message).toBe('Invalid event data');
            }
        }
        const error = once(socket, 'error');
        socket.emit('join-room', { roomId: { $ne: null } });
        expect((await error).message).toBe('Invalid room ID');
        expect(socket.connected).toBe(true);
    });

    it('blocks outsiders from joining, chatting and editing', async () => {
        const socket = await connected(outsider);
        for (const [event, extra] of [['join-room', {}], ['chat-message', { content: 'hi' }],
            ['notes-update', { update: Buffer.from([0, 0]) }], ['notes-open', {}], ['join-call', {}], ['media-state', {}]]) {
            const error = once(socket, 'error');
            socket.emit(event, { roomId: room.id, ...extra });
            expect((await error).event).toBe(event);
        }
        expect(await Message.countDocuments()).toBe(0);
        expect((await Room.findById(room.id)).documentContent).toBe('');
    });

    it('takes the sender from the token, not the payload', async () => {
        const a = await joined(host);
        const b = await joined(guest);
        const received = once(a, 'chat-message');
        b.emit('chat-message', { roomId: room.id, userId: host.user.id, username: 'host', content: 'hi' });
        expect((await received).username).toBe('guest');
        expect(String((await Message.findOne()).user)).toBe(guest.user.id);
    });

    it('rejects bad chat content', async () => {
        const socket = await joined(guest);
        for (const payload of [{ content: '  ' }, { content: 'x'.repeat(2001) }, { content: { a: 1 } },
            { content: 'f', fileId: 'https://evil.example/x' }, { content: 'f', fileId: room.id }]) {
            const error = once(socket, 'error');
            socket.emit('chat-message', { roomId: room.id, ...payload });
            expect((await error).event).toBe('chat-message');
        }
    });

    it('relays video signals only within a room', async () => {
        const a = await joined(host);
        const b = await joined(guest);
        const received = once(a, 'video-offer');
        b.emit('video-offer', { to: a.id, offer: { sdp: '1' } });
        expect(await received).toEqual({ offer: { sdp: '1' }, from: b.id, username: 'guest' });

        const own = await as(outsider, request(app).post('/api/rooms')).send({ name: 'Other' });
        const c = await joined(outsider, own.body.data.room.id);
        const error = once(c, 'error');
        c.emit('video-offer', { to: a.id, offer: {} });
        expect((await error).event).toBe('video-offer');
    });

    it('evicts members when the room is deleted', async () => {
        const created = await as(host, request(app).post('/api/rooms')).send({ name: 'Temp' });
        const { id } = created.body.data.room;
        const socket = await joined(host, id);
        const notice = once(socket, 'room-deleted');
        await as(host, request(app).delete(`/api/rooms/${id}`)).expect(200);
        await notice;
        const error = once(socket, 'error');
        socket.emit('chat-message', { roomId: id, content: 'still here' });
        expect((await error).message).toBe('You are not in this room');
    });
});
