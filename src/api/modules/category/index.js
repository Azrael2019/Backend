import constants from "../../../helpers/constants";
import categoryService from "./categoryService";
import Router from "../_router";

class CategoryRouter extends Router {

    constructor() {
        super(categoryService, constants.path.category, constants.access.features.category);
    }
}

export const categoryRoute = new CategoryRouter().router;
