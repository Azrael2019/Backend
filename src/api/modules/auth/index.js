import express from "express";
import responseJson from "../../../helpers/response";
import constants from "../../../helpers/constants";
import util from "util";
import auth from "../../../configs/auth";
import userService from "./authService";
import profileService from "../profile/profileService";
import deviceService from "../device/deviceService";
import config from "../../../configs/config";
import limiter from "../../../helpers/limiter";

const router = express.Router();
const authLimiter = limiter(config.rateLimit.auth);
const loginLimiter = limiter(config.rateLimit.login);

/* POST user login. */
router.post(constants.path.auth.login, loginLimiter, (req, res) => {

    // Call to login API
    userService.loginUser(req.body)
        .then(user => userLogged(user, res, req.body.forceLogin, req.body.role))
        .catch(error => {
            res.status(error.status || 200).json(responseJson.error(error, req.user));
        });
});

/* POST user login facebook. */
router.post(constants.path.auth.loginFacebook,
    loginLimiter,
    (req, res, next) => {
        req.body.access_token = req.body.accessToken;
        auth.authenticate(req, res, next, config.auth.facebook.providerName)
    },
    (req, res) => userLogged(req.user, res, req.body.forceLogin, req.body.role)
);

/* POST user login gmail. */
router.post(constants.path.auth.loginGoogle,
    loginLimiter,
    (req, res, next) => {
        req.body.access_token = req.body.accessToken;
        auth.authenticate(req, res, next, config.auth.google.providerName)
    },
    (req, res) => userLogged(req.user, res, req.body.forceLogin, req.body.role)
);

/* POST user login apple. */
router.post(constants.path.auth.loginApple,
    loginLimiter,
    (req, res, next) => {
        // TODO: FIX APPLE-TOKEN STANDARD
        req.body.code = req.body.authorizationCode;
        req.body.user = {name: req.body.fullName};
        // END:TODO
        auth.authenticate(req, res, next, config.auth.apple.providerName)
    },
    (req, res) => userLogged(req.user, res, req.body.forceLogin, req.body.role)
);

/* GET user logout. */
router.get(constants.path.auth.logout, (req, res, next) => auth.authenticate(req, res, next), (req, res) => {

    // Call to login API
    auth.logout(req.user);
    deviceService.deleteByQuery({user: req.user.id}, req.user).then();
    res.status(204).json(responseJson.success());
});

/* POST sign up. */
router.post(constants.path.auth.signUp, authLimiter, (req, res) => {
    userService.signUp(Object.assign(req.body, {role: constants.users.type.USER, status: constants.users.status.PENDING}))
        .then(async data => res.json(responseJson.success(await auth.makeLoginResponse(data.user, data.profile, true))))
        .catch(error => {
            res.status(error.status || 200).json(responseJson.error(error, req.user));
        });
});

/* POST sign up manager. */
router.post(constants.path.auth.signUpManager, authLimiter, (req, res) => {
    userService.signUp(Object.assign(req.body, {role: constants.users.type.MANAGER, status: constants.users.status.PENDING}))
        .then(async data => res.json(responseJson.success(await auth.makeLoginResponse(data.user, data.profile, true))))
        .catch(error => {
            res.status(error.status || 200).json(responseJson.error(error, req.user));
        });
});

/* POST user recovery password. */
router.post(constants.path.auth.recoveryPassword, authLimiter, (req, res) => {
    userService.generateRecoveryUserByUsername(req.body)
        .then(() => res.json(responseJson.success({message: "check your email"})))
        .catch(error => {
            res.status(error.status || 200).json(responseJson.error(error, req.user));
        });
});

/* POST user change password. */
router.post(constants.path.auth.changePassword, authLimiter, (req, res) => {
    userService.changeUserPasswordByToken(req.body)
        .then(user => userLogged(user, res, true, req.params.role))
        .catch(error => {
            res.status(error.status || 200).json(responseJson.error(error, req.user));
        });
});

/* GET refresh activate. */
router.get(constants.path.auth.activate, authLimiter, (req, res) => {
    userService.activate(req.params.token)
        .then(user => userLogged(user, res, true))
        .catch(error => {
            res.status(error.status || 200).json(responseJson.error(error, req.user));
        });
});

/* GET refresh token. */
router.get(constants.path.auth.refreshToken, authLimiter, (req, res, next) => auth.authenticate(req, res, next), (req, res) => {
    userService.getUserById(req.user.id)
        .then(user => userLogged(Object.assign({}, req.user, user), res, true, req.params.role))
        .catch(error => {
            res.status(error.status || 200).json(responseJson.error(error, req.user));
        });
});

const userLogged = (user, res, forceLogin, role) => {

    // Get user info
    switch (user.role) {
        case constants.users.type.ADMIN:
        case constants.users.type.MANAGER:
        case constants.users.type.USER:
            return profileService.getOneByQuery({user: user.id})
                .then(async profile => {
                    try {
                        if (role && Object.values(constants.users.type).indexOf(role) !== -1) {
                            switch (user.role) {
                                case constants.users.type.MANAGER:
                                    user.role = role === constants.users.type.USER ? role : user.role;
                                    break;
                                case constants.users.type.ADMIN:
                                    user.role = role;
                                    break;
                                default:
                                    user.role = constants.users.type.USER
                            }
                        }
                        const data = await auth.makeLoginResponse(user, profile, forceLogin)
                        return res.json(responseJson.success(data));
                    } catch (err) {
                        const error = {message: util.format(constants.messages.sessionLimit.text, err.message), code: constants.messages.sessionLimit.code};
                        res.status(401).json(responseJson.error(error, user));
                    }
                });
        default:
            const error = {message: util.format(constants.messages.invalidUserType.text, user.type), code: constants.messages.invalidUserType.code};
            res.json(responseJson.error(error, user));
            return;
    }
};

export const authRouter = router;
