import constants from "../../../helpers/constants";
import sponsorService from "./sponsorService";
import Router from "../_router";

class SponsorRouter extends Router {

    constructor() {
        super(sponsorService, constants.path.sponsor, constants.access.features.sponsor);
    }
}

export const sponsorRoute = new SponsorRouter().router;
