import configMe from "./config";
import GoogleResponseModel from "./models/googleResponseModel";
import GooglePlaceModel from "./models/googlePlaceModel";
import {logger} from "../../helpers/common";
import fetch from "node-fetch";
import catalogService from "../../../src/api/modules/catalog/catalogService";
import CatalogModel from "../../../src/api/models/catalogModel";

async function syncData(results, getDetail) {

    // Check array
    if (Array.isArray(results)) {

        // For each result
        return await Promise.all(results.map(async place => {
            try {

                // Check if exists
                let mainPicture = undefined;
                const {place_id: importedId} = place;
                if (!importedId) {
                    logger(`syncData - fail to fetch importedId`, true);
                    return false;
                }
                const catalog = await CatalogModel.findOne({importedId});

                // Save place
                await GooglePlaceModel.findOneAndUpdate({importedId}, {place}, {
                    upsert: true,
                    new: true,
                    runValidators: true
                });

                // Call to photos if catalog doesn't has picture
                if ((!catalog || !catalog.mainPicture || !catalog.mainPicture.url || catalog.mainPicture.url === configMe.defaultCatalogUrl) &&
                    place.photos &&
                    place.photos[0] &&
                    place.photos[0].photo_reference) {
                    try {
                        const pictureUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${configMe.key}&language=es`;
                        logger(`callToAPIPlace :: Images - pictureUrl(${pictureUrl}) importedId=(${importedId})`);
                        const pictureRes = await fetch(pictureUrl);
                        mainPicture = await pictureRes.buffer();
                    } catch (err) {
                        logger(`syncData - ${err.message} - photo_reference(${place.photos[0].photo_reference})`, true);
                    }
                }

                // Get detail
                let fields = 'address_component'
                if (getDetail) {
                    fields = `${fields},formatted_phone_number,international_phone_number,opening_hours,website`
                }
                const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${importedId}&key=${configMe.key}&fields=${fields}&language=es`;
                logger(`callToAPIPlace :: Detail - detailUrl(${detailUrl}) importedId=(${importedId})`);
                const detail = await fetch(detailUrl)
                    .then(res => res.json())
                    .then(res => res.status && res.status === 'OK' ? res.result : undefined);
                await GooglePlaceModel.findOneAndUpdate({importedId}, {detail}, {upsert: true, new: true, runValidators: true});


                // Make location
                const location = {
                    formattedAddress: place.formatted_address || place.vicinity,
                    geo: {
                        coordinates: [
                            place.geometry.location.lng,
                            place.geometry.location.lat,
                        ],
                    },
                };
                if (detail.address_components) {
                    detail.address_components.forEach(({types, long_name}) => {
                        if (types.indexOf('street_number') !== -1) {
                            location.address = `${(location.address || '').trim()} ${long_name}`.trim();
                        } else if (types.indexOf('route') !== -1) {
                            location.address = `${long_name} ${(location.address || '').trim()}`.trim();
                        } else if (types.indexOf('locality') !== -1) {
                            location.city = long_name;
                        } else if (types.indexOf('administrative_area_level_1') !== -1) {
                            location.community = long_name;
                            if (!location.state) location.state = long_name;
                        } else if (types.indexOf('administrative_area_level_2') !== -1) {
                            location.state = long_name;
                        } else if (types.indexOf('country') !== -1) {
                            location.country = long_name;
                        } else if (types.indexOf('postal_code') !== -1) {
                            location.zipCode = long_name;
                        }
                    });
                }

                // Make object
                const catalogSave = {
                    name: place.name,
                    location,
                    importedId,
                    $setOnInsert: {
                        imported: true,
                        deleted: false,
                    },
                };
                if (!catalog) {
                    catalogSave.mainPicture = {url: configMe.defaultCatalogUrl};
                }

                // If not exist... upload picture
                if (mainPicture) {
                    catalogSave.mainPicture = {url: await mainPicture.toString('base64')};
                }

                // If not exist... upload picture
                if (detail && detail.international_phone_number) {
                    if (!catalog || !catalog.phone) catalogSave.phoneNumber = detail.international_phone_number;
                }

                // Save catalog
                const itemSave = await catalogService._checkAttachmentFields(catalogSave, catalogService.attachments)
                const ret = await CatalogModel.findOneAndUpdate(
                    {importedId},
                    itemSave,
                    {upsert: true, new: true, runValidators: true}
                );
                logger(`Catalog ${catalog ? 'updated' : 'inserted'} id(${ret.id}) importedId(${importedId})`);
            } catch (err) {
                logger(`syncData - ${err.message} - place(${JSON.stringify(place)})`, true);
            }
        }));
    }
    return Promise.reject({error: `results isn't array (${JSON.stringify(results)})`});
}

async function callToAPIPlace(url, importerAPI, ref, detail) {
    logger(`callToAPIPlace - url(${url}) importerAPI(${importerAPI}) ref(${ref}) detail(${detail})`);

    let googleResponse;
    try {

        // Create response
        googleResponse = await GoogleResponseModel.create({url});

        // Fetch URL
        return fetch(url)
            .then(res => res.json())
            .then(async res => {

                // Get variables
                const {status: statusCode, results, error_message: errorMessage, next_page_token: nextPageToken} = res;

                // Check status
                if (statusCode === 'OK') {

                    // Update response
                    await GoogleResponseModel.findByIdAndUpdate(googleResponse.id, {statusCode, results, nextPageToken});

                    // Sync data and update response
                    await syncData(results, detail);
                    GoogleResponseModel.findByIdAndUpdate(googleResponse.id, {status: configMe.googleResponse.status.PROCESSED});

                    // Make URL and call to google place API
                    if (nextPageToken) {
                        const newUrl = `https://maps.googleapis.com/maps/api/place/${importerAPI}/json?pagetoken=${nextPageToken}&key=${configMe.key}&language=es`;
                        return callToAPIPlace(newUrl, importerAPI, ref, detail);
                    }
                    return Promise.resolve();
                }

                // Update response and response error
                await GoogleResponseModel.findByIdAndUpdate(googleResponse.id, {
                    statusCode,
                    errorMessage,
                    status: configMe.googleResponse.status.ERROR
                });
                return Promise.reject({error: `Invalid statusCode '${statusCode}'`});
            }).catch(err => {
                logger(`callToAPIPlace.fetch - ${err.message}`, true);
            });
    } catch (err) {

        // Check if need to update response
        if (googleResponse) GoogleResponseModel.findByIdAndUpdate(googleResponse.id, {status: configMe.googleResponse.status.ERROR});

        // Log error and response error
        logger(`callToAPIPlace - ${err.message}`, true);
        return Promise.reject(err);
    }
}

export async function barImporter(args) {
    logger('#### INIT PROCESS ####');

    try {

        logger(`barImporter - args(${JSON.stringify(args)})`);

        // Make URL and call to google place API
        const importerAPI = args['importerAPI'];
        switch (importerAPI) {
            case 'nearbysearch':
            case 'textsearch':

                // Set variables
                const isTextSearch = importerAPI === 'textsearch';
                const detail = args['detail'] && args['detail'].toLocaleString() === 'true';
                const types = args['types'] ? args['types'].split(',') : (isTextSearch ? [] : [configMe.defaultTerm]);
                const keywords = args['keywords'] ? args['keywords'].split(',') : [isTextSearch ? configMe.defaultTerm : ''];

                // For each type
                return Promise.all(keywords.map(async keyword => {
                    keyword = keyword.trim();
                    let url = `https://maps.googleapis.com/maps/api/place/${importerAPI}/json?key=${configMe.key}&language=es`
                    if (keyword) url += `&query=${encodeURI(`${keyword}${args['zone'] ? ` en ${args['zone']}` : ''}`)}`;
                    if (args['location']) url += `&location=${args['location']}`;
                    if (args['radius']) url += `&radius=${args['radius']}`;
                    if (types && types.length > 0) {
                        return Promise.all(types.map(async type => callToAPIPlace(`${url}&type=${type.trim()}`, importerAPI, `${type.trim()}-${keyword}`), detail));
                    } else {
                        return callToAPIPlace(url, importerAPI, keyword, detail);
                    }
                })).then(() => {
                    logger('#### FINISH PROCESS ####');
                    return Promise.resolve();
                });
            default:
                return Promise.reject(`Invalid importerAPI "${importerAPI}"`);
        }
    } catch (err) {
        logger(err.message, true);
        return Promise.reject(err);
    }
}
