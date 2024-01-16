import {logger} from "../../../helpers/common"
import CatalogModel from "../../../../src/api/models/catalogModel";

export async function fixCatalogZipCode(args) {
    logger('#### INIT PROCCESS ####');
    try {

        // Init variables
        const limit = args['limit'] || 100;

        // Get all profiles with wrong data
        let rows = 0;
        while (true) {
            const results = await CatalogModel
                .find({'location.formattedAddress': {$exists: true}, 'location.zipCode': ''}, 'location')
                .sort({createdAt: -1})
                .limit(limit);

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
                        let {id, location} = item.toJSON();
                        const locationsParts = location.formattedAddress.split(',').map(item => item.trim());
                        const locationLength = locationsParts.length;
                        const locationNew = {
                            address: locationsParts[0],
                            country: locationsParts[locationLength - 1],
                        };

                        let aux;
                        switch (locationLength) {
                            case 3:
                                aux = locationsParts[1].split(/ (.+)/);
                                if (aux[1]) {
                                    locationNew.state = aux[1];
                                    locationNew.city = aux[1];
                                    locationNew.zipCode = aux[0];
                                } else {
                                    logger(`${index} - err(wrong formattedAddress ${location.formattedAddress})`, true);
                                    return false;
                                }
                                break;
                            case 4:
                                if (locationNew.country.toLowerCase() === "argentina") {
                                    locationNew.state = locationsParts[2];
                                    locationNew.city = locationsParts[2];
                                    locationNew.zipCode = locationsParts[1].split(/ (.+)/)[0];
                                } else {
                                    aux = locationsParts[2].split(/ (.+)/);
                                    locationNew.address = `${locationNew.address} ${locationsParts[1]}`;
                                    locationNew.state = aux[1];
                                    locationNew.city = aux[1];
                                    locationNew.zipCode = aux[0];
                                }
                                break;
                            case 5:
                                aux = locationsParts[2].split(/ (.+)/);
                                if (aux[1]) {
                                    locationNew.state = locationsParts[3];
                                } else {
                                    aux = locationsParts[3].split(/ (.+)/);
                                    locationNew.state = aux[1];
                                }
                                locationNew.address = `${locationNew.address} ${locationsParts[1]}`;
                                locationNew.city = aux[1];
                                locationNew.zipCode = aux[0];
                                break;
                            case 6:
                                aux = locationsParts[3].split(/ (.+)/);
                                if (aux[1]) {
                                    locationNew.state = locationsParts[4];
                                } else {
                                    aux = locationsParts[4].split(/ (.+)/);
                                    locationNew.state = aux[1];
                                }
                                locationNew.address = `${locationNew.address} ${locationsParts[1]} ${locationsParts[2]}`;
                                locationNew.city = aux[1];
                                locationNew.zipCode = aux[0];
                                break;
                            case 7:
                                aux = locationsParts[4].split(/ (.+)/);
                                locationNew.address = `${locationNew.address} ${locationsParts[1]} ${locationsParts[2]} ${locationsParts[3]}`;
                                locationNew.state = locationsParts[5];
                                locationNew.city = aux[1];
                                locationNew.zipCode = aux[0];
                                break;
                            default:
                                logger(`${index} - err(wrong formattedAddress ${location.formattedAddress})`, true);
                                return false;
                        }

                        // Make object to save
                        if (!location.address) location.address = locationNew.address;
                        if (!location.country) location.country = locationNew.country;
                        if (!location.state) location.state = locationNew.state;
                        if (!location.city) location.city = locationNew.city;
                        if (!location.zipCode) location.zipCode = locationNew.zipCode;

                        // Save item data
                        return CatalogModel.findByIdAndUpdate(id, {location})
                            .then(() => {
                                logger(`${index} - ${id}`);
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
