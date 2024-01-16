import BookingModel from "../../../src/api/models/bookingModel";
import BookingRewardModel from "../../../src/api/models/bookingRewardModel";
import {logger} from "../../helpers/common"
import constants from "../../../src/helpers/constants";
import {dateAdd} from "../../../src/helpers/functions";

export async function cleanOldBooking(args) {
    logger('#### INIT PROCESS ####');
    try {

        // Now to 00:00:00
        const createdAt = dateAdd(0, args['timezone']);
        const lastMonth = dateAdd(-30, args['timezone']);
        logger(`createdAt(${createdAt}) lastMonth(${lastMonth})`);

        // Cancel older bookings
        const bookings = await BookingModel.updateMany(
            {
                status: constants.application.booking.status.PENDING,
                isPrepaid: false,
                createdAt: {$lt: createdAt}
            },
            [{
                $set: {
                    status: constants.application.booking.status.EXPIRED,
                }
            }],
            {multi: true}
        );
        logger(`bookings update(${JSON.stringify(bookings)})`);

        // Cancel unused booking rewards
        const bookingRewards = await BookingRewardModel.updateMany(
            {
                status: {$ne: constants.application.booking.status.ACCEPTED},
                createdAt: {$lt: createdAt}
            },
            [{
                $set: {
                    status: constants.application.booking.status.EXPIRED,
                    deleted: true,
                }
            }],
            {multi: true}
        );
        logger(`bookingRewards update(${JSON.stringify(bookingRewards)})`);

        // Deleted older bookings
        const bookingsDeleted = await BookingModel.deleteMany(
            {
                status: constants.application.booking.status.EXPIRED,
                createdAt: {$lt: lastMonth}
            },
            {multi: true}
        );
        logger(`bookings deleted(${JSON.stringify(bookingsDeleted)})`);

        // Delete unused booking rewards
        const bookingRewardsDeleted = await BookingRewardModel.deleteMany(
            {
                deleted: true,
                createdAt: {$lt: lastMonth}
            },
            {multi: true}
        );
        logger(`bookingRewards deleted(${JSON.stringify(bookingRewardsDeleted)})`);
        logger('#### FINISH PROCESS ####');
        return Promise.resolve();
    } catch (err) {
        logger(err.message, true);
        return Promise.reject();
    }
}
