import {logger} from "../../../helpers/common"
import mongoose from "mongoose";

export async function renameCollection() {
    logger('#### INIT PROCCESS ####');

    try {

        const collection = mongoose.connection.db.collection('bars');
        const ret = await collection.rename('catalogs', {dropTarget: true});
        return ret;
    } catch (err) {
        logger(err.message, true);
        return Promise.reject();
    }
}
