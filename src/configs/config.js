import dotenv from "dotenv";
import constants from "../helpers/constants";
import {readFileSync} from "fs";
import {resolve} from "path";

dotenv.config();
const path = resolve(process.env.AUTH_APPLE_PATH_TO_KEY);

export default {
    auth: {
        secret: process.env.AUTH_SECRET || 'smartcommerce',
        facebook: {
            providerName: 'facebook-token',
            clientID: process.env.AUTH_FB_CLIENT_ID,
            clientSecret: process.env.AUTH_FB_CLIENT_SECRET,
        },
        google: {
            providerName: 'google-token',
            clientID: process.env.AUTH_GOOGLE_CLIENT_ID,
            clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET,
        },
        apple: {
            providerName: 'apple',
            clientID: process.env.AUTH_APPLE_CLIENT_ID,
            teamID: process.env.AUTH_APPLE_TEAM_ID,
            keyID: process.env.AUTH_APPLE_KEY_ID,
            key: readFileSync(path),
            callbackURL: 'https://app.smart-commerce.es/auth'
        },
        tokenExpire: 86400, // expires in 24 hours
        sessions: {
            [constants.users.type.USER]: 3,
            [constants.users.type.MANAGER]: 10,
            [constants.users.type.ADMIN]: 1,
        }
    },
    cors: {
        allowedHost: process.env.CORS_ALLOWED,
    },
    apiPrefix: '/api/v1',
    webURL: process.env.WEB_URL,
    managerURL: process.env.MANAGER_URL,
    timeZone: process.env.TIME_ZONE,
    apiPort: process.env.PORT || '3001',
    mongo: {
        url: process.env.MONGO_URL,
        options: {
            keepAlive: true,
        }
    },
    logs: {
        colorize: (process.env.LOGS_COLORIZE || 'false') === 'true',
        level: process.env.LOGS_CONSOLE_LEVEL || 'debug',
        silent: (process.env.LOGS_CONSOLE_SILENT || 'false') === 'true',
    },
    aws: {
        S3: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            region: process.env.S3_REGION,
            apiVersion: '2006-03-01',
            buckets: {
                pictureNews: {
                    name: process.env.S3_BUCKET,
                    alias: process.env.S3_ALIAS,
                    folder: (process.env.ENVIRONMENT || 'dev') + '/picture/news',
                },
                pictureProfile: {
                    name: process.env.S3_BUCKET,
                    alias: process.env.S3_ALIAS,
                    folder: (process.env.ENVIRONMENT || 'dev') + '/picture/profile',
                },
                pictureReward: {
                    name: process.env.S3_BUCKET,
                    alias: process.env.S3_ALIAS,
                    folder: (process.env.ENVIRONMENT || 'dev') + '/picture/reward',
                },
                pictureCatalog: {
                    name: process.env.S3_BUCKET,
                    alias: process.env.S3_ALIAS,
                    folder: (process.env.ENVIRONMENT || 'dev') + '/picture/catalog',
                },
                picturePromotion: {
                    name: process.env.S3_BUCKET,
                    alias: process.env.S3_ALIAS,
                    folder: (process.env.ENVIRONMENT || 'dev') + '/picture/promotion',
                },
                pictureSponsor: {
                    name: process.env.S3_BUCKET,
                    alias: process.env.S3_ALIAS,
                    folder: (process.env.ENVIRONMENT || 'dev') + '/picture/sponsor',
                },
            }
        },
        SES: {
            accessKeyId: process.env.SES_ACCESS_KEY_ID,
            secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
            region: process.env.SES_REGION,
            apiVersion: '2010-12-01',
            fromEmail: process.env.SES_FROM_EMAIL,
        },
        SNS: {
            accessKeyId: process.env.SNS_ACCESS_KEY_ID,
            secretAccessKey: process.env.SNS_SECRET_ACCESS_KEY,
            region: process.env.SNS_REGION,
            applicationsARN: {
                [constants.devices.type.ANDROID]: {
                    client: process.env.SNS_APP_ARN_ANDROID_CLIENT,
                    manager: process.env.SNS_APP_ARN_ANDROID,
                },
                [constants.devices.type.IOS]: {
                    client: process.env.SNS_APP_ARN_IOS_CLIENT,
                    manager: process.env.SNS_APP_ARN_IOS
                },
            }
        },
    },
    redis: {
        url: process.env.REDIS_URL,
        prefix: 'sb-' + (process.env.ENVIRONMENT || 'dev') + '-'
    },
    rateLimit: {
        default: {
            windowMs: process.env.LIMITER_WINDOWS_MS || 60 * 1000, // 1 minute
            max: process.env.LIMITER_MAX_REQUEST || 100, // limit each IP to 100 requests per windowMs
            message: {success: false, code: 'message.limiter', message: 'Too many requests, please try again later.'},
            keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip,
        },
        auth: {
            windowMs: 2 * 60 * 1000, // 2 minute
            max: 100, // limit each IP to 10 requests per windowMs
        },
        login: {
            windowMs: 2 * 60 * 1000, // 2 minute
            max: 150, // limit each IP to 15 requests per windowMs
        },
    },
    stripe: {
        secretAccessKey: process.env.STRIPE_KEY,
        plan: process.env.STRIPE_PLAN,
        currency: process.env.CURRENCY,
    },
    captcha: {
        secretKey: process.env.CAPTCHA_SECRET_KEY
    },
};
