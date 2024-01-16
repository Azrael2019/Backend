import constants from "../../../helpers/constants";
import bookingLogService from "./bookingLogService";
import Router from "../_router";
import checkRole from "../../../configs/acl";
import responseJson from "../../../helpers/response";

class BookingLogRouter extends Router {

    constructor() {
        super(bookingLogService, constants.path.bookingLog, constants.access.features.bookingLog);
    }

    assignRouter() {

        /* GET entity list. */
        this.router.get(this.path.list, checkRole(this.feature, constants.access.type.READ_ALL), (req, res) => {
            super.getListReq(req)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* GET entity. */
        this.router.get(this.path.one, checkRole(this.feature, constants.access.type.READ), (req, res) => {
            this.getByIdReq(req)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
    }
}

export const bookingLogRoute = new BookingLogRouter().router;
