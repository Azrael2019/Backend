import constants from "../../../helpers/constants";
import bookingRewardService from "./bookingRewardService";
import Router from "../_router";

class BookingRewardRouter extends Router {

    constructor() {
        super(bookingRewardService, constants.path.bookingReward, constants.access.features.booking);
    }
}

export const bookingRewardRoute = new BookingRewardRouter().router;
