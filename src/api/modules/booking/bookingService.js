import BookingModel from "../../models/bookingModel";
import Service from "../_service";
import constants from "../../../helpers/constants";
import utilsLog from "../../../helpers/logger";
import {rejectPromise} from "../../../helpers/response";
import catalogService from "../catalog/catalogService";
import bookingLogService from "../bookingLog/bookingLogService";
import pushNotificationService from "../pushNotification/pushNotificationService";
import {dateAdd, minutesOfDay} from "../../../helpers/functions";
import promotionService from "../promotion/promotionService";
import loyaltyCardService from "../loyaltyCard/loyaltyCardService";
import config from "../../../configs/config";
import emailService from "../email/emailService";
import paymentService from "../payment/paymentService";
// TODO: reemplazar "query.catalog || query.bar" por "query.catalog"
const logger = utilsLog(__filename);

class BookingService extends Service {

    constructor() {
        super('Booking', BookingModel);
    }

    getList(query, user) {
        let q = this._parseQuery(query, user);
        if (query.t === 'aggregate') {
            q = q.$and ? Array.isArray(q.$and[0]) ? q.$and[0] : [] : q;
            if (user.role === constants.users.type.USER) {
                q.unshift({$match: {user: user.profileId}});
            } else if (user.role === constants.users.type.MANAGER) {
                q.unshift({$match: {catalog: {$in: user.myCatalogs.map(item => (`oid:${item}`)) || []}}});
            }
        } else {
            if (user.role === constants.users.type.USER) {
                q.$and.push({user: user.profileId});
            } else if (user.role === constants.users.type.MANAGER) {
                q.$and.push({catalog: {$in: user.myCatalogs || []}});
            }
        }
        query.q = JSON.stringify(q);
        return super.getList(query, user);
    }

    getListBooking(query, user) {
        if (user.role === constants.users.type.USER) {
            query = {
                p: JSON.stringify([
                    {path: 'promotion', model: 'promotions', populate: [{path: 'sponsor', model: 'sponsors'}]},
                    {
                        path: 'catalog',
                        model: 'catalogs',
                        select: 'name mainPicture location promotions.promotion promotions.name'
                    }
                ]),
                sk: query.sk,
                l: query.l,
                s: JSON.stringify({createdAt: -1}),
                q: JSON.stringify({$or: [{createdAt: {$gte: dateAdd(-1)}}, {status: constants.application.booking.status.ACCEPTED}]}),
            };
        } else {
            query = {
                p: 'promotion',
                q: JSON.stringify({
                    status: constants.application.booking.status.ACCEPTED,
                    catalog: `oid:${query.catalog || query.bar}`,
                    lastActionDate: {$gte: query.from, $lte: query.to},
                }),
            };
        }
        return this.getList(query, user);
    }

    exchangedCount(query, user) {
        if (user.role === constants.users.type.MANAGER) {
            query = {
                q: JSON.stringify([
                    {
                        $match: {
                            status: constants.application.booking.status.ACCEPTED,
                            catalog: `oid:${query.catalog || query.bar}`,
                            createdAt: {$gte: query.from, $lte: query.to},
                        }
                    },
                    {$lookup: {from: 'promotions', localField: 'promotion', foreignField: '_id', as: 'promotion'}},
                    {$group: {_id: '$promotion', count: {$sum: 1}}},
                    {$replaceRoot: {newRoot: {$mergeObjects: ['$$ROOT', {$arrayElemAt: ['$_id', 0]}]}}},
                    {$project: {_id: 0, id: '$_id', name: 1, type: 1, count: 1}},
                ]),
                t: 'aggregate'
            };
        }
        return this.getList(query, user);
    }

    getById(id, query = {}, user) {
        const find = {_id: id};
        if (user.role !== constants.users.type.ADMIN) {
            if (user.role === constants.users.type.USER) {
                find.user = user.profileId;
                query.p = [
                    {path: 'promotion', model: 'promotions', populate: [{path: 'sponsor', model: 'sponsors'}]},
                    {path: 'catalog', select: 'name location.formattedAddress phoneNumber'}
                ];
                query.f = 'promotion catalog status loyaltyCardRelation timeRange user';
            } else if (user.role === constants.users.type.MANAGER) {
                find.catalog = {$in: user.myCatalogs || []}
                query.p = ['promotion', 'catalog'];
            }
        } else {
            if (query.p) {
                try {
                    query.p = JSON.parse(query.p);
                } catch (e) {
                    query.p = query.p.split(',');
                }
            }
        }
        return super.getOneByQuery(find, query.p, query.f)
    }

    async hasPromotion(data, user) {
        logger.debug(`hasPromotion - args: data(${JSON.stringify(data)}), user(${JSON.stringify(user)})`);

        if (user.status !== constants.users.status.ACTIVE || user.role !== constants.users.type.USER) {
            return Promise.reject({
                message: constants.messages.permission.text,
                code: constants.messages.permission.code,
                status: 403
            });
        }

        // Check required fields
        let validations = [];
        const {catalog, promotion} = data;
        if (!catalog) validations.push('catalog');
        if (!promotion) validations.push('promotion');
        if (validations.length > 0) return rejectPromise.validation(this.modelName, validations);

        // Check if booking exists
        const query = {
            deleted: false,
            catalog,
            user: user.profileId,
            promotion,
            status: constants.application.booking.status.PENDING,
        };
        const currentBooking = await this.model.findOne(query);
        if (currentBooking) return currentBooking;
    }

    async create(itemSave, user) {
        logger.debug(`create - args: itemSave(${JSON.stringify(itemSave)}), user(${JSON.stringify(user)})`);

        if (user.status !== constants.users.status.ACTIVE || user.role === constants.users.type.MANAGER) {
            return Promise.reject({
                message: constants.messages.permission.text,
                code: constants.messages.permission.code,
                status: 403
            });
        } else if (user.role === constants.users.type.USER) {
            itemSave.user = user.profileId;
            itemSave.status = constants.application.booking.status.PENDING;
            delete itemSave.lastActionDate;
        }

        // Check required fields
        let validations = [];
        if (!itemSave.catalog) validations.push('catalog');
        if (!itemSave.promotion) validations.push('promotion');
        if (!itemSave.user) validations.push('user');
        if (validations.length > 0) return rejectPromise.validation(this.modelName, validations);

        // Check if booking exists
        const startDayUTC = dateAdd();
        const query = {
            deleted: false,
            catalog: itemSave.catalog,
            user: itemSave.user,
            promotion: itemSave.promotion,
            status: constants.application.booking.status.PENDING,
        };
        const currentBooking = await this.model.findOne(query);
        if (currentBooking) return currentBooking;

        // Check has catalog promotion
        return this._getCatalogPromotion(itemSave.catalog, itemSave.promotion)
            .then(async catalogPromotion => {

                // Check valid day
                const startDayLocale = new Date(startDayUTC.toLocaleString("UTC", {timeZone: config.timeZone}));
                const nameOfDay = catalogService.getDayOfWeek()[startDayLocale.getDay()];
                if (!catalogPromotion.repeat[nameOfDay]) return rejectPromise.validation(this.modelName, ['promotion.repeat'], constants.errors.kind.invalid);

                // Check quote
                if (catalogPromotion.limit && catalogPromotion.limit > 0) {
                    const count = await this.model.countDocuments({
                        deleted: false,
                        catalog: itemSave.catalog,
                        promotion: itemSave.promotion,
                        status: {$in: [constants.application.booking.status.ACCEPTED, constants.application.booking.status.PENDING]}
                    });
                    if (count >= catalogPromotion.limit) return rejectPromise.validation(this.modelName, ['promotion.limit'], constants.errors.kind.invalid);
                }

                // Get promotion
                const promotion = await promotionService.getById(itemSave.promotion, {p: 'sponsor'}, user);

                // Check promotion enabled
                if (!promotion.enabled) return rejectPromise.validation(this.modelName, ['promotion.enabled'], constants.errors.kind.invalid);

                // Check general quote
                if (promotion.limit && promotion.limit > 0) {
                    const count = await this.model.countDocuments({
                        deleted: false,
                        promotion: itemSave.promotion,
                        status: {$in: [constants.application.booking.status.ACCEPTED, constants.application.booking.status.PENDING]}
                    });
                    if (count >= promotion.limit) return rejectPromise.validation(this.modelName, ['global.limit'], constants.errors.kind.invalid);
                }

                // Check if prepaid promotion
                if (!constants.application.promotionGroup.payment.includes(promotion.type)) {

                    // Check user already booking
                    const maximumCatalog = await this.model.countDocuments({
                        deleted: false,
                        catalog: itemSave.catalog,
                        user: itemSave.user,
                        promotion: itemSave.promotion,
                        status: {$in: [constants.application.booking.status.ACCEPTED, constants.application.booking.status.PENDING]},
                        createdAt: {$gte: startDayUTC}
                    });
                    if (maximumCatalog >= constants.application.booking.maximumCatalog) return rejectPromise.validation(this.modelName, ['user.maximumCatalog'], constants.errors.kind.invalid);

                    // Check user maximum booking
                    const maximumDaily = await this.model.countDocuments({
                        deleted: false,
                        user: itemSave.user,
                        status: {$in: [constants.application.booking.status.ACCEPTED, constants.application.booking.status.PENDING]},
                        createdAt: {$gte: startDayUTC}
                    });
                    if (maximumDaily >= constants.application.booking.maximumDaily) return rejectPromise.validation(this.modelName, ['user.maximumDaily'], constants.errors.kind.invalid);
                }

                // Check loyalty card
                // TODO: check if catalog.promotions.loyaltyCardRelation
                let createLoyaltyCard = false;
                let doPayment = false;
                if (constants.application.promotionGroup.loyalty.includes(promotion.type)) {

                    // Check user loyalty card
                    const loyaltyCards = await loyaltyCardService.getList({}, user);
                    const catalogLoyaltyCard = loyaltyCards.items.find(item => item.catalog.id.toString() === itemSave.catalog.toString() && item.promotion.id.toString() === itemSave.promotion.toString());
                    const isPrepaidVoucher = promotion.type === constants.application.promotionType.PREPAID_VOUCHER;
                    if (!isPrepaidVoucher &&
                        loyaltyCards.items.length + (catalogLoyaltyCard ? 0 : 1) > constants.application.loyaltyCards.maximum)
                        return rejectPromise.validation(this.modelName, ['loyaltyCards.maximum'], constants.errors.kind.invalid);

                    // Checked my loyalty card
                    if (catalogLoyaltyCard) {

                        // Check card expire
                        if (startDayUTC > catalogLoyaltyCard.expire && (!catalogLoyaltyCard.expireReward || startDayUTC > catalogLoyaltyCard.expireReward))
                            return rejectPromise.validation(this.modelName, ['loyaltyCards.expired'], constants.errors.kind.invalid);

                        // Check prepaid voucher condition
                        if (isPrepaidVoucher) {

                            // Prevent booking
                            if (catalogLoyaltyCard.redeemed.length + 1 > promotion.qty) {
                                return rejectPromise.validation(this.modelName, ['loyaltyCards.maximum'], constants.errors.kind.invalid);
                            }
                        } else {

                            // Check if the reward booking!!
                            if (catalogLoyaltyCard.redeemed.length + 1 === promotion.qty) {
                                if (startDayUTC > catalogLoyaltyCard.expireReward)
                                    return rejectPromise.validation(this.modelName, ['loyaltyCards.expiredReward'], constants.errors.kind.invalid);
                                itemSave.free = true;
                            }
                        }
                    } else if (isPrepaidVoucher) {
                        doPayment = true;
                    }
                    createLoyaltyCard = true;
                } else if (constants.application.promotionGroup.payment.includes(promotion.type)) {
                    doPayment = true;
                }

                // Do payment
                if (doPayment) {
                    const payment = await paymentService.create({
                        promotion: itemSave.promotion,
                        catalog: itemSave.catalog,
                        amount: catalogPromotion.price,
                        feeAmount: +catalogPromotion.price * +(promotion.amount || 0),
                    }, user)
                    if (payment.status !== constants.application.payment.status.APPROVED) {
                        return rejectPromise.validation(paymentService.modelName, ['status'], constants.errors.kind.invalid);
                    }
                }

                // Set extra data
                itemSave.loyaltyCardRelation = catalogPromotion.loyaltyCardRelation;
                itemSave.timeRange = catalogPromotion.timeRange;
                itemSave.isPrepaid = doPayment;

                return super.create(itemSave, user)
                    .then(booking => {

                        // Check create loyalty card
                        if (createLoyaltyCard) loyaltyCardService.createOrUpdate(booking).then();

                        // Send sponsor email
                        if (promotion.sponsor) {
                            emailService.sponsorBooking(
                                user.email,
                                promotion.name,
                                promotion.sponsor.name,
                                promotion.sponsor.logo && promotion.sponsor.logo.url,
                                null,
                                false
                            ).then();
                        }
                        return booking;
                    });
            });
    }

    updateById(id, itemSave, user) {
        logger.debug(`updateById - args: id(${id}), itemSave(${JSON.stringify(itemSave)})`);

        if (user.role === constants.users.type.USER) {
            if (itemSave.status && itemSave.status === constants.application.booking.status.CANCELED) {
                itemSave = {
                    status: constants.application.booking.status.CANCELED,
                    lastActionDate: new Date(),
                };

                // Get booking
                return this.getById(id, {}, user)
                    .then(booking => {
                        if (!booking) return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
                        if (booking.user.toString() !== user.profileId) return rejectPromise.validation(this.modelName, ['user'], constants.errors.kind.invalid);
                        if (constants.application.promotionGroup.payment.includes(booking.promotion.type)) return Promise.reject({
                            message: constants.messages.permission.text,
                            code: constants.messages.permission.code,
                            status: 403
                        });
                        return super.updateById(id, itemSave, user);
                    });
            } else {
                return rejectPromise.validation(this.modelName, null, constants.errors.kind.invalid);
            }
        } else if (user.role === constants.users.type.MANAGER) {
            itemSave = {
                status: constants.application.booking.status.ACCEPTED,
                lastActionDate: new Date(),
            };

            // Get booking
            return this.getById(id, {}, user)
                .then(booking => {

                    // Check booking
                    if (!booking) return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);

                    // Check booking status
                    if (booking.status !== constants.application.booking.status.PENDING) return rejectPromise.validation(this.modelName, ['status'], constants.errors.kind.invalid);

                    // Check has catalog promotion
                    return this._getCatalogPromotion(booking.catalog, booking.promotion && booking.promotion.id ? booking.promotion.id : booking.promotion)
                        .then(async catalogPromotion => {

                            // Check time range
                            if (catalogPromotion.timeRange && catalogPromotion.timeRange.from && catalogPromotion.timeRange.to) {
                                const now = minutesOfDay(new Date());
                                const from = minutesOfDay(new Date(catalogPromotion.timeRange.from.toString()));
                                const to = minutesOfDay(new Date(catalogPromotion.timeRange.to.toString()));
                                if (now > to || now < from)
                                    return rejectPromise.validation(this.modelName, ['promotion.timeRange'], constants.errors.kind.invalid);
                            }

                            // Get promotion
                            const promotion = await promotionService.getById(booking.promotion, {p: 'sponsor'}, user);

                            // Check promotion enabled
                            if (!promotion.enabled) return rejectPromise.validation(this.modelName, ['promotion.enabled'], constants.errors.kind.invalid);
                            let disabledPromo = false;

                            // Check general quote
                            if (promotion.limit && promotion.limit > 0) {
                                const count = await this.model.countDocuments({
                                    deleted: false,
                                    promotion: itemSave.promotion,
                                    status: {$in: [constants.application.booking.status.ACCEPTED, constants.application.booking.status.PENDING]}
                                });
                                if (count >= promotion.limit) return rejectPromise.validation(this.modelName, ['global.limit'], constants.errors.kind.invalid);
                                disabledPromo = count + 1 >= promotion.limit;
                            }

                            return super.updateById(id, itemSave, user)
                                .then(res => {

                                    // Check if prepaid
                                    const isPrepaid = constants.application.promotionGroup.payment.includes(promotion.type);

                                    // Register log
                                    const bookingLog = {
                                        user: booking.user,
                                        amount: isPrepaid ?
                                            0 :
                                            promotion.sponsor && promotion.sponsor.id ?
                                                promotion.amount :
                                                0 - promotion.amount
                                        ,
                                        points: promotion.points,
                                        catalog: booking.catalog,
                                        promotion: booking.promotion,
                                        userRegister: user.profileId,
                                    };
                                    bookingLogService.create(bookingLog).catch(error => logger.error("BookingLogService error: " + JSON.stringify(error)));

                                    // Send notification
                                    const data = {
                                        booking: res.id,
                                        status: res.status,
                                        points: bookingLog.points,
                                    };
                                    if (promotion.picture && promotion.picture.url) data.banner = promotion.picture.url;
                                    if (promotion.sponsor && promotion.sponsor.id) data.sponsor = {
                                        name: promotion.sponsor.name,
                                        logo: promotion.sponsor.logo && promotion.sponsor.logo.url
                                    };
                                    pushNotificationService.publish(booking.user, '¡Promoción canjeada!', '¡Felicitaciones tu promoción ha sido canjeada!', {
                                        event: 'promotion.exchanged',
                                        data
                                    });

                                    // Check loyalty card
                                    if (constants.application.promotionGroup.loyalty.includes(promotion.type)) {
                                        loyaltyCardService.addToRedeemed(booking).then()
                                    }

                                    // Check promotion enabled
                                    if (disabledPromo) promotionService.updateById(booking.promotion, {enabled: false}, user).then();

                                    // Return booking
                                    return res;
                                });
                        });
                });
        }
        return super.updateById(id, itemSave, user);
    }

    _getCatalogPromotion(catalogId, promotionId) {

        // Get catalog info
        return catalogService.getById(catalogId, undefined, {role: constants.users.type.ADMIN})
            .then(catalog => {

                // Check has catalog promotion
                const promotion = catalog.promotions.find(catalogPromotion => catalogPromotion.promotion.toString() === promotionId.toString());
                if (!promotion) return rejectPromise.validation(this.modelName, ['promotion'], constants.errors.kind.invalid);
                return promotion;
            });
    }
}

export default new BookingService()
