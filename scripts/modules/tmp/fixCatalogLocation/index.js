import {logger, sleep} from "../../../helpers/common"
import CatalogModel from "../../../../src/api/models/catalogModel";
import configMe from "../../barImporter/config";
import fetch from "node-fetch";

export async function fixCatalogLocation(args) {
    logger('#### INIT PROCCESS ####');
    try {

        // Init variables
        const limit = args['limit'] || 100;
        const skipOne = !args['skipOne'];

        // Get all profiles with wrong data
        let rows = 0;
        let sk = 0;
        while (skipOne) {
            const pipeline = [
                {$match: {'location.community': {$exists: false}, importedId: {$exists: true}}},
                {$sort: {createdAt: -1}},
                {
                    $lookup: {
                        from: 'imp-google-places',
                        localField: 'importedId',
                        foreignField: 'importedId',
                        as: 'result'
                    }
                },
                {$unwind: {path: '$result'}},
                {$replaceRoot: {newRoot: {$mergeObjects: ['$$ROOT', '$result.detail']}}},
                {$project: {_id: 1, location: 1, address_components: 1}},
                {$match: {address_components: {$exists: true}}},
                {$limit: limit},
                {$skip: sk * limit}
            ];
            const results = await CatalogModel.aggregate(pipeline)

            // Check limit
            const dataLength = results.length;
            if (dataLength === 0) {
                logger(`ROW PROCESSED = CatalogModel ${rows}`);
                break;
            }
            await Promise.all(
                results.map((item, i) => {
                    const index = rows + i + 1;
                    try {

                        // Make params
                        let {_id, location, address_components} = item;
                        address_components.forEach(({types, long_name}) => {
                            if (types.indexOf('administrative_area_level_1') !== -1) {
                                location.community = long_name;
                                if (!location.state) location.state = long_name;
                            } else if (types.indexOf('administrative_area_level_2') !== -1) {
                                location.state = long_name;
                            }
                        });

                        // Save item data
                        return CatalogModel.findByIdAndUpdate(_id, {location})
                            .then(() => {
                                logger(`${index} - ${_id}`);
                                return true;
                            });
                    } catch (err) {
                        logger(`${index} - err(${err.message})`, true);
                        return false;
                    }
                })
            );
            rows = rows + dataLength;
            sk = sk + 1;
        }

        // Get all profiles with wrong data
        rows = 0;
        sk = 0;
        while (true) {
            const results = await CatalogModel
                .find({
                    'location.community': {$exists: false},
                    'location.formattedAddress': {$exists: true},
                    importedId: {$exists: false}
                }, 'location')
                .sort({createdAt: -1})
                .limit(limit)
                .skip(sk * limit);

            // Check limit
            const dataLength = results.length;
            if (dataLength === 0) {
                logger(`ROW PROCESSED = CatalogModel ${rows}`);
                break;
            }
            await Promise.all(
                results.map(async (item, i) => {
                    const index = rows + i + 1;
                    try {

                        // Make URL
                        let {_id, location} = item;
                        const detailUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURI(location.formattedAddress)}&key=${configMe.key}&fields=address_component&language=es`;
                        logger(`callToAPIPlace :: Detail - detailUrl(${detailUrl}) address=(${location.formattedAddress})`);
                        const detail = await fetch(detailUrl)
                            .then(res => res.json())
                            .then(res => {
                                if (res.error_message) logger(res.error_message, true);
                                return res.status && res.status === 'OK' ? res.results[0] : undefined;
                            });
                        await sleep(500);

                        // Make params
                        if (detail) {
                            detail.address_components.forEach(({types, long_name}) => {
                                if (types.indexOf('administrative_area_level_1') !== -1) {
                                    location.community = long_name;
                                    if (!location.state) location.state = long_name;
                                } else if (types.indexOf('administrative_area_level_2') !== -1) {
                                    location.state = long_name;
                                }
                            });

                            // Save item data
                            return CatalogModel.findByIdAndUpdate(_id, {location})
                                .then(() => {
                                    logger(`${index} - ${_id}`);
                                    return true;
                                });
                        }
                        return false;
                    } catch (err) {
                        logger(`${index} - err(${err.message})`, true);
                        return false;
                    }
                })
            );
            rows = rows + dataLength;
            sk = sk + 1;
        }
    } catch (err) {
        logger(err.message, true);
        return Promise.reject();
    }
}
