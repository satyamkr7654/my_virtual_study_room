const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const TokenService = require('./token.service');
const { AuthenticationError, ConflictError, NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Auth Service - Handle authentication business logic
 */
class AuthService {
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} User and token
     */
    static async register({ username, email, password }) {
        // Validate input
        if (!username || !email || !password) {
            throw new ValidationError('Please provide all required fields');
        }

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            throw new ConflictError('User already exists with this email or username');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
        });

        // Generate token
        const token = TokenService.generateToken({
            userId: user._id,
            username: user.username,
        });

        logger.info(`New user registered: ${user.username} (${user._id})`);

        return {
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            },
        };
    }

    /**
     * Login user
     * @param {Object} credentials - Login credentials
     * @returns {Promise<Object>} User and token
     */
    static async login({ email, password }) {
        // Validate input
        if (!email || !password) {
            throw new ValidationError('Please provide email and password');
        }

        // Find user
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            throw new AuthenticationError('Invalid credentials');
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new AuthenticationError('Invalid credentials');
        }

        // Generate token
        const token = TokenService.generateToken({
            userId: user._id,
            username: user.username,
        });

        logger.info(`User logged in: ${user.username} (${user._id})`);

        return {
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            },
        };
    }

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User data
     */
    static async getUserById(userId) {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return {
            id: user._id,
            username: user.username,
            email: user.email,
        };
    }
}

module.exports = AuthService;
