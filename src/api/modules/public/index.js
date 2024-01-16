import constants from "../../../helpers/constants";
import catalogService from "../catalog/catalogService";
import promotionService from "../promotion/promotionService";
import categoryService from "../category/categoryService";
import drinkService from "../drink/drinkService";
import serviceService from "../service/serviceService";
import newsService from "../news/newsService";
import policyService from "../policy/policyService";
import responseJson from "../../../helpers/response";
import express from "express";

class PublicRouter {

    constructor() {
        this.router = express.Router();

        // PUBLIC ROOT
        this.router.get("/", (req, res) => {
            res.json(responseJson.success({constants: constants.application}))
        });

        // TODO: REMOVE THIS IN A FUTURE
        this.router.get('/bar' + constants.path.catalog.listNew, (req, res) => {
            catalogService.getListCatalogs(req.query)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
        this.router.get('/bar' + constants.path.catalog.imported, (req, res) => {
            return catalogService.getListImported(req.query, req.user)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
        this.router.get('/bar' + constants.path.catalog.one, (req, res) => {
            catalogService.getById(req.params[constants.path.catalog._id], req.query)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
        // END TODO

        // CATALOG
        this.router.get(constants.path.catalog._name + constants.path.catalog.listNew, (req, res) => {
            catalogService.getListCatalogs(req.query)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
        this.router.get(constants.path.catalog._name + constants.path.catalog.imported, (req, res) => {
            return catalogService.getListImported(req.query, req.user)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
        this.router.get(constants.path.catalog._name + constants.path.catalog.one, (req, res) => {
            catalogService.getById(req.params[constants.path.catalog._id], req.query)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        // PROMOTION
        this.router.get(constants.path.promotion._name + constants.path.promotion.list, (req, res) => {
            promotionService.getList(req.query)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
        this.router.get(constants.path.promotion._name + constants.path.promotion.one, (req, res) => {
            promotionService.getById(req.params[constants.path.promotion._id], req.query)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        // CATEGORY
        this.router.get(constants.path.category._name + constants.path.category.list, (req, res) => {
            categoryService.getList(req.query)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
        this.router.get(constants.path.category._name + constants.path.category.one, (req, res) => {
            categoryService.getById(req.params[constants.path.category._id], req.query)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        // DRINK
        this.router.get(constants.path.drink._name + constants.path.drink.list, (req, res) => {
            drinkService.getList(req.query)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
        this.router.get(constants.path.drink._name + constants.path.drink.one, (req, res) => {
            drinkService.getById(req.params[constants.path.drink._id], req.query)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        // SERVICE
        this.router.get(constants.path.service._name + constants.path.service.list, (req, res) => {
            serviceService.getList(req.query)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
        this.router.get(constants.path.service._name + constants.path.service.one, (req, res) => {
            serviceService.getById(req.params[constants.path.service._id], req.query)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        // NEWS
        this.router.get(constants.path.news._name + constants.path.news.list, (req, res) => {
            newsService.getList(req.query)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
        this.router.get(constants.path.news._name + constants.path.news.one, (req, res) => {
            newsService.getById(req.params[constants.path.news._id], req.query)
                .then(item => res.json(responseJson.success({item})))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });

        // POLICY
        this.router.get(constants.path.policy._name + constants.path.policy.list, (req, res) => {
            policyService.getList(req.query)
                .then(result => res.json(responseJson.success(result)))
                .catch(error => {
                    res.status(error.status || 200).json(responseJson.error(error, req.user));
                });
        });
    }
}

export const publicRouter = new PublicRouter().router;
