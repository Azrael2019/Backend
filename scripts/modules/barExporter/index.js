import configMe from "./config";
import {logger, sleep} from "../../helpers/common";
import fetch from "node-fetch";
import {writeFileSync} from "fs";
import converter from 'json-2-csv';

function syncData(results, getDetail) {
    // For each result
    return Promise.all((Array.isArray(results) ? results : []).map(async place => {
        try {

            // Check if exists
            const {place_id: importedId} = place;
            if (!importedId) {
                logger(`syncData - fail to fetch importedId`, true);
                return false;
            }

            // Get detail
            const fields = getDetail
                ? 'address_component,formatted_phone_number,international_phone_number,opening_hours,website'
                : 'address_component'
            const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${importedId}&key=${configMe.key}&fields=${fields}&language=es`;
            logger(`callToAPIPlace :: Detail - detailUrl(${detailUrl}) importedId=(${importedId})`);
            const detail = await fetch(detailUrl)
                .then(res => res.json())
                .then(res => res.status && res.status === 'OK' ? res.result : undefined);


            // Make object
            const catalog = {
                name: place.name,
                importedId,
                phoneNumber: detail && detail.international_phone_number ? detail.international_phone_number : '',
                mainPicture: place && place.photos && place.photos[0] && place.photos[0].photo_reference
                    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${configMe.key}&language=es`
                    : '',
                formattedAddress: place.formatted_address || place.vicinity,
                longitude: place.geometry.location.lng,
                latitude: place.geometry.location.lat,
            };
            if (detail.address_components) {
                detail.address_components.forEach(({types, long_name}) => {
                    if (types.indexOf('street_number') !== -1) {
                        catalog.address = `${(catalog.address || '').trim()} ${long_name}`.trim();
                    } else if (types.indexOf('route') !== -1) {
                        catalog.address = `${long_name} ${(catalog.address || '').trim()}`.trim();
                    } else if (types.indexOf('locality') !== -1) {
                        catalog.city = long_name;
                    } else if (types.indexOf('administrative_area_level_1') !== -1) {
                        catalog.community = long_name;
                        if (!catalog.state) catalog.state = long_name;
                    } else if (types.indexOf('administrative_area_level_2') !== -1) {
                        catalog.state = long_name;
                    } else if (types.indexOf('country') !== -1) {
                        catalog.country = long_name;
                    } else if (types.indexOf('postal_code') !== -1) {
                        catalog.zipCode = long_name;
                    }
                });
            }
            logger(`Catalog ${JSON.stringify(catalog)}`);
            return catalog;
        } catch (err) {
            logger(`syncData - ${err.message} - place(${JSON.stringify(place)})`, true);
        }
    }));
}

function callToAPIPlace(data, url, importerAPI, ref, detail) {
    logger(`callToAPIPlace - url(${url}) importerAPI(${importerAPI}) ref(${ref}) detail(${detail})`);

    try {

        // Fetch URL
        return fetch(url)
            .then(res => res.json())
            .then(async res => {

                // Get variables
                const {status: statusCode, results, error_message: errorMessage, next_page_token: nextPageToken} = res;

                // Check status
                if (statusCode === 'OK') {

                    // Sync data
                    const items = await syncData(results, detail);
                    items.map(item => item && data.push(item));

                    // Make URL and call to google place API
                    if (nextPageToken) {
                        await sleep(2000)
                        const newUrl = `https://maps.googleapis.com/maps/api/place/${importerAPI}/json?pagetoken=${nextPageToken}&key=${configMe.key}&language=es`;
                        return await callToAPIPlace(data, newUrl, importerAPI, ref, detail);
                    }
                } else {
                    logger(`callToAPIPlace - Invalid statusCode '${statusCode}' - ${errorMessage} - URL: ${url}`, true);
                }
            })
            .catch(err => {
                logger(`callToAPIPlace - ${err.message}`, true);
            });
    } catch (err) {

        // Log error and response error
        logger(`callToAPIPlace - ${err.message}`, true);
    }
}

export function catalogExporter(args) {
    logger('#### INIT PROCESS ####');

    try {

        logger(`catalogExporter - args(${JSON.stringify(args)})`);

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
                const data = [];

            async function forEachKeywords() {
                for (let kwr of keywords) {
                    const keyword = kwr.trim();
                    let url = `https://maps.googleapis.com/maps/api/place/${importerAPI}/json?key=${configMe.key}&language=es`
                    if (keyword) url += `&query=${encodeURI(`${keyword}${args['zone'] ? ` en ${args['zone']}` : ''}`)}`;
                    if (args['location']) url += `&location=${args['location']}`;
                    if (args['radius']) url += `&radius=${args['radius']}`;
                    if (types && types.length > 0) {
                        for (let type of types) {
                            await callToAPIPlace(data, `${url}&type=${type.trim()}`, importerAPI, `${type.trim()}-${keyword}`, detail);
                        }
                    } else {
                        await callToAPIPlace(data, url, importerAPI, keyword, detail);
                    }
                }
            }

                return forEachKeywords()
                    .catch((err) => {
                        logger(err.message || err, true);
                    })
                    .finally(async () => {
                        logger(`Convert data(${data.length}) to csv`);
                        await converter.json2csvAsync(data)
                            .then((csv) => {
                                // write CSV to a file
                                const fileName = `catalogExporter-${new Date().getTime()}.csv`;
                                const baseDir = `${__dirname}/${fileName}`;
                                logger(`Save data into http://ci.smart-commerce.es:8080/view/DEVOPS/job/DEVOPS-SB-bar.exporter/ws/scripts/modules/barExporter/${fileName}`);
                                writeFileSync(baseDir, csv);
                            })
                            .catch((err) => {
                                logger(err.message || err, true);
                            });
                        logger('#### FINISH PROCESS ####');
                        return Promise.resolve();
                    });
            default:
                return Promise.reject({message: `Invalid importerAPI "${importerAPI}"`});
        }
    } catch (err) {
        logger(err.message, true);
        return Promise.reject(err);
    }
}
