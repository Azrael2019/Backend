import constants from "../../../helpers/constants";
import newsService from "./newsService";
import Router from "../_router";

class NewsRouter extends Router {

    constructor() {
        super(newsService, constants.path.news, constants.access.features.news);
    }
}

export const newsRoute = new NewsRouter().router;
