import PromotionModel from "../../models/promotionModel";
import ServiceCache from "../_serviceCache";
import config from "../../../configs/config";
import constants from "../../../helpers/constants";
import CatalogModel from "../../models/catalogModel";
import mongoose from "mongoose";

class PromotionService extends ServiceCache {

    constructor() {
        super('Promotion', PromotionModel, {attachments: [{bucket: config.aws.S3.buckets.picturePromotion}]});
    }

    async getList(query, user) {
        if (!user || user.role !== constants.users.type.ADMIN) {
            query = {
                q: JSON.stringify({enabled: 1}),
                s: JSON.stringify({type: 1, order: 1, sponsor: -1}),
                p: 'sponsor'
            };
        }

        // Check allowed catalogs
        const allowedCatalogCheck = user && user.role === constants.users.type.MANAGER;
        if (allowedCatalogCheck) {
            const q = this._parseQuery(query, user);
            q.$and.push({
                $or: [
                    {allowedCatalogs: {$exists: false}},
                    {allowedCatalogs: {$size: 0}},
                    {allowedCatalogs: {$in: user.myCatalogs}}
                ]
            });
            query.q = JSON.stringify(q);
        }
        return super.getList(query, user)
            .then(res => {
                if (allowedCatalogCheck && res.items && res.items.length > 0) {
                    res.items = res.items.map(promotion => {
                        if (promotion.allowedCatalogs && promotion.allowedCatalogs.length > 0) {
                            promotion.allowedCatalogs = promotion.allowedCatalogs.filter(catalog => user.myCatalogs.indexOf(catalog.toString()) !== -1);
                        }
                        if (promotion.allowedCatalogs.length === 0) {
                            delete promotion.allowedCatalogs;
                        }
                        return promotion;
                    });
                }
                return res;
            });
    }

    async create(itemSaveOri, user) {
        return super.create(itemSaveOri, user).then(this._checkAllowedCatalogs);
    }

    async updateById(id, itemSaveOri, user) {
        const hasAllowedCatalogs = await this.model.findOne({
            _id: mongoose.Types.ObjectId(id),
            allowedCatalogs: {$exists: true, $not: {$size: 0}}
        }, '_id');
        return super.updateById(id, itemSaveOri, user).then(res => this._checkAllowedCatalogs(res, hasAllowedCatalogs));
    }

    _checkAllowedCatalogs(promotion, hasAllowedCatalogs) {
        if (Array.isArray(promotion.allowedCatalogs) && promotion.allowedCatalogs.length > 0) {

            // Add promotion to allowed catalog
            promotion.allowedCatalogs.map(catalog =>
                CatalogModel.findOneAndUpdate(
                    {_id: catalog, 'promotions.promotion': {$ne: promotion._id}},
                    {$push: {promotions: {promotion: promotion.id}}}
                ).exec()
            );
        }

        // Remove promotion from not allowed catalogs
        if (hasAllowedCatalogs) {
            CatalogModel.updateMany(
                {'promotions.promotion': promotion._id, _id: {$nin: promotion.allowedCatalogs}},
                {$pull: {promotions: {promotion: promotion.id}}},
                {multi: true}
            ).exec()
        }
        return promotion;
    }
}

export default new PromotionService()
