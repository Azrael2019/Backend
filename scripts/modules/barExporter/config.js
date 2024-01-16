import dotenv from "dotenv";

const result = dotenv.config({path: __dirname + '/.env'});
if (result.error) {
    throw result.error
}

export default {
    key: process.env.GOOGLE_API_KEY,
    defaultTerm: process.env.DEFAULT_TERM,
};
