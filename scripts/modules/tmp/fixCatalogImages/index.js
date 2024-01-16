import {logger, sleep} from "../../../helpers/common"
import CatalogModel from "../../../../src/api/models/catalogModel";

export async function fixCatalogImages(args) {
    logger('#### INIT PROCCESS ####');

    // Init variables
    const limit = args['limit'] || 100;
    const maxIterator = args['maxIterator'] || 10;
    let rows = 0;

    try {

        // Make catalog.pictures query
        let query = {'pictures.url': {$exists: true, $regex: `/picture/catalog/pictures/`}};

        // Get all catalog.pictures with wrong data
        while (true) {
            const data = await CatalogModel
                .find(query, 'pictures')
                .sort({createdAt: -1})
                .limit(limit);

            // Check limit
            const dataLength = data.length;
            if (dataLength === 0 || rows >= limit * maxIterator) {
                break;
            }
            await Promise.all(
                data.map(async (item, i) => {
                    const index = rows + i + 1;
                    try {

                        // Make params
                        const {id, pictures: data} = item;
                        const pictures = data.map(({url}, j) => {
                            data[j].url = url.replace('/catalog/pictures/', '/catalog-pictures/');
                            return data[j];
                        });

                        // Save item data
                        return CatalogModel.findByIdAndUpdate(id, {pictures})
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
            await sleep(5000);
        }

        // Make catalog.mainMenus.mainPicture query
        query = {'mainMenus.mainPicture.url': {$exists: true, $regex: `/picture/catalog/main-menus/`}};

        // Get all catalog.mainMenus.mainPicture with wrong data
        while (true) {
            const data = await CatalogModel
                .find(query, 'mainMenus')
                .sort({createdAt: -1})
                .limit(limit);

            // Check limit
            const dataLength = data.length;
            if (dataLength === 0 || rows >= limit * maxIterator) {
                break;
            }
            await Promise.all(
                data.map(async (item, i) => {
                    const index = rows + i + 1;
                    try {

                        // Make params
                        const {id, mainMenus: data} = item;
                        const mainMenus = data.map(({mainPicture: {url}}, j) => {
                            data[j].mainPicture.url = url.replace('/catalog/main-menus/', '/catalog-main-menus/');
                            return data[j];
                        });
                        return CatalogModel.findByIdAndUpdate(id, {mainMenus})
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
            await sleep(5000);
        }

        // Make catalog.mainSnacks.mainPicture query
        query = {'mainSnacks.mainPicture.url': {$exists: true, $regex: `/picture/catalog/main-snacks/`}};

        // Get all catalog.mainSnacks.mainPicture with wrong data
        while (true) {
            const data = await CatalogModel
                .find(query, 'mainSnacks')
                .sort({createdAt: -1})
                .limit(limit);

            // Check limit
            const dataLength = data.length;
            if (dataLength === 0 || rows >= limit * maxIterator) {
                logger(`ROW PROCESSED = ${rows}`);
                logger('#### FINISH PROCCESS ####');
                return Promise.resolve();
            }
            await Promise.all(
                data.map(async (item, i) => {
                    const index = rows + i + 1;
                    try {

                        // Make params
                        const {id, mainSnacks: data} = item;
                        const mainSnacks = data.map(({mainPicture: {url}}, j) => {
                            data[j].mainPicture.url = url.replace('/catalog/main-snacks/', '/catalog-main-snacks/');
                            return data[j];
                        });
                        return CatalogModel.findByIdAndUpdate(id, {mainSnacks})
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
            await sleep(5000);
        }
    } catch (err) {
        logger(err.message, true);
        return Promise.reject();
    }
}
