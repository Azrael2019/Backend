import constants from "../../../helpers/constants";
import policyService from "./policyService";
import Router from "../_router";

class PolicyRouter extends Router {

    constructor() {
        super(policyService, constants.path.policy, 'XXX-ADMIN-XXX');
    }
}

export const policyRoute = new PolicyRouter().router;
