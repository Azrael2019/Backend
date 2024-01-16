import constants from "../../../helpers/constants";
import paymentService from "./paymentService";
import Router from "../_router";

class paymentRouter extends Router {

    constructor() {
        super(paymentService, constants.path.payment, constants.access.features.payment);
    }
}

export const paymentRoute = new paymentRouter().router;
