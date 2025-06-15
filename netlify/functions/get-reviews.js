// netlify/functions/get-reviews.js
const { neon } = require('@neondatabase/serverless');

// Ensure NETLIFY_DATABASE_URL is set as an environment variable in Netlify
const sql = neon(process.env.NETLIFY_DATABASE_URL);

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const movieId = event.queryStringParameters.movieId;

    if (!movieId) {
        return { statusCode: 400, body: 'Missing movie ID parameter' };
    }

    try {
        const reviews = await sql`
            SELECT movie_id, rating, review_text as text, review_date as date, user_id
            FROM movie_reviews
            WHERE movie_id = ${movieId}
            ORDER BY review_date DESC;
        `;

        return { statusCode: 200, body: JSON.stringify(reviews) };
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch reviews' }) };
    }
};