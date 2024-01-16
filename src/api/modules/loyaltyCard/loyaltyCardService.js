import LoyaltyCardModel from "../../models/loyaltyCardModel";
import ServiceCache from "../_serviceCache";
import constants from "../../../helpers/constants";
import {rejectPromise} from "../../../helpers/response";
import promotionService from "../promotion/promotionService";
import {dateAdd} from "../../../helpers/functions";
import BookingModel from "../../models/bookingModel";

class LoyaltyCardService extends ServiceCache {

    constructor() {
        super('LoyaltyCard', LoyaltyCardModel);
    }

    getList(query, user) {
        if (!user || user.role !== constants.users.type.ADMIN) {
            query = {
                q: JSON.stringify({$and: [{user: user.profileId}]}),
                f: `${query.f || ''} -bookings`,
                p: 'promotion,catalog'
            };
        }
        return super.getList(query, user);
    }

    getById(id, query = {}, user) {
        if (query.p) {
            try {
                query.p = JSON.parse(query.p);
            } catch (e) {
                query.p = query.p.split(',');
            }
        }
        const find = {_id: id};
        if (user.role !== constants.users.type.ADMIN) {
            find.user = user.profileId;
            query.f = `${query.f || ''} -bookings`
        }
        return super.getOneByQuery(find, query.p, query.f)
    }

    async deleteById(id, user) {
        return this.getById(id, {}, user)
            .then(item => {
                if (!item) return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
                return super.deleteById(id, user)
                    .then(loyalty => {

                        // Delete all pending booking
                        BookingModel.updateMany({
                            user: loyalty.user,
                            catalog: loyalty.catalog,
                            promotion: loyalty.promotion,
                            status: constants.application.booking.status.PENDING,
                        }, {
                            status: constants.application.booking.status.CANCELED,
                            lastActionDate: new Date(),
                        }, {multi: true}).then();
                        return loyalty;
                    });
            })
    }

    async reset(id, user) {
        return this.getById(id, {}, user)
            .then(async item => {
                if (!item) return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
                const expire = dateAdd(constants.application.loyaltyCards.expirationInDays);
                return super.updateById(id, {
                    expire,
                    $unset: {
                        redeemed: "",
                        expireReward: ""
                    }
                }, user);
            })
    }

    createOrUpdate(booking) {
        const {id, catalog, user, promotion} = booking;
        const query = {user, catalog, promotion, deleted: false};
        const itemSave = {
            $addToSet: {
                bookings: id
            },
            $setOnInsert: {
                deleted: false,
                expire: dateAdd(constants.application.loyaltyCards.expirationInDays)
            }
        };
        return super._findOneAndUpdate(query, itemSave, {upsert: true, new: true, runValidators: true});
    }

    addToRedeemed(booking) {
        const {id, catalog, user} = booking;
        return super._findOneAndUpdate({
            user,
            catalog,
            bookings: id,
            promotion: booking.promotion,
            deleted: false
        }, {$addToSet: {redeemed: id}}, {new: true, runValidators: true})
            .then(async item => {
                if (item) {
                    const promotion = await promotionService.getById(booking.promotion);
                    if (promotion.type === constants.application.promotionType.PREPAID_VOUCHER) {
                        if (item.redeemed.length >= promotion.qty) {
                            return this.deleteById(item.id, {role: constants.users.type.ADMIN});
                        }
                    } else {
                        if (item.redeemed.length >= promotion.qty) {
                            return this.reset(item.id, {role: constants.users.type.ADMIN});
                        } else if (item.redeemed.length === promotion.qty - 1) {
                            const expireReward = dateAdd(constants.application.loyaltyCards.expirationRedeemedInDays);
                            return super._findByIdAndUpdate(item.id, {expireReward}, {new: true, runValidators: true})
                        }
                    }
                }
                return item;
            });
    }

    async isPrepaid(id) {
        const loyaltyCard = await super.getOneByQuery({_id: id}, [], 'promotion')
        if (loyaltyCard && loyaltyCard.promotion) {
            const promotion = await promotionService.getById(loyaltyCard.promotion);
            if (promotion && promotion.type) {
                return constants.application.promotionGroup.payment.includes(promotion.type);
            }
        }
        return false;
    }
}

export default new LoyaltyCardService()
