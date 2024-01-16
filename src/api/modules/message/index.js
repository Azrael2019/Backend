import constants from "../../../helpers/constants";
import messageService from "./messageService";
import Router from "../_router";
import checkRole from "../../../configs/acl";
import responseJson from "../../../helpers/response";

class MessageRouter extends Router {

    constructor() {
        super(messageService, constants.path.message, constants.access.features.message);
    }

    assignRouter() {

        /* PUT entity. */
        this.router.put(this.path.read, checkRole(this.feature, constants.access.type.READ), (req, res) => {
            return this.service.read(req.params[this.entityId], req.user)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        super.assignRouter();
    }
}

export const messageRoute = new MessageRouter().router;
