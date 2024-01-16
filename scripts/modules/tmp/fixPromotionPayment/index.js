import {logger} from "../../../helpers/common"
import PromotionModel from "../../../../src/api/models/promotionModel";
import BookingLogModel from "../../../../src/api/models/bookingLogModel";

export async function fixPromotionPayment() {
    logger('#### INIT PROCCESS ####');

    try {

        // Init old promotions
        const promotions = await PromotionModel.updateMany(
            {
                $or: [
                    {amount: {$ne: 0}},
                    {points: {$ne: 0}}
                ]
            },
            [{
                $set: {
                    amount: 0,
                    points: 0,
                }
            }],
            {multi: true}
        );
        logger(`promotions update(${JSON.stringify(promotions)})`);

        // Init old bookingLogModel
        const bookingLogs = await BookingLogModel.updateMany(
            {
                $or: [
                    {amount: {$ne: 0}},
                    {points: {$ne: 0}},
                    {processing: false},
                ]
            },
            [{
                $set: {
                    amount: 0,
                    points: 0,
                    processing: true,
                }
            }],
            {multi: true}
        );
        logger(`bookingLogs update(${JSON.stringify(bookingLogs)})`);
    } catch (err) {
        logger(err.message, true);
        return Promise.reject();
    }
}
