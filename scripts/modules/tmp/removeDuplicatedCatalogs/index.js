import {logger} from "../../../helpers/common"
import CatalogModel from "../../../../src/api/models/catalogModel";
import constants from "../../../../src/helpers/constants";

export async function removeDuplicatedCatalogs() {
    logger('#### INIT PROCESS ####');
    try {
        let ret;
        const duplicates = await CatalogModel.aggregate([
            {$match: {importedId: {$exists: true}}},
            {$group: {_id: "$importedId", catalogs: {$addToSet: "$_id"}, count: {$sum: 1}}},
            {$match: {count: {$gt: 1}}}
        ]);
        for (const duplicate of duplicates) {
            duplicate.catalogs.shift();
            ret = await CatalogModel.deleteMany({_id: {$in: duplicate.catalogs}})
            logger(`Delete for importedId(${duplicate._id}) ret(${JSON.stringify(ret)})`);
        }

        ret = await CatalogModel.updateMany(
            {status: {$exists: false}},
            {status: constants.application.catalog.status.PENDING},
            {multi: true}
        );
        logger(`catalog.status(${JSON.stringify(ret)})`);

        ret = await CatalogModel.updateMany(
            {deleted: {$exists: false}},
            {deleted: false},
            {multi: true}
        );
        logger(`catalog.deleted(${JSON.stringify(ret)})`);

        logger('#### FINISH PROCESS ####');
        return Promise.resolve();
    } catch (err) {
        logger(err.message, true);
        return Promise.reject();
    }
}
