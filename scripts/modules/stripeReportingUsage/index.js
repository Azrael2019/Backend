import {logger} from "../../helpers/common"
import config from "../../../src/configs/config"
import BookingLogModel from "../../../src/api/models/bookingLogModel";
import PaymentsProfileModel from "../../../src/api/models/paymentsProfileModel";
import stp from "stripe";

export async function stripeReportingUsage() {
    logger('#### INIT PROCESS ####');
    try {

        // Set time to 5 minutes ago
        const now = new Date();
        now.setMinutes(now.getMinutes() - 5);

        // Get group by manager and your amount summarized
        const userAmounts = await BookingLogModel.aggregate([
            {$match: {processing: false, createdAt: {$lt: now}, deleted: false}},
            {$group: {_id: '$userRegister', amount: {$sum: '$amount'}}},
            {$match: {amount: {$lt: 0}}},
        ]);

        // Check length
        if (Array.isArray(userAmounts) && userAmounts.length > 0) {
            logger(`Results userAmounts.length ${userAmounts.length}`);

            // Initialize stripe
            const stripe = stp(config.stripe.secretAccessKey);
            const timestamp = Math.ceil(now.getTime() / 1000)

            // For each manager
            for (const {_id: user, amount} of userAmounts) {
                try {

                    // Get subscription manager
                    const subscription = await PaymentsProfileModel.findOne({
                        user,
                        deleted: false
                    }, 'stripeData.subscriptionItemId');
                    if (subscription && subscription.stripeData && subscription.stripeData.subscriptionItemId) {


                        // Normalize quantity
                        const quantity = amount.toFixed(2) * -10;
                        const {stripeData: {subscriptionItemId}} = subscription;

                        // Increment subscription usage
                        const retStripe = await stripe.subscriptionItems.createUsageRecord(
                            subscriptionItemId,
                            {
                                quantity,
                                timestamp,
                                action: 'increment',
                            }
                        );
                        logger(`manager(${user}) - stripe(${JSON.stringify(retStripe)})`);

                        // Update data as processing
                        const ret = await BookingLogModel.updateMany(
                            {processing: false, createdAt: {$lt: now}, deleted: false, userRegister: user},
                            {processing: true, externalId: retStripe.id},
                            {multi: true}
                        );
                        logger(`manager(${user}) - processing(${JSON.stringify(ret)})`);
                    } else {
                        logger(`manager(${user}) - Subscription not found`, true);
                    }
                } catch (err) {
                    logger(`manager(${user}) - ${err}`, true);
                }
            }
        } else {
            logger(`No data for userAmounts(${JSON.stringify(userAmounts)})`);
        }

        // Log finish process
        logger('#### FINISH PROCESS ####');
        return Promise.resolve();
    } catch (err) {
        logger(err.message, true);
        return Promise.reject();
    }
}
