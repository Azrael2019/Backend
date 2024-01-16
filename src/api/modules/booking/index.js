import constants from "../../../helpers/constants";
import bookingService from "./bookingService";
import Router from "../_router";
import checkRole from "../../../configs/acl";
import responseJson from "../../../helpers/response";

class BookingRouter extends Router {

    constructor() {
        super(bookingService, constants.path.booking, constants.access.features.booking);
    }

    assignRouter() {

        /* GET entity list. */
        this.router.get(this.path.listNew, checkRole(this.feature, constants.access.type.READ_ALL), (req, res) => {
            this.service.getListBooking(req.query, req.user)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* GET entity exchangedCount. */
        this.router.get(this.path.exchangedCount, checkRole(this.feature, constants.access.type.READ_ALL), (req, res) => {
            this.service.exchangedCount(req.query, req.user)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* POST entity hasPromotion. */
        this.router.post(this.path.hasPromotion, checkRole(this.feature, constants.access.type.READ_ALL), (req, res) => {
            this.service.hasPromotion(req.body, req.user)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        super.assignRouter();
    }
}

export const bookingRoute = new BookingRouter().router;
