import config from "./config";
import passport from "passport";
import passportJwt from "passport-jwt";
import FacebookTokenStrategy from "passport-facebook-token";
import {Strategy as AppleTokenStrategy} from "passport-apple-token";
import {Strategy as GoogleTokenStrategy} from "passport-google-token";
import jwt from "jsonwebtoken";
import util from "util";
import redisClient from "../helpers/redis";
import responseJson from "../helpers/response";
import constants from "../helpers/constants";
import permissionsFunc from "./permissions";
import catalogService from "../api/modules/catalog/catalogService";
import authService from "../api/modules/auth/authService";
import {shortHash} from "../helpers/functions";

const createSession = (key, userId) => {
    redisClient.set(`sess-session-${key}`, userId, 'EX', config.auth.tokenExpire);
};
const updateTokenData = (data) => {
    redisClient.set(`sess-data-${data.id}`, data, 'EX', config.auth.tokenExpire);
};

export default {
    initialize: () => passport.initialize(),
    authenticate: (req, res, next, provider = 'jwt') => passport.authenticate(provider, {session: false, scope: ['email', 'profile']}, (err, user, info) => {
        if (err || !user) {
            const message = err ? err.message : info ? info.message : 'Login failed';
            const error = {message: util.format(constants.messages.unauthorized.text, message), code: constants.messages.unauthorized.code};
            return res.status(401).json(responseJson.error(error, req.user));
        }
        req.user = user;
        next();
    })(req, res, next),
    setFacebookStrategy: () => {
        const opts = config.auth.facebook;
        passport.use(new FacebookTokenStrategy(opts, (accessToken, refreshToken, profile, next) => {
                return authService.loginOAuth2(profile, opts.providerName)
                    .then(user => {
                        if (user) {
                            return next(null, user);
                        } else {
                            return next(null, false);
                        }
                    })
                    .catch(error => next(error, false));
            })
        );
    },
    setGoogleStrategy: () => {
        const opts = config.auth.google;
        passport.use(new GoogleTokenStrategy(opts, (accessToken, refreshToken, profile, next) => {
                return authService.loginOAuth2(profile, opts.providerName)
                    .then(user => {
                        if (user) {
                            return next(null, user);
                        } else {
                            return next(null, false);
                        }
                    })
                    .catch(error => next(error, false));
            })
        );
    },
    setAppleStrategy: () => {
        const opts = config.auth.apple;
        passport.use(new AppleTokenStrategy(opts, (accessToken, refreshToken, profile, next) => {
                // TODO: FIX APPLE-TOKEN STANDARD
                profile = {
                    id: profile.id,
                    name: profile.name,
                    emails: profile.email ? [{value: profile.email}] : undefined,
                    photos: profile.photos ? [{value: profile.photos}] : undefined,
                };
                // END:TODO
                return authService.loginOAuth2(profile, opts.providerName)
                    .then(user => {
                        if (user) {
                            return next(null, user);
                        } else {
                            return next(null, false);
                        }
                    })
                    .catch(error => next(error, false));
            })
        );
    },
    setJwtStrategy: () => {
        const opts = {
            jwtFromRequest: passportJwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.auth.secret,
            passReqToCallback: true
        };
        passport.use(new passportJwt.Strategy(opts, (req, payload, next) => {
                return redisClient.get(`sess-session-${payload.id}`)
                    .then(userId => userId && redisClient.get(`sess-data-${userId}`))
                    .then(user => {
                        if (user) {
                            user.sessionId = payload.id;
                            return next(null, user);
                        } else {
                            return next(null, false);
                        }
                    })
                    .catch(error => next(error, false));
            })
        );
    },
    makeLoginResponse: async (user, profile, forceLogin) => {

        // Validate max session
        if (forceLogin) await redisClient.delWildcard(`sess-session-${user.id}`)
        const sessions = forceLogin ? [] : await redisClient.getWildcard(`sess-session-${user.id}`);
        if (config.auth.sessions[user.role] > sessions.filter(item => !user.sessionId || item.replace('sess-session-', '') !== user.sessionId).length) {

            // Make token
            const sessionId = user.sessionId ? user.sessionId : `${user.id}${shortHash()}`;
            const payload = {
                id: user.id,
                role: user.role,
                status: user.status,
                profileId: profile.id,
                name: profile.name,
                language: profile.language,
                email: profile.email,
            };

            // Create session
            createSession(sessionId, payload.id);

            // Make data
            const permissionsUser = await permissionsFunc();
            const {permissions} = permissionsUser[user.role];
            const data = {
                userId: user.id,
                profileId: profile.id,
                permissions,
                role: user.role,
                status: user.status,
                lastLogin: user.lastLogin,
                username: user.username,
                name: profile.name,
                picture: profile.picture,
                language: profile.language,
            };
            const token = jwt.sign({id: sessionId}, config.auth.secret, {expiresIn: config.auth.tokenExpire});
            if (user.role === constants.users.type.MANAGER) {
                const catalogs = await catalogService.model.find({manager: profile.id});
                payload.myCatalogs = [];
                data.myCatalogs = [];
                catalogs.forEach(catalog => {
                    payload.myCatalogs.push(catalog.id);
                    data.myCatalogs.push({
                        id: catalog.id,
                        name: catalog.name,
                        status: catalog.status,
                        address: catalog.location.formattedAddress
                    });
                });
            }
            data.constants = constants.application;

            // Update user data
            updateTokenData(payload);
            return {data, token};
        } else {
            return Promise.reject({message: `Session max ${sessions.length}`, code: 'login.error'});
        }
    },
    updateTokenData,
    logout: (user = {}) => {
        return redisClient.delWildcard(`sess-session-${user.sessionId}`);
    },
};
