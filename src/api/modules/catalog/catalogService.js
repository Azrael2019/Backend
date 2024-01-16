import CatalogModel, {nameOfDays} from "../../models/catalogModel";
import Service from "../_service";
import config from "../../../configs/config";
import constants from "../../../helpers/constants";
import auth from "../../../configs/auth";
import {rejectPromise} from "../../../helpers/response";
import promotionService from "../promotion/promotionService";
import mongoose from "mongoose";
import checkCaptcha from "../../../helpers/captcha";
import {diacriticRegex} from "../../../helpers/functions";

class CatalogService extends Service {

    constructor() {
        super('Catalog', CatalogModel, {
            attachments: [
                {bucket: config.aws.S3.buckets.pictureCatalog, field: 'mainPicture'},
                {
                    bucket: Object.assign({}, config.aws.S3.buckets.pictureCatalog, {folder: config.aws.S3.buckets.pictureCatalog.folder + '-pictures'}),
                    field: 'pictures[0]'
                },
                {
                    bucket: Object.assign({}, config.aws.S3.buckets.pictureCatalog, {folder: config.aws.S3.buckets.pictureCatalog.folder + '-main-menus'}),
                    field: 'mainMenus[0].mainPicture'
                },
                {
                    bucket: Object.assign({}, config.aws.S3.buckets.pictureCatalog, {folder: config.aws.S3.buckets.pictureCatalog.folder + '-main-snacks'}),
                    field: 'mainSnacks[0].mainPicture'
                },
            ]
        });
    }

    getList(query, user) {
        const isUser = !user || user.role === constants.users.type.USER;
        if (isUser) {
            const q = this._parseQuery(query, user);
            q.$and.push({status: constants.application.catalog.status.ACTIVE});
            q.$and.push({imported: false});
            query.q = JSON.stringify(q);
        }
        return super.getList(query, user)
            .then(res => (isUser && res.items)
                ? res.items.sort((a, b) => {
                    if (a.isHighlighted === undefined || a.promotions === undefined) return 0;
                    if (a.isHighlighted < b.isHighlighted) return 1;
                    if (a.isHighlighted > b.isHighlighted) return -1;
                    if (a.promotions.length < b.promotions.length) return 1;
                    if (a.promotions.length > b.promotions.length) return -1;
                    return 0;
                }) && res
                : res
            );
    }

    getById(id, query = {}, user) {
        if (!user || user.role !== constants.users.type.ADMIN) {
            query = {
                p: JSON.stringify([
                    'categories',
                    'services',
                    'mainDrinks.drink',
                    {path: 'promotions.promotion', model: 'promotions', populate: [{path: 'sponsor', model: 'sponsors'}]}
                ])
            };
        }
        return super.getById(id, query, user)
            .then(this._normalizeResponse);
    }

    getListImported(query, user) {
        const q = {
            $and: [
                {status: {$ne: constants.application.catalog.status.BLOCKED}},
                {imported: true, manager: {$exists: false}},
            ],
        }
        const parseQuery = this._parseQueryParams(query);
        if (parseQuery && Object.keys(parseQuery) > 0) q.$and.push(parseQuery);

        query = {
            p: JSON.stringify([
                'categories',
                'services',
                'promotions.promotion',
                'mainDrinks.drink',
            ]),
            f: 'categories promotions services name mainPicture location.geo.coordinates location.formattedAddress acceptsCredits isHighlighted',
            sk: query.sk,
            l: query.l,
            q: JSON.stringify(q),
        };
        return super.getList(query, user);
    }

    getListCatalogs(query, user) {
        const parseQuery = this._parseQueryParams(query);
        if (!user || user.role === constants.users.type.USER) {
            query = {
                p: JSON.stringify([
                    'categories',
                    'services',
                    'promotions.promotion',
                ]),
                f: 'categories promotions services name mainPicture location.geo.coordinates location.formattedAddress acceptsCredits isHighlighted',
                sk: query.sk,
                l: query.l,
                q: JSON.stringify(parseQuery),
            };
        } else {
            parseQuery.manager = user.profileId;
            query = {
                p: JSON.stringify([
                    'categories',
                    'services',
                    'mainDrinks.drink',
                    {path: 'promotions.promotion', model: 'promotions', populate: [{path: 'sponsor', model: 'sponsors'}]}
                ]),
                q: JSON.stringify(parseQuery),
            };
        }
        return this.getList(query, user);
    }

    async create(itemSave, user) {

        // Check user
        if (user.role === constants.users.type.MANAGER) {

            // Check status
            if (user.status !== constants.users.status.ACTIVE) {
                return Promise.reject({
                    message: constants.messages.permission.text,
                    code: constants.messages.permission.code,
                    status: 403
                });
            }

            // Check catalog creation limit
            const catalogs = await this.model.countDocuments({manager: mongoose.Types.ObjectId(user.profileId)});
            if (catalogs >= constants.application.catalog.limit) {
                return rejectPromise.validation(this.modelName, ['limit'], constants.errors.kind.invalid)
            }

            // Check re-captcha
            // TODO: RETROCOMPATIBILITY
            // if (!itemSave.recaptcha || !(await checkCaptcha(itemSave.recaptcha))) {
            if (itemSave.recaptcha && !(await checkCaptcha(itemSave.recaptcha))) {
                return rejectPromise.validation(this.modelName, ['recaptcha'], constants.errors.kind.invalid)
            }
            delete itemSave.recaptcha;
        }
        return super.create(await this._normalizeObject(itemSave, user, true), user)
            .then(catalog => {
                if (catalog) {
                    if (!Array.isArray(user.myCatalogs)) user.myCatalogs = [];
                    user.myCatalogs.push(catalog.id);
                    auth.updateTokenData(user);
                }
                return catalog;
            });
    }

    async updateById(id, itemSave, user, params = {}) {
        if (user.role === constants.users.type.MANAGER && user.myCatalogs.indexOf(id.toString()) === -1) {
            if (!params.imported) {
                return rejectPromise.validation(this.modelName, null, constants.errors.kind.invalid);
            } else if (user.myCatalogs.length >= constants.application.catalog.limit) {
                return rejectPromise.validation(this.modelName, ['limit'], constants.errors.kind.invalid)
            }
        } else if (user.role === constants.users.type.ADMIN && itemSave.manager) {
            itemSave.imported = false;
        }
        const catalogData = await this._normalizeObject(itemSave, user, false, id);

        // Check prepaid promotions
        if (Array.isArray(catalogData.promotions) && catalogData.promotions.length > 0) {
            const prepaidPromotions = (await promotionService._findAll({
                q: JSON.stringify({type: {$in: constants.application.promotionGroup.payment}}),
                f: 'id'
            }, {role: constants.users.type.ADMIN}) || [])
                .map(item => item.id)
            if (Array.isArray(prepaidPromotions) && catalogData.promotions.find(p => prepaidPromotions.includes(p.promotion) && (!p.price || p.price < 0.5 || !p.name))) {
                return rejectPromise.validation(this.modelName, ['promotion.price', 'promotion.name'], constants.errors.kind.empty);
            }
        }
        return super.updateById(id, catalogData, user);
    }

    getDayOfWeek() {
        return nameOfDays;
    }

    async _normalizeObject(itemSave, user, isNew = false, catalogId) {

        // Check categories object
        if (Array.isArray(itemSave.categories) && itemSave.categories.length > 0) {
            itemSave.categories = itemSave.categories.map(item => item.id || item);
        }

        // Check services object
        if (Array.isArray(itemSave.services) && itemSave.services.length > 0) {
            itemSave.services = itemSave.services.map(item => item.id || item);
        }

        // Check promotions object
        if (Array.isArray(itemSave.promotions) && itemSave.promotions.length > 0) {
            itemSave.promotions = itemSave.promotions.map(item => Object.assign(item, {promotion: item.promotion ? item.promotion.id || item.promotion : item}));

            // Check promotions allowed catalog
            const promotionsAllowedCatalog = await promotionService._findAll({
                q: JSON.stringify({
                    allowedCatalogs: {
                        $exists: true,
                        $not: {$size: 0}
                    }
                }), f: 'allowedCatalogs'
            }, {role: constants.users.type.ADMIN})
            if (Array.isArray(promotionsAllowedCatalog) && promotionsAllowedCatalog.length > 0) {
                const allowedCatalogs = promotionsAllowedCatalog.reduce((init, obj) => Object.assign({[obj.id]: obj.allowedCatalogs}, init), {});
                itemSave.promotions = itemSave.promotions.filter(({promotion}) => !allowedCatalogs[promotion] || (catalogId && allowedCatalogs[promotion].indexOf(catalogId) !== -1));
            }
        }

        // Check user
        if (user.role === constants.users.type.MANAGER) {
            itemSave.manager = user.profileId;
        }
        if (user.role !== constants.users.type.ADMIN) {
            if (isNew) {
                itemSave.status = constants.application.catalog.status.PENDING;
            } else {
                delete itemSave.status;

                // Check blocked promotion
                const blocked = await this.model.findOne({
                    _id: mongoose.Types.ObjectId(catalogId),
                    'promotions.blocked': true
                }, 'promotions');
                if (blocked && Array.isArray(blocked.promotions) && blocked.promotions.length > 0) {
                    const blockedPromotion = blocked.promotions.reduce((init, obj) => obj.blocked ? Object.assign({[obj.promotion.toString()]: obj.toJSON()}, init) : init, {});
                    if (!Array.isArray(itemSave.promotions)) itemSave.promotions = [];
                    itemSave.promotions.forEach((item, index) => {
                        if (blockedPromotion[item.promotion]) {
                            itemSave.promotions[index] = blockedPromotion[item.promotion];
                            delete blockedPromotion[item.promotion];
                        }
                    });
                    Array.prototype.push.apply(itemSave.promotions, Object.values(blockedPromotion));
                }
            }
        }
        return itemSave;
    }

    _parseQueryParams(query) {
        let q = {};
        if (query.search) {
            const searchRegex = diacriticRegex(query.search);
            q.$or = [
                {name: {$regex: `/${searchRegex}/`, $options: 'i'}},
                {'location.city': {$regex: `/${searchRegex}/`, $options: 'i'}},
                {'location.zipCode': query.search},
            ]
        }
        if (query.city) {
            q['location.city'] = {$regex: `/${diacriticRegex(query.city)}/`, $options: 'i'};
        }
        if (query.lat && query.lon) {
            q['location.geo'] = {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(query.lon), parseFloat(query.lat)]
                    }
                }
            };

            if (query.distance) {
                q['location.geo'].$nearSphere.$maxDistance = query.distance;
            }
        }
        if (query.credits) {
            q.acceptsCredits = true;
        }
        if (query.payment) {
            q.paymentMethod = {$lte: parseInt(query.payment)};
        }
        if (query.promotions) {
            q['promotions.promotion'] = {$in: query.promotions.split(',')};
        }
        if (query.services) {
            q.services = {$in: query.services.split(',')};
        }
        if (query.categories) {
            q.categories = {$in: query.categories.split(',')};
        }
        if (query.zipcode) {
            q['location.zipCode'] = query.zipcode;
        }
        if (query.price) {
            const price = query.price.split('-');
            q['mainMenus.price'] = price[0] === '0' ? {$not: {$exists: true, $lt: 0}} : {$gte: parseInt(price[0]), $lte: parseInt(price[1])};
        }

        return q;
    }

    _normalizeResponse(item) {
        if (item && item.promotions) {
            item.promotions = item.promotions.filter(p => !p.promotion.type || constants.application.promotionTypeEnabled.includes(p.promotion.type));
        }
        return item
    }
}

export default new CatalogService()
