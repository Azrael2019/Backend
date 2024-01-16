import dotenv from "dotenv";

const result = dotenv.config({path: __dirname + '/.env'});
if (result.error) {
    throw result.error
}

export default {
    key: process.env.GOOGLE_API_KEY,
    defaultTerm: process.env.DEFAULT_TERM,
    defaultBarUrl: 'https://cdn.smart-commerce.es/email/default_commerce_image.png',
    googleResponse: {
        status: {
            PENDING: 'STATUS_PENDING',
            PROCESSED: 'STATUS_PROCESSED',
            ERROR: 'STATUS_ERROR',
        }
    }
};
