import constants from "../../../helpers/constants";
import catalogService from "./catalogService";
import Router from "../_router";
import checkRole from "../../../configs/acl";
import responseJson from "../../../helpers/response";

class CatalogRouter extends Router {

    constructor() {
        super(catalogService, constants.path.catalog, constants.access.features.catalog);
    }

    assignRouter() {

        /* PUT catalog me. */
        this.router.put(this.path.me, checkRole(constants.access.features.catalogMe, constants.access.type.WRITE), (req, res) => {
            delete req.body.manager;
            req.body.imported = false;
            const query = {
                _id: req.params[this.entityId],
                $or: [
                    {manager: req.user.profileId},
                    {imported: true, manager: {$exists: false}},
                ],
            };
            this.service.updateOneByQuery(query, req.body, req.user, {imported: true})
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* GET list. */
        this.router.get(this.path.listNew, checkRole(this.feature, constants.access.type.READ_ALL), (req, res) => {
            return this.service.getListCatalogs(req.query, req.user)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* GET imported list. */
        this.router.get(this.path.imported, checkRole(this.feature, constants.access.type.READ_ALL), (req, res) => {
            return this.service.getListImported(req.query, req.user)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        super.assignRouter()
    }
}

export const catalogRoute = new CatalogRouter().router;
