const http = require('http');
const request = require('supertest');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
const Y = require('yjs');
const app = require('../src/app');
const initializeSocket = require('../src/socket/socketManager');
const NotesService = require('../src/services/notes.service');
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

const register = async (username) => (await request(app)
    .post('/api/auth/register')
    .send({ username, email: `${username}@example.com`, password: 'password123' })).body.data;
const as = (who, req) => req.set('Authorization', `Bearer ${who.token}`);
const call = (socket, event, data) => socket.timeout(3000).emitWithAck(event, { roomId: room.id, ...data });
const once = (socket, event) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), 3000);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
});
const until = async (check) => {
    for (let i = 0; i < 100; i++) {
        if (await check()) return;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('condition not met');
};
const joined = async (who) => {
    const socket = connect(url, { auth: { token: who.token }, forceNew: true, reconnection: false });
    open.push(socket);
    await once(socket, 'connect');
    expect(await call(socket, 'join-room')).toMatchObject({ ok: true });
    return socket;
};
const upload = (who, content, name) => as(who, request(app).post(`/api/rooms/${room.id}/files`))
    .attach('file', Buffer.from(content), name);
const binary = (res, done) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => done(null, Buffer.concat(chunks)));
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
});

beforeEach(async () => {
    const created = await Room.create({
        name: 'Room',
        code: String(Math.floor(100000 + Math.random() * 900000)),
        host: host.user.id,
        participants: [host.user.id, guest.user.id],
    });
    room = { id: created.id };
});

afterEach(() => {
    open.splice(0).forEach((socket) => socket.close());
});

afterAll(async () => {
    await NotesService.flush();
    await new Promise((resolve) => io.close(resolve));
    await db.close();
});

describe('Chat', () => {
    it('returns the newest messages first, oldest on top, in pages', async () => {
        await Message.insertMany(Array.from({ length: 60 }, (_, i) => ({
            room: room.id, user: host.user.id, username: 'host', content: `m${i}`,
        })));
        const page = (q = '') => as(guest, request(app).get(`/api/rooms/${room.id}/messages${q}`));

        const first = (await page()).body.data;
        expect(first.messages).toHaveLength(50);
        expect(first.messages[0].content).toBe('m10');
        expect(first.messages[49].content).toBe('m59');
        expect(first.hasMore).toBe(true);

        const older = (await page(`?before=${first.messages[0].id}`)).body.data;
        expect(older.messages.map((m) => m.content)).toEqual(Array.from({ length: 10 }, (_, i) => `m${i}`));
        expect(older.hasMore).toBe(false);

        expect((await page('?before=nope')).statusCode).toBe(400);
    });

    it('saves identical messages sent twice, but a retry only once', async () => {
        const socket = await joined(guest);
        const a = await call(socket, 'chat-message', { content: 'ok', clientId: 'a' });
        const b = await call(socket, 'chat-message', { content: 'ok', clientId: 'b' });
        const retry = await call(socket, 'chat-message', { content: 'ok', clientId: 'b' });
        expect(a.data.id).not.toBe(b.data.id);
        expect(retry.data.id).toBe(b.data.id);
        expect(await Message.countDocuments({ room: room.id })).toBe(2);
    });

    it('reports a failed send to the sender', async () => {
        const socket = await joined(guest);
        expect(await call(socket, 'chat-message', { content: '' }))
            .toEqual({ ok: false, message: 'Message cannot be empty', status: 400 });
    });
});

describe('Files', () => {
    it('uploads, shares and downloads a file', async () => {
        const res = await upload(guest, '%PDF-1.4 hello', 'भौतिकी notes.pdf');
        expect(res.statusCode).toBe(201);
        const { file } = res.body.data;
        expect(file).toMatchObject({ name: 'भौतिकी notes.pdf', type: 'application/pdf', size: 14 });

        const a = await joined(host);
        const b = await joined(guest);
        const received = once(a, 'chat-message');
        await call(b, 'chat-message', { fileId: file.id });
        expect(await received).toMatchObject({ fileId: file.id, fileName: 'भौतिकी notes.pdf', username: 'guest' });

        const down = await as(host, request(app).get(`/api/rooms/${room.id}/files/${file.id}`)).buffer().parse(binary);
        expect(down.statusCode).toBe(200);
        expect(down.body.toString()).toBe('%PDF-1.4 hello');
        expect(down.headers['content-disposition']).toMatch(/^attachment/);
    });

    it('blocks outsiders and other rooms', async () => {
        const { file } = (await upload(guest, 'hi', 'a.txt')).body.data;
        expect((await upload(outsider, 'hi', 'a.txt')).statusCode).toBe(403);
        await as(outsider, request(app).get(`/api/rooms/${room.id}/files/${file.id}`)).expect(403);
        await request(app).get(`/api/rooms/${room.id}/files/${file.id}`).expect(401);

        const other = (await as(outsider, request(app).post('/api/rooms')).send({ name: 'O' })).body.data.room;
        await as(outsider, request(app).get(`/api/rooms/${other.id}/files/${file.id}`)).expect(404);
    });

    it('does not let someone share a file another member uploaded', async () => {
        const { file } = (await upload(host, 'hi', 'a.txt')).body.data;
        const socket = await joined(guest);
        expect(await call(socket, 'chat-message', { fileId: file.id })).toMatchObject({ ok: false });
    });

    it.each([
        ['page.html', '<script>1</script>'],
        ['run.exe', 'MZ'],
        ['fake.pdf', '<script>1</script>'],
        ['bin.txt', 'a\0b'],
        ['noext', 'x'],
    ])('rejects %s', async (name, content) => {
        expect((await upload(host, content, name)).statusCode).toBe(400);
    });

    it('rejects missing and oversized files', async () => {
        await as(host, request(app).post(`/api/rooms/${room.id}/files`)).expect(400);
        const res = await upload(host, 'x'.repeat(10 * 1024 * 1024 + 1), 'big.txt');
        expect(res.statusCode).toBe(413);
        expect(res.body.error).toBe('File is larger than 10MB');
    });

    it('deletes files and messages with the room', async () => {
        await upload(host, 'hi', 'a.txt');
        await as(host, request(app).delete(`/api/rooms/${room.id}`)).expect(200);
        expect(await mongoose.connection.db.collection('files.files').countDocuments({ 'metadata.room': room.id })).toBe(0);
    });
});

describe('Shared notes', () => {
    // A minimal client, like the one in the browser
    const notesClient = async (who) => {
        const socket = await joined(who);
        const doc = new Y.Doc();
        socket.on('notes-update', ({ update }) => Y.applyUpdate(doc, new Uint8Array(update), 'remote'));
        const { data } = await call(socket, 'notes-open');
        Y.applyUpdate(doc, new Uint8Array(data.state), 'remote');
        doc.on('update', (update, origin) => {
            if (origin !== 'remote') socket.emit('notes-update', { roomId: room.id, update: Buffer.from(update) });
        });
        return { socket, doc, text: doc.getText('notes') };
    };

    it('merges simultaneous edits without losing either', async () => {
        const a = await notesClient(host);
        const b = await notesClient(guest);
        a.text.insert(0, 'Hello world');
        await until(() => b.text.toString() === 'Hello world');

        a.text.insert(0, 'A: ');
        b.text.insert(11, ' :B');
        await until(() => a.text.toString() === 'A: Hello world :B' && b.text.toString() === a.text.toString());
    });

    it('keeps notes after everyone leaves', async () => {
        const a = await notesClient(host);
        a.text.insert(0, 'saved');
        await until(async () => (await NotesService.getState(room.id)).length > 10);
        a.socket.close();
        await until(() => !NotesService.entries.has(room.id));
        expect((await Room.findById(room.id)).documentContent).toBe('saved');

        const b = await notesClient(guest);
        expect(b.text.toString()).toBe('saved');
    });

    it('brings over text written before notes were shared', async () => {
        await Room.updateOne({ _id: room.id }, { documentContent: 'old text' });
        const a = await notesClient(host);
        expect(a.text.toString()).toBe('old text');
        a.socket.close();
        await until(() => !NotesService.entries.has(room.id));
        const b = await notesClient(guest);
        expect(b.text.toString()).toBe('old text');
    });

    it.each([
        ['text', 'hello'],
        ['corrupt bytes', Buffer.from([255, 255, 255, 1, 2])],
        ['oversized data', Buffer.alloc(300 * 1024)],
    ])('rejects %s and keeps working', async (_name, update) => {
        const a = await notesClient(host);
        a.text.insert(0, 'safe');
        expect(await call(a.socket, 'notes-update', { update })).toMatchObject({ ok: false });
        const b = await notesClient(guest);
        expect(b.text.toString()).toBe('safe');
    });
});

describe('Video call', () => {
    const OFF = { audio: false, video: false, screen: false };

    it('tells newcomers who is in the call, and others about them', async () => {
        const a = await joined(host);
        const b = await joined(guest);
        expect((await call(a, 'join-call')).data.participants).toEqual([]);

        const seen = once(a, 'call-joined');
        const { data } = await call(b, 'join-call');
        expect(data.participants).toEqual([{ socketId: a.id, userId: host.user.id, username: 'host', media: OFF }]);
        expect(await seen).toEqual({ socketId: b.id, userId: guest.user.id, username: 'guest', media: OFF });
    });

    it('shares mic, camera and screen state, also with late joiners', async () => {
        const a = await joined(host);
        const b = await joined(guest);
        expect(await call(a, 'media-state', { audio: true })).toMatchObject({ ok: false });
        await call(a, 'join-call');
        const seen = once(b, 'media-state');
        await call(a, 'media-state', { audio: true, video: 'yes', screen: true });
        const media = { audio: true, video: false, screen: true };
        expect(await seen).toEqual({ socketId: a.id, media });
        expect((await call(b, 'join-call')).data.participants[0].media).toEqual(media);
    });

    it('announces leaving the call, the room and disconnecting exactly once', async () => {
        const a = await joined(host);
        const left = [];
        a.on('call-left', ({ socketId }) => left.push(socketId));
        const ids = [];
        for (const leave of [
            (s) => s.emit('leave-call', {}), (s) => s.emit('leave-room', {}), (s) => s.close(),
        ]) {
            const b = await joined(guest);
            await call(b, 'join-call');
            ids.push(b.id);
            leave(b);
            await until(() => left.length === ids.length);
            b.close();
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(left).toEqual(ids);
    });

    it('limits the call size', async () => {
        for (let i = 0; i < 6; i++) {
            expect(await call(await joined(i % 2 ? host : guest), 'join-call')).toMatchObject({ ok: true });
        }
        const extra = await joined(host);
        expect(await call(extra, 'join-call')).toEqual({ ok: false, message: 'The call is full (6 people)', status: 409 });
        open[0].close();
        await until(async () => (await call(extra, 'join-call')).ok);
    });
});

describe('Leaving a room for good', () => {
    const leave = (who) => as(who, request(app).post(`/api/rooms/${room.id}/leave`));

    it('ends membership and closes open tabs, until they join again', async () => {
        const socket = await joined(guest);
        const ended = once(socket, 'membership-ended');
        const closed = once(socket, 'disconnect');
        await leave(guest).expect(200);
        await Promise.all([ended, closed]);

        const list = await as(guest, request(app).get('/api/rooms'));
        expect(list.body.data.rooms.some((r) => r._id === room.id)).toBe(false);
        await as(guest, request(app).get(`/api/rooms/${room.id}`)).expect(403);

        const { code } = await Room.findById(room.id);
        await as(guest, request(app).post('/api/rooms/join')).send({ code }).expect(200);
        await joined(guest);
    });

    it('is not for the host or outsiders', async () => {
        const res = await leave(host);
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/Delete the room instead/);
        await leave(outsider).expect(403);
    });

    it('does not disturb other members', async () => {
        const a = await joined(host);
        await joined(guest);
        await leave(guest).expect(200);
        expect(await call(a, 'chat-message', { content: 'still here' })).toMatchObject({ ok: true });
    });
});

describe('Presence', () => {
    it('reports how many people are inside each room', async () => {
        const online = async () => (await as(host, request(app).get('/api/rooms')))
            .body.data.rooms.find((r) => r._id === room.id).online;
        expect(await online()).toBe(0);
        await joined(host);
        await joined(guest);
        const tab = await joined(guest);
        expect(await online()).toBe(2);
        tab.close();
    });

    it('counts each person once and drops them when they leave', async () => {
        const a = await joined(host);
        let users;
        a.on('presence', (data) => { users = data.users.map((u) => u.username).sort(); });
        const b = await joined(guest);
        const tab = await joined(guest);
        await until(() => users?.length === 2);
        b.close();
        tab.close();
        await until(() => users?.length === 1);
        expect(users).toEqual(['host']);
    });
});
