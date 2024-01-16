import constants from "../../../helpers/constants";
import roleService from "./roleService";
import Router from "../_router";
import checkRole from "../../../configs/acl";
import responseJson from "../../../helpers/response";

class RoleRouter extends Router {

    constructor() {
        super(roleService, constants.path.role, constants.access.features.role);
    }

    assignRouter() {

        /* GET metadata list. */
        this.router.get(this.path.metadata, checkRole(this.feature, constants.access.type.READ_ALL), (req, res) => {
            this.service.getMetadata()
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        super.assignRouter()
    }
}

export const roleRoute = new RoleRouter().router;
