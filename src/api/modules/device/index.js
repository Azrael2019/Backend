import constants from "../../../helpers/constants";
import deviceService from "./deviceService";
import Router from "../_router";

class DeviceRouter extends Router {

    constructor() {
        super(deviceService, constants.path.device, constants.access.features.device);
    }
}

export const deviceRoute = new DeviceRouter().router;
