import constants from "../../../helpers/constants";
import loyaltyCardService from "./loyaltyCardService";
import Router from "../_router";
import checkRole from "../../../configs/acl";
import responseJson from "../../../helpers/response";

class LoyaltyCardRouter extends Router {

    constructor() {
        super(loyaltyCardService, constants.path.loyaltyCard, constants.access.features.loyaltyCard);
    }

    assignRouter() {

        /* GET entity list. */
        this.router.get(this.path.list, checkRole(this.feature, constants.access.type.READ_ALL), (req, res) => {
            this.getListReq(req)
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

        /* DELETE entity. */
        this.router.delete(this.path.one, checkRole(this.feature, constants.access.type.DELETE), (req, res) => {
            this.service.isPrepaid(req.params[this.entityId])
                .then(ret => {
                    if (!ret) {
                        this.deleteByIdReq(req)
                            .then(() => res.status(200).json(responseJson.success({item: {id: req.params[this.entityId]}})))
                            .catch(error => {
                                res.status(error.status || 200).json(responseJson.error(error, req.user));
                            });
                    } else {
                        const error = {
                            message: constants.messages.permission.text,
                            code: constants.messages.permission.code
                        };
                        res.status(403).json(responseJson.error(error, req.user));
                    }
                })
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* PUT entity. */
        this.router.put(this.path.reset, checkRole(this.feature, constants.access.type.WRITE), (req, res) => {
            this.service.isPrepaid(req.params[this.entityId])
                .then(ret => {
                    if (!ret) {
                        this.service.reset(req.params[this.entityId], req.user)
                            .then(item => res.json(responseJson.success({item})))
                            .catch(error => {
                                res.status(error.status || 200).json(responseJson.error(error, req.user));
                            });
                    } else {
                        const error = {
                            message: constants.messages.permission.text,
                            code: constants.messages.permission.code
                        };
                        res.status(403).json(responseJson.error(error, req.user));
                    }
                })
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
    }
}

export const loyaltyCardRoute = new LoyaltyCardRouter().router;
