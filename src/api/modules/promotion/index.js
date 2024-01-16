import constants from "../../../helpers/constants";
import promotionService from "./promotionService";
import Router from "../_router";

class PromotionRouter extends Router {

    constructor() {
        super(promotionService, constants.path.promotion, constants.access.features.promotion);
    }
}

export const promotionRoute = new PromotionRouter().router;
