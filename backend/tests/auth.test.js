const request = require('supertest');
const app = require('../src/app');
const db = require('./db_setup');
const User = require('../src/models/User.model');

// Set env vars for test
process.env.JWT_SECRET = 'test-jwt-secret';

beforeAll(async () => {
    await db.connect();
});

afterEach(async () => {
    await db.clear();
});

afterAll(async () => {
    await db.close();
});

describe('Auth API', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123'
                });

            // Based on logs: 201 Created
            expect(res.statusCode).toEqual(201);

            // Response wraps data in 'data' prop
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data).toHaveProperty('user');
            expect(res.body.data.user.email).toBe('test@example.com');
        });

        it('should not register user with existing email', async () => {
            // Create user first
            await User.create({
                username: 'existing',
                email: 'test@example.com',
                password: 'password123'
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'newuser',
                    email: 'test@example.com',
                    password: 'password123'
                });

            // Based on logs: 409 Conflict
            expect(res.statusCode).toEqual(409);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login valid user', async () => {
            // Register user via API or Model
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'loginuser',
                    email: 'login@example.com',
                    password: 'password123'
                });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toHaveProperty('token');
        });

        it('should reject invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'wrong@example.com',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toEqual(401);
        });
    });
});
