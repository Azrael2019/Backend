import BookingRewardModel from "../../models/bookingRewardModel";
import Service from "../_service";
import constants from "../../../helpers/constants";
import utilsLog from "../../../helpers/logger";
import {rejectPromise} from "../../../helpers/response";
import rewardService from "../reward/rewardService";
import bookingLogService from "../bookingLog/bookingLogService";
import pushNotificationService from "../pushNotification/pushNotificationService";

const logger = utilsLog(__filename);

class BookingRewardService extends Service {

    constructor() {
        super('BookingReward', BookingRewardModel);
    }

    getList(query, user) {
        query.q = query.q ? query.q : '{}';
        let q = JSON.parse(query.q);
        if (query.t === 'aggregate') {
            if (!Array.isArray(q)) q = [];
            if (user.role === constants.users.type.USER) {
                q.unshift({$match: {user: user.profileId}});
            } else if (user.role === constants.users.type.MANAGER) {
                q.unshift({$match: {catalog: {$in: user.myCatalogs.map(item => (`oid:${item}`)) || []}}});
            }
        } else {
            q = {$and: [q]};
            if (user.role === constants.users.type.USER) {
                q.$and.push({user: user.profileId});
            } else if (user.role === constants.users.type.MANAGER) {
                q.$and.push({catalog: {$in: user.myCatalogs || []}});
            }
        }
        query.q = JSON.stringify(q);
        return super.getList(query, user);
    }

    getById(id, query = {}, user) {
        const find = {_id: id};
        if (user.role !== constants.users.type.ADMIN) {
            if (user.role === constants.users.type.USER) {
                find.user = user.profileId;
                query.p = ['reward', 'catalog'];
            } else if (user.role === constants.users.type.MANAGER) {
                find.catalog = {$in: user.myCatalogs || []};
                query.p = ['reward', 'catalog'];
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

    create(itemSave, user) {
        logger.debug(`create - args: itemSave(${JSON.stringify(itemSave)}), user(${JSON.stringify(user)})`);

        if (user.status !== constants.users.status.ACTIVE || user.role === constants.users.type.MANAGER) {
            return Promise.reject({message: constants.messages.permission.text, code: constants.messages.permission.code, status: 403});
        } else if (user.role === constants.users.type.USER) {
            itemSave.user = user.profileId;
            itemSave.status = constants.application.booking.status.PENDING;
            delete itemSave.lastActionDate;
        }

        // Check required fields
        let validations = [];
        if (!itemSave.reward) validations.push('reward');
        if (!itemSave.user) validations.push('user');
        if (validations.length > 0) return rejectPromise.validation(this.modelName, validations);

        // Get reward data
        return rewardService.getOneByQuery({_id: itemSave.reward, deleted: false})
            .then(async reward => {
                if (!reward) return rejectPromise.validation(rewardService.modelName, null, constants.errors.kind.notFound);

                // Calculate user reward points
                const {count: rewardPoints = 0} = await bookingLogService.rewards(user.profileId) || {};

                // Check user points to get a reward
                if (rewardPoints < reward.points) return rejectPromise.validation(this.modelName, ['user.points'], constants.errors.kind.notMatch);
                return super.create(itemSave, user);
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

                // Get bookingReward
                return this.getById(id, {}, user)
                    .then(bookingReward => {
                        if (!bookingReward) return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
                        if (bookingReward.user.toString() !== user.profileId) return rejectPromise.validation(this.modelName, ['user'], constants.errors.kind.invalid);
                        return super.updateById(id, itemSave, user);
                    });
            } else {
                return rejectPromise.validation(this.modelName, null, constants.errors.kind.invalid);
            }
        } else if (user.role === constants.users.type.MANAGER) {

            // Check required fields
            let validations = [];
            if (!itemSave.catalog) validations.push('catalog');
            if (validations.length > 0) return rejectPromise.validation(this.modelName, validations);

            // Check my catalog
            if (user.myCatalogs.indexOf(itemSave.catalog.toString()) === -1) return rejectPromise.validation(this.modelName, ['catalog'], constants.errors.kind.invalid);

            // Make object
            itemSave = {
                status: constants.application.booking.status.ACCEPTED,
                lastActionDate: new Date(),
                catalog: itemSave.catalog,
            };

            // Get bookingReward
            return this.getById(id, {}, user)
                .then(bookingReward => {

                    // Check booking reward
                    if (!bookingReward) return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);

                    // Check bookingReward status
                    if (bookingReward.status !== constants.application.booking.status.PENDING) return rejectPromise.validation(this.modelName, ['status'], constants.errors.kind.invalid);

                    // Get reward data
                    return rewardService.getOneByQuery({_id: bookingReward.reward, deleted: false})
                        .then(async reward => {
                            if (!reward) return rejectPromise.validation(rewardService.modelName, null, constants.errors.kind.notFound);

                            // Calculate user reward points
                            const {count: rewardPoints = 0} = await bookingLogService.rewards(bookingReward.user) || {};

                            // Check user points to get a reward
                            if (rewardPoints < reward.points) return rejectPromise.validation(this.modelName, ['user.points'], constants.errors.kind.notMatch);

                            return super.updateById(id, itemSave, user)
                                .then(bookingReward => {

                                    // Register log
                                    const bookingLog = {
                                        user: bookingReward.user,
                                        amount: reward.amount,
                                        points: 0 - reward.points,
                                        catalog: bookingReward.catalog,
                                        reward: reward.id,
                                        userRegister: user.profileId,
                                    };
                                    bookingLogService.create(bookingLog).catch(error => logger.error("BookingLogService error: " + JSON.stringify(error)));

                                    // Send notification
                                    pushNotificationService.publish(bookingReward.user, '¡Puntos canjeados!', '¡Felicitaciones tus puntos han sido canjeados!', {event: 'reward.exchanged', data: {booking: bookingReward.id, status: bookingReward.status}});
                                    return bookingReward;
                                });
                        });
                });
        }
        return super.updateById(id, itemSave, user);
    }
}

export default new BookingRewardService()
