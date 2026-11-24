const request = require('supertest');
const app = require('../src/app');
const db = require('./db_setup');
const Room = require('../src/models/Room.model');

process.env.JWT_SECRET = 'test-jwt-secret';

let token;
let userId;

beforeAll(async () => {
    await db.connect();

    // Register a user for testing
    const res = await request(app)
        .post('/api/auth/register')
        .send({
            username: 'roomtester',
            email: 'roomtester@example.com',
            password: 'password123'
        });

    token = res.body.data.token;
    userId = res.body.data.user.id;
});

afterEach(async () => {
    // We only clear Room collection, keep User for token validity?
    // Actually db.clear() clears all. If we clear User, token becomes invalid if backend checks DB for user existence on every request.
    // Auth middleware usually just decodes token, but sometimes checks DB.
    // Let's check 'src/middleware/auth.middleware.js' later.
    // Ideally we should create user before each test if we clear DB.
    // For simplicity, let's just clear Room collection manually or recreate user in beforeEach.
    await Room.deleteMany({});
});

afterAll(async () => {
    await db.close();
});

describe('Room API', () => {
    beforeEach(async () => {
        // Re-create user if db.clear() was used?
        // Wait, I am NOT using db.clear() in afterEach above, I am only deleting Rooms.
        // But if I used db.clear() in other tests, it's fine as this is a separate file.
        // However, if I run all tests, they run in parallel or sequence? Jest default is parallel.
        // But they use same db_setup?
        // db_setup creates new MongoMemoryServer. 
        // If they run in parallel, 'let mongoServer' in db_setup.js is a singleton module variable?
        // Yes, 'require' caches the module.
        // So parallel tests might race on the single MongoMemoryServer instance if not careful.
        // Jest runs test files in parallel workers. Each worker gets its own module instance.
        // So it's safe.
    });

    describe('POST /api/rooms', () => {
        it('should create a new room', async () => {
            const res = await request(app)
                .post('/api/rooms')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Study Group A'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.room).toHaveProperty('code');
            expect(res.body.data.room.name).toBe('Study Group A');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/rooms')
                .send({
                    name: 'Study Group B'
                });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET /api/rooms', () => {
        it('should return list of rooms', async () => {
            // Create a room first
            await request(app)
                .post('/api/rooms')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Room 1' });

            const res = await request(app)
                .get('/api/rooms')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.rooms.length).toBeGreaterThan(0);
            expect(res.body.data.rooms[0]).toHaveProperty('code');
        });
    });
});
