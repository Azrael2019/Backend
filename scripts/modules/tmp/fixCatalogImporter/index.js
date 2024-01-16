import {logger} from "../../../helpers/common"
import CatalogModel from "../../../../src/api/models/catalogModel";
import GooglePlaceModel from "../../barImporter/models/googlePlaceModel";

export async function fixCatalogImporter(args) {
    logger('#### INIT PROCCESS ####');
    try {

        // Init variables
        const limit = args['limit'] || 100;

        // Get all profiles with wrong data
        let rows = 0;
        let skip = 0;
        while (true) {
            const results = await GooglePlaceModel
                .find({'place.id': {$exists: true}}, 'place.id place.place_id')
                .skip(skip)
                .limit(limit);
            skip += limit;

            // Check limit
            const dataLength = results.length;
            if (dataLength === 0) {
                logger(`ROW PROCESSED = GooglePlaceModel ${rows}`);
                break;
            }
            await Promise.all(
                results.map((item, i) => {
                    const index = rows + i + 1;
                    try {

                        // Make params
                        const {place: {id, place_id}} = item.toJSON();

                        // Save item data
                        return CatalogModel.findOneAndUpdate({importedId: id}, {importedId: place_id})
                            .then((catalog) => {
                                if (!catalog) return false;
                                logger(`${index} - Catalog.id(${catalog.id}) OLD importedId(${id}) => NEW importedId(${place_id})`);
                                return true;
                            });
                    } catch (err) {
                        logger(`${index} - err(${err.message})`, true);
                        return false;
                    }
                })
            );
            rows = rows + dataLength;
        }
    } catch (err) {
        logger(err.message, true);
        return Promise.reject();
    }
}
