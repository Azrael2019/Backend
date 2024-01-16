import constants from "../../../helpers/constants";
import profileService from "./profileService";
import Router from "../_router";
import checkRole from "../../../configs/acl";
import responseJson from "../../../helpers/response";
import bookingLogService from "../bookingLog/bookingLogService";
import subscriptionService from "../subscription/subscriptionService";

class ProfileRouter extends Router {

    constructor() {
        super(profileService, constants.path.profile, constants.access.features.profile);
    }

    assignRouter() {

        /* GET profile rewards. */
        this.router.get(this.path.rewards, checkRole(constants.access.features.profileMe, constants.access.type.READ), (req, res) => {
            bookingLogService.rewards(req.user.profileId)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* GET profile me. */
        this.router.get(this.path.me, checkRole(constants.access.features.profileMe, constants.access.type.READ), (req, res) => {
            profileService.getOneByQuery({user: req.user.id}, ['user'])
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* PUT profile me. */
        this.router.put(this.path.me, checkRole(constants.access.features.profileMe, constants.access.type.WRITE), (req, res) => {
            delete req.body.user;
            profileService.updateOneByQuery({user: req.user.id}, req.body, req.user)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* DELETE profile me. */
        this.router.delete(this.path.me, checkRole(constants.access.features.profileMe, constants.access.type.DELETE), (req, res) => {
            profileService.deleteAccount(req.user)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* GET profile subscription. */
        this.router.get(this.path.subscription, checkRole(constants.access.features.profileMe, constants.access.type.READ), (req, res) => {
            subscriptionService.getOneByQuery({user: req.user.profileId}, [], '-stripeData.cardId -stripeData.subscriptionId -stripeData.subscriptionType -stripeData.subscriptionItemId')
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        super.assignRouter()
    }
}

export const profileRoute = new ProfileRouter().router;
