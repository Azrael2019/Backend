import {logger} from "../../../helpers/common"
import mongoose from "mongoose";

export async function renameCollectionField() {
    logger('#### INIT PROCCESS ####');

    try {
        let ret;
        let collection;

        collection = mongoose.connection.db.collection('promotions');
        ret = await collection.updateMany({}, {$rename: {allowedBars: 'allowedCatalogs'}});
        logger(`promotions - processing(${JSON.stringify(ret)})`);

        collection = mongoose.connection.db.collection('bookings');
        ret = await collection.updateMany({}, {$rename: {bar: 'catalog'}});
        logger(`bookings - processing(${JSON.stringify(ret)})`);

        collection = mongoose.connection.db.collection('booking-logs');
        ret = await collection.updateMany({}, {$rename: {bar: 'catalog'}});
        logger(`booking-logs - processing(${JSON.stringify(ret)})`);

        collection = mongoose.connection.db.collection('booking-rewards');
        ret = await collection.updateMany({}, {$rename: {bar: 'catalog'}});
        logger(`booking-rewards - processing(${JSON.stringify(ret)})`);

        collection = mongoose.connection.db.collection('loyalty-cards');
        ret = await collection.updateMany({}, {$rename: {bar: 'catalog'}});
        logger(`loyalty-cards - processing(${JSON.stringify(ret)})`);

        collection = mongoose.connection.db.collection('messages');
        ret = await collection.updateMany({}, {$rename: {bar: 'catalog'}});
        logger(`messages - processing(${JSON.stringify(ret)})`);

        collection = mongoose.connection.db.collection('payments');
        ret = await collection.updateMany({}, {$rename: {bar: 'catalog'}});
        logger(`payments - processing(${JSON.stringify(ret)})`);

        return ret;
    } catch (err) {
        logger(err.message, true);
        return Promise.reject();
    }
}
