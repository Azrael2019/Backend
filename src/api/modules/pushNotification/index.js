import constants from "../../../helpers/constants";
import pushNotificationService from "./pushNotificationService";
import Router from "../_router";
import checkRole from "../../../configs/acl";
import responseJson from "../../../helpers/response";

class PushNotificationRouter extends Router {

    constructor() {
        super(pushNotificationService, constants.path.pushNotification, 'admin-pushNotification');
    }

    assignRouter() {

        /* POST entity. */
        this.router.post(this.path.list, checkRole(this.feature, constants.access.type.WRITE), (req, res) => {
            return this.service.create(req.body, req.query, req.user)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
    }
}

export const pushNotificationRoute = new PushNotificationRouter().router;
