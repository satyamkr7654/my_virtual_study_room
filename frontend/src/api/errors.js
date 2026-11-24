/**
 * Turn an axios error into a message that can be shown to the user.
 */
export const getErrorMessage = (error, fallback = 'Something went wrong') => {
    if (!error.response) {
        return error.request ? 'Cannot reach the server. Please try again.' : fallback;
    }

    return error.response.data?.error || fallback;
};
