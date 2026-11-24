const AuthService = require('../services/auth.service');
const logger = require('../utils/logger');

/**
 * Auth Controller - Handle HTTP requests for authentication
 */
class AuthController {
    /**
     * @route   POST /api/auth/register
     * @desc    Register a new user
     * @access  Public
     */
    static async register(req, res, next) {
        try {
            const { username, email, password } = req.body;

            const result = await AuthService.register({ username, email, password });

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @route   POST /api/auth/login
     * @desc    Login user
     * @access  Public
     */
    static async login(req, res, next) {
        try {
            const { email, password } = req.body;

            const result = await AuthService.login({ email, password });

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @route   GET /api/auth/me
     * @desc    Get current user
     * @access  Private
     */
    static async getMe(req, res, next) {
        try {
            const user = await AuthService.getUserById(req.user.userId);

            res.status(200).json({
                success: true,
                data: { user },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuthController;
