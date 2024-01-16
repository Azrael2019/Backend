import constants from "../../../helpers/constants";
import serviceService from "./serviceService";
import Router from "../_router";

class ServiceRouter extends Router {

    constructor() {
        super(serviceService, constants.path.service, constants.access.features.service);
    }
}

export const serviceRoute = new ServiceRouter().router;
