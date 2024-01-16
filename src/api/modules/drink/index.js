import constants from "../../../helpers/constants";
import drinkService from "./drinkService";
import Router from "../_router";

class DrinkRouter extends Router {

    constructor() {
        super(drinkService, constants.path.drink, constants.access.features.drink);
    }
}

export const drinkRoute = new DrinkRouter().router;
