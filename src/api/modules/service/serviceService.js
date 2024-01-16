import ServiceModel from "../../models/serviceModel";
import ServiceCache from "../_serviceCache";

class ServiceService extends ServiceCache {

    constructor() {
        super('Service', ServiceModel);
    }
}

export default new ServiceService()
