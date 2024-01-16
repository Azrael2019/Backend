import constants from "../../../helpers/constants";
import subscriptionService from "./subscriptionService";
import Router from "../_router";
import checkRole from "../../../configs/acl";
import responseJson from "../../../helpers/response";

class SubscriptionRouter extends Router {

    constructor() {
        super(subscriptionService, constants.path.subscription, constants.access.features.subscription);
    }

    assignRouter() {

        /* POST entity account. */
        this.router.post(this.path.account, checkRole(this.feature, constants.access.type.WRITE), (req, res) => {
            this.service.createAccount(req.user)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        super.assignRouter();
    }
}

export const subscriptionRoute = new SubscriptionRouter().router;
