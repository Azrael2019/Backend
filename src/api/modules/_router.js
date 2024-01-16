import express from "express";
import constants from "../../helpers/constants";
import checkRole from "../../configs/acl";
import responseJson from "../../helpers/response";

class Router {

    constructor(service, path, feature) {
        this.router = express.Router();
        this.service = service;
        this.path = path;
        this.feature = feature;
        this.entityId = this.path._id || 'INVALID_ID';
        this.assignRouter();
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

        /* POST entity. */
        this.router.post(this.path.list, checkRole(this.feature, constants.access.type.WRITE), (req, res) => {
            this.createReq(req)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* PUT entity. */
        this.router.put(this.path.one, checkRole(this.feature, constants.access.type.WRITE), (req, res) => {
            this.updateByIdReq(req)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* DELETE entity. */
        this.router.delete(this.path.one, checkRole(this.feature, constants.access.type.DELETE), (req, res) => {
            this.deleteByIdReq(req)
                .then(() => res.status(200).json(responseJson.success({item: {id: req.params[this.entityId]}})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        /* PATCH entity. */
        this.router.patch(this.path.list, checkRole('XXX-ADMIN-XXX', constants.access.type.WRITE), (req, res) => {
            this.updateByQueryReq(req)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
    }

    getListReq(req, ...args) {
        return this.service.getList(req.query, req.user, ...args)
    }

    getByIdReq(req, ...args) {
        return this.service.getById(req.params[this.entityId], req.query, req.user, ...args);
    }

    createReq(req, ...args) {
        return this.service.create(req.body, req.user, ...args);
    }

    updateByIdReq(req, ...args) {
        return this.service.updateById(req.params[this.entityId], req.body, req.user, ...args)
    }

    deleteByIdReq(req, ...args) {
        return this.service.deleteById(req.params[this.entityId], req.user, ...args)
    }

    updateByQueryReq(req, ...args) {
        const query = JSON.parse(req.query.q);
        return this.service.updateByQuery(query, req.body, req.user, ...args)
    }
}

export default Router;
