const request = require('supertest');
const app = require('../src/app');
const db = require('./db_setup');
const User = require('../src/models/User.model');

let token;
let user;
const auth = (req) => req.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    await db.connect();
    const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'contract', email: 'contract@example.com', password: 'password123' });
    ({ token, user } = res.body.data);
});

afterAll(async () => {
    await db.close();
});

describe('API contract', () => {
    it('answers invalid input with a JSON 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'not valid', email: 'a@example.com', password: 'password123' });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Username must contain only letters and numbers');
    });

    it('answers unknown routes with a JSON 404', async () => {
        const res = await request(app).get('/api/nope');

        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });

    it('returns the current user from /auth/me', async () => {
        const res = await auth(request(app).get('/api/auth/me'));

        expect(res.statusCode).toBe(200);
        expect(res.body.data.user).toEqual(user);
        expect((await request(app).get('/api/auth/me')).statusCode).toBe(401);
    });

    it('returns 404 from /auth/me when the user no longer exists', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'gone', email: 'gone@example.com', password: 'password123' });
        await User.findByIdAndDelete(res.body.data.user.id);

        const me = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${res.body.data.token}`);
        expect(me.statusCode).toBe(404);
    });

    it('returns room messages, and 400 for a malformed room id', async () => {
        const created = await auth(request(app).post('/api/rooms')).send({ name: 'Room' });
        const { id } = created.body.data.room;

        const res = await auth(request(app).get(`/api/rooms/${id}/messages`));
        expect(res.statusCode).toBe(200);
        expect(res.body.data.messages).toEqual([]);

        const bad = await auth(request(app).get('/api/rooms/123/messages'));
        expect(bad.statusCode).toBe(400);
    });
});
