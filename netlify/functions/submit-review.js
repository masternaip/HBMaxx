// netlify/functions/submit-review.js
const { neon } = require('@neondatabase/serverless');

// Ensure NETLIFY_DATABASE_URL is set as an environment variable in Netlify
const sql = neon(process.env.NETLIFY_DATABASE_URL);

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { movieId, rating, text, date, userId } = JSON.parse(event.body);

        // You might want to add validation here
        if (!movieId || !rating || !text || !userId) {
            return { statusCode: 400, body: 'Missing required fields' };
        }

        // Insert into your 'movie_reviews' table
        await sql`
            INSERT INTO movie_reviews (movie_id, rating, review_text, review_date, user_id)
            VALUES (${movieId}, ${rating}, ${text}, ${date}, ${userId});
        `;

        return { statusCode: 200, body: JSON.stringify({ message: 'Review submitted successfully' }) };
    } catch (error) {
        console.error('Error submitting review:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to submit review' }) };
    }
};