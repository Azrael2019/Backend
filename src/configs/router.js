import config from "./config";
import auth from "./auth";
import responseJson from "../helpers/response";
import constants from "../helpers/constants";
import packageJson from "../../package.json";
import {
    authRouter,
    publicRouter,
    catalogRoute,
    bookingRoute,
    bookingRewardRoute,
    bookingLogRoute,
    categoryRoute,
    deviceRoute,
    drinkRoute,
    loyaltyCardRoute,
    messageRoute,
    newsRoute,
    policyRoute,
    profileRoute,
    promotionRoute,
    pushNotificationRoute,
    rewardRoute,
    roleRoute,
    serviceRoute,
    sponsorRoute,
    subscriptionRoute,
    paymentRoute,
} from "../api/modules";
import util from "util";
import {settingHeaderMiddleware} from "../helpers/settings";

export default app => {

    /**
     * Public
     */
    app.all('*', (req, res, next) => settingHeaderMiddleware(req, res, next));
    app.get('/', (req, res) => {
        res.json(responseJson.success({message: 'Hello word!', version: packageJson.version}));
    });

    app.use(constants.path.auth._name, authRouter);
    app.use(config.apiPrefix + constants.path.auth.public, publicRouter);

    /**
     * Private
     */
    // applies passport authentication on all following router
    app.all('*', (req, res, next) => auth.authenticate(req, res, next));
    app.use(config.apiPrefix + constants.path.catalog._name, catalogRoute);
    // TODO: REMOVE THIS IN A FUTURE
    app.use(config.apiPrefix + '/bar', catalogRoute);
    // END TODO
    app.use(config.apiPrefix + constants.path.booking._name, bookingRoute);
    app.use(config.apiPrefix + constants.path.bookingReward._name, bookingRewardRoute);
    app.use(config.apiPrefix + constants.path.bookingLog._name, bookingLogRoute);
    app.use(config.apiPrefix + constants.path.category._name, categoryRoute);
    app.use(config.apiPrefix + constants.path.device._name, deviceRoute);
    app.use(config.apiPrefix + constants.path.drink._name, drinkRoute);
    app.use(config.apiPrefix + constants.path.loyaltyCard._name, loyaltyCardRoute);
    app.use(config.apiPrefix + constants.path.message._name, messageRoute);
    app.use(config.apiPrefix + constants.path.news._name, newsRoute);
    app.use(config.apiPrefix + constants.path.policy._name, policyRoute);
    app.use(config.apiPrefix + constants.path.profile._name, profileRoute);
    app.use(config.apiPrefix + constants.path.promotion._name, promotionRoute);
    app.use(config.apiPrefix + constants.path.pushNotification._name, pushNotificationRoute);
    app.use(config.apiPrefix + constants.path.reward._name, rewardRoute);
    app.use(config.apiPrefix + constants.path.role._name, roleRoute);
    app.use(config.apiPrefix + constants.path.service._name, serviceRoute);
    app.use(config.apiPrefix + constants.path.sponsor._name, sponsorRoute);
    app.use(config.apiPrefix + constants.path.subscription._name, subscriptionRoute);
    app.use(config.apiPrefix + constants.path.payment._name, paymentRoute);

    // catch 404 and forward to error handler
    app.use((req, res, next) => {
        next({message: util.format(constants.messages.notFound.text, req.path), code: constants.messages.notFound.code, status: 404});
    });

    // error handler
    app.use((error, req, res, next) => {
        res.status(error.status || 200).json(responseJson.error(error, req.user));
    });
};
