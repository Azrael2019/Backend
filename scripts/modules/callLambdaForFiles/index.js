import {logger, sleep} from "../../helpers/common"
import AWS from "aws-sdk";
import config from "../../../src/configs/config";
import SponsorModel from "../../../src/api/models/sponsorModel";
import ProfileModel from "../../../src/api/models/profileModel";
import NewsModel from "../../../src/api/models/newsModel";
import RewardModel from "../../../src/api/models/rewardModel";
import PromotionModel from "../../../src/api/models/promotionModel";
import CatalogModel from "../../../src/api/models/catalogModel";

const S3_PUT_SIMULATION_PARAMS = {
    "Records": [
        {
            "awsRegion": config.aws.S3.region,
            "eventName": "ObjectCreated:Put",
            "eventSource": "aws:s3",
            "eventTime": "1970-01-01T00:00:00.000Z",
            "eventVersion": "2.1",
            "requestParameters": {
                "sourceIPAddress": "127.0.0.1"
            },
            "responseElements": {
                "x-amz-request-id": "EXAMPLE123456789",
                "x-amz-id-2": "EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH"
            },
            "s3": {
                "s3SchemaVersion": "1.0",
                "configurationId": "testConfigRule",
                "bucket": {
                    "name": config.aws.S3.buckets.pictureCatalog.name,
                    "ownerIdentity": {
                        "principalId": "EXAMPLE"
                    },
                    "arn": `arn:aws:s3:::${config.aws.S3.buckets.pictureCatalog.name}`
                },
                "object": {
                    "key": "HappyFace.jpg",
                    "size": 1024,
                    "eTag": "0123456789abcdef0123456789abcdef",
                    "sequencer": "0A1B2C3D4E5F678901"
                }
            },
            "userIdentity": {
                "principalId": "EXAMPLE"
            }
        }
    ]
};

export async function callLambdaForFiles(args) {
    logger('#### INIT PROCCESS ####');


    // Init variables
    const options = {
        accessKeyId: config.aws.S3.accessKeyId,
        secretAccessKey: config.aws.S3.secretAccessKey,
        region: config.aws.S3.region,
        apiVersion: '2015-03-31'
    };
    const lambda = new AWS.Lambda(options);
    const limit = args['limit'] || 100;
    let rows = 0;

    try {

        ////////////////////////////////////////////////////
        // Make catalog.mainPicture query
        let query = {
            'mainPicture.url': {$exists: true, $regex: `^${config.aws.S3.buckets.pictureCatalog.alias}`},
            'mainPicture.thumb': {$exists: false}
        };

        // Get all catalog.mainPicture with wrong data
        while (true) {
            const data = await CatalogModel
                .find(query, 'mainPicture.url')
                .sort({createdAt: -1})
                .limit(limit);

            // Check limit
            const dataLength = data.length;
            if (dataLength === 0) {
                break;
            }
            await Promise.all(
                data.map((item, i) => {
                    const index = rows + i + 1;
                    try {

                        // Make params
                        const {id, mainPicture: {url}} = item;
                        const key = url.replace(config.aws.S3.buckets.pictureCatalog.alias, '');
                        const params = {
                            FunctionName: 'createThumbPicture',
                            Payload: ""
                        };
                        const p = S3_PUT_SIMULATION_PARAMS;
                        p.Records[0].s3.object.key = key.startsWith('/') ? key.substr(1) : key;
                        params.Payload = JSON.stringify(p, null, 2);

                        // Call lambda
                        return lambda.invoke(params)
                            .promise()
                            .then(() => {

                                // Save item data
                                return CatalogModel.findByIdAndUpdate(id, {'mainPicture.thumb': url.replace('/catalog/', '/catalog-thumb/')})
                                    .then(() => {
                                        logger(`${index} - ${key}`);
                                        return true;
                                    });
                            })
                    } catch (err) {
                        logger(`${index} - err(${err.message})`, true);
                        return false;
                    }
                })
            );
            rows = rows + dataLength;
            await sleep(5000);
        }

        // Make catalog.pictures query
        query = {
            'pictures.url': {$exists: true, $regex: `^${config.aws.S3.buckets.pictureCatalog.alias}`},
            'pictures.thumb': {$exists: false}
        };

        // Get all catalog.pictures with wrong data
        while (true) {
            const data = await CatalogModel
                .find(query, 'pictures.url')
                .sort({createdAt: -1})
                .limit(limit);

            // Check limit
            const dataLength = data.length;
            if (dataLength === 0) {
                break;
            }
            await Promise.all(
                data.map(async (item, i) => {
                    const index = rows + i + 1;

                    // Make params
                    const {id, pictures} = item;
                    return await Promise.all(pictures.map(({url}, j) => {
                        try {
                            const key = url.replace(config.aws.S3.buckets.pictureCatalog.alias, '');
                            const params = {
                                FunctionName: 'createThumbPicture',
                                Payload: ""
                            };
                            const p = S3_PUT_SIMULATION_PARAMS;
                            p.Records[0].s3.object.key = key.startsWith('/') ? key.substr(1) : key;
                            params.Payload = JSON.stringify(p, null, 2);

                            // Call lambda
                            return lambda.invoke(params)
                                .promise()
                                .then(() => {

                                    // Save item data
                                    return CatalogModel.updateOne(
                                        {_id: id},
                                        {$set: {[`pictures.${j}.thumb`]: url.replace('/catalog-pictures/', '/catalog-pictures-thumb/')}}
                                    ).then(() => {
                                        logger(`${index} - ${key}`);
                                        return true;
                                    });
                                })
                        } catch (err) {
                            logger(`${index} - err(${err.message})`, true);
                            return false;
                        }
                    }));
                })
            );
            rows = rows + dataLength;
            await sleep(5000);
        }

        // Make catalog.mainMenus.mainPicture query
        query = {
            'mainMenus.mainPicture.url': {$exists: true, $regex: `^${config.aws.S3.buckets.pictureCatalog.alias}`},
            'mainMenus.mainPicture.thumb': {$exists: false}
        };

        // Get all catalog.mainMenus.mainPicture with wrong data
        while (true) {
            const data = await CatalogModel
                .find(query, 'mainMenus.mainPicture.url')
                .sort({createdAt: -1})
                .limit(limit);

            // Check limit
            const dataLength = data.length;
            if (dataLength === 0) {
                break;
            }
            await Promise.all(
                data.map(async (item, i) => {
                    const index = rows + i + 1;

                    // Make params
                    const {id, mainMenus} = item;
                    return await Promise.all(mainMenus.map(({mainPicture: {url}}, j) => {
                        try {
                            const key = url.replace(config.aws.S3.buckets.pictureCatalog.alias, '');
                            const params = {
                                FunctionName: 'createThumbPicture',
                                Payload: ""
                            };
                            const p = S3_PUT_SIMULATION_PARAMS;
                            p.Records[0].s3.object.key = key.startsWith('/') ? key.substr(1) : key;
                            params.Payload = JSON.stringify(p, null, 2);

                            // Call lambda
                            return lambda.invoke(params)
                                .promise()
                                .then(() => {

                                    // Save item data
                                    return CatalogModel.updateOne(
                                        {_id: id},
                                        {$set: {[`mainMenus.${j}.mainPicture.thumb`]: url.replace('/catalog-main-menus/', '/catalog-main-menus-thumb/')}}
                                    ).then(() => {
                                        logger(`${index} - ${key}`);
                                        return true;
                                    });
                                })
                        } catch (err) {
                            logger(`${index} - err(${err.message})`, true);
                            return false;
                        }
                    }));
                })
            );
            rows = rows + dataLength;
            await sleep(5000);
        }

        // Make catalog.mainSnacks.mainPicture query
        query = {
            'mainSnacks.mainPicture.url': {$exists: true, $regex: `^${config.aws.S3.buckets.pictureCatalog.alias}`},
            'mainSnacks.mainPicture.thumb': {$exists: false}
        };

        // Get all catalog.mainSnacks.mainPicture with wrong data
        while (true) {
            const data = await CatalogModel
                .find(query, 'mainSnacks.mainPicture.url')
                .sort({createdAt: -1})
                .limit(limit);

            // Check limit
            const dataLength = data.length;
            if (dataLength === 0) {
                break;
            }
            await Promise.all(
                data.map(async (item, i) => {
                    const index = rows + i + 1;

                    // Make params
                    const {id, mainSnacks} = item;
                    return await Promise.all(mainSnacks.map(({mainPicture: {url}}, j) => {
                        try {
                            const key = url.replace(config.aws.S3.buckets.pictureCatalog.alias, '');
                            const params = {
                                FunctionName: 'createThumbPicture',
                                Payload: ""
                            };
                            const p = S3_PUT_SIMULATION_PARAMS;
                            p.Records[0].s3.object.key = key.startsWith('/') ? key.substr(1) : key;
                            params.Payload = JSON.stringify(p, null, 2);

                            // Call lambda
                            return lambda.invoke(params)
                                .promise()
                                .then(() => {

                                    // Save item data
                                    return CatalogModel.updateOne(
                                        {_id: id},
                                        {$set: {[`mainSnacks.${j}.mainPicture.thumb`]: url.replace('/catalog-main-snacks/', '/catalog-main-snacks-thumb/')}}
                                    ).then(() => {
                                        logger(`${index} - ${key}`);
                                        return true;
                                    });
                                })
                        } catch (err) {
                            logger(`${index} - err(${err.message})`, true);
                            return false;
                        }
                    }));
                })
            );
            rows = rows + dataLength;
            await sleep(5000);
        }

        ////////////////////////////////////////////////////
        // Make reward.picture query
        query = {
            'picture.url': {$exists: true, $regex: `^${config.aws.S3.buckets.pictureCatalog.alias}`},
            'picture.thumb': {$exists: false}
        };

        // Get all reward.picture with wrong data
        while (true) {
            const data = await RewardModel
                .find(query, 'picture.url')
                .sort({createdAt: -1})
                .limit(limit);

            // Check limit
            const dataLength = data.length;
            if (dataLength === 0) {
                break;
            }
            await Promise.all(
                data.map((item, i) => {
                    const index = rows + i + 1;
                    try {

                        // Make params
                        const {id, picture: {url}} = item;
                        const key = url.replace(config.aws.S3.buckets.pictureCatalog.alias, '');
                        const params = {
                            FunctionName: 'createThumbPicture',
                            Payload: ""
                        };
                        const p = S3_PUT_SIMULATION_PARAMS;
                        p.Records[0].s3.object.key = key.startsWith('/') ? key.substr(1) : key;
                        params.Payload = JSON.stringify(p, null, 2);

                        // Call lambda
                        return lambda.invoke(params)
                            .promise()
                            .then(() => {

                                // Save item data
                                return RewardModel.findByIdAndUpdate(id, {'picture.thumb': url.replace('/reward/', '/reward-thumb/')})
                                    .then(() => {
                                        logger(`${index} - ${key}`);
                                        return true;
                                    });
                            })
                    } catch (err) {
                        logger(`${index} - err(${err.message})`, true);
                        return false;
                    }
                })
            );
            rows = rows + dataLength;
            await sleep(5000);
        }

        ////////////////////////////////////////////////////
        // Make news.picture query
        query = {
            'picture.url': {$exists: true, $regex: `^${config.aws.S3.buckets.pictureCatalog.alias}`},
            'picture.thumb': {$exists: false}
        };

        // Get all news.picture with wrong data
        while (true) {
            const data = await NewsModel
                .find(query, 'picture.url')
                .sort({createdAt: -1})
                .limit(limit);

            // Check limit
            const dataLength = data.length;
            if (dataLength === 0) {
                break;
            }
            await Promise.all(
                data.map((item, i) => {
                    const index = rows + i + 1;
                    try {

                        // Make params
                        const {id, picture: {url}} = item;
                        const key = url.replace(config.aws.S3.buckets.pictureCatalog.alias, '');
                        const params = {
                            FunctionName: 'createThumbPicture',
                            Payload: ""
                        };
                        const p = S3_PUT_SIMULATION_PARAMS;
                        p.Records[0].s3.object.key = key.startsWith('/') ? key.substr(1) : key;
                        params.Payload = JSON.stringify(p, null, 2);

                        // Call lambda
                        return lambda.invoke(params)
                            .promise()
                            .then(() => {

                                // Save item data
                                return NewsModel.findByIdAndUpdate(id, {'picture.thumb': url.replace('/news/', '/news-thumb/')})
                                    .then(() => {
                                        logger(`${index} - ${key}`);
                                        return true;
                                    });
                            })
                    } catch (err) {
                        logger(`${index} - err(${err.message})`, true);
                        return false;
                    }
                })
            );
            rows = rows + dataLength;
            await sleep(5000);
        }

        ////////////////////////////////////////////////////
        // Make promotion.picture query
        query = {
            'picture.url': {$exists: true, $regex: `^${config.aws.S3.buckets.pictureCatalog.alias}`},
            'picture.thumb': {$exists: false}
        };

        // Get all promotion.picture with wrong data
        while (true) {
            const data = await PromotionModel
                .find(query, 'picture.url')
                .sort({createdAt: -1})
                .limit(limit);

            // Check limit
            const dataLength = data.length;
            if (dataLength === 0) {
                break;
            }
            await Promise.all(
                data.map((item, i) => {
                    const index = rows + i + 1;
                    try {

                        // Make params
                        const {id, picture: {url}} = item;
                        const key = url.replace(config.aws.S3.buckets.pictureCatalog.alias, '');
                        const params = {
                            FunctionName: 'createThumbPicture',
                            Payload: ""
                        };
                        const p = S3_PUT_SIMULATION_PARAMS;
                        p.Records[0].s3.object.key = key.startsWith('/') ? key.substr(1) : key;
                        params.Payload = JSON.stringify(p, null, 2);

                        // Call lambda
                        return lambda.invoke(params)
                            .promise()
                            .then(() => {

                                // Save item data
                                return PromotionModel.findByIdAndUpdate(id, {'picture.thumb': url.replace('/promotion/', '/promotion-thumb/')})
                                    .then(() => {
                                        logger(`${index} - ${key}`);
                                        return true;
                                    });
                            })
                    } catch (err) {
                        logger(`${index} - err(${err.message})`, true);
                        return false;
                    }
                })
            );
            rows = rows + dataLength;
            await sleep(5000);
        }

        ////////////////////////////////////////////////////
        // Make profile.picture query
        query = {
            'picture.url': {$exists: true, $regex: `^${config.aws.S3.buckets.pictureCatalog.alias}`},
            'picture.thumb': {$exists: false}
        };

        // Get all profile.picture with wrong data
        while (true) {
            const data = await ProfileModel
                .find(query, 'picture.url')
                .sort({createdAt: -1})
                .limit(limit);

            // Check limit
            const dataLength = data.length;
            if (dataLength === 0) {
                break;
            }
            await Promise.all(
                data.map((item, i) => {
                    const index = rows + i + 1;
                    try {

                        // Make params
                        const {id, picture: {url}} = item;
                        const key = url.replace(config.aws.S3.buckets.pictureCatalog.alias, '');
                        const params = {
                            FunctionName: 'createThumbPicture',
                            Payload: ""
                        };
                        const p = S3_PUT_SIMULATION_PARAMS;
                        p.Records[0].s3.object.key = key.startsWith('/') ? key.substr(1) : key;
                        params.Payload = JSON.stringify(p, null, 2);

                        // Call lambda
                        return lambda.invoke(params)
                            .promise()
                            .then(() => {

                                // Save item data
                                return ProfileModel.findByIdAndUpdate(id, {'picture.thumb': url.replace('/profile/', '/profile-thumb/')})
                                    .then(() => {
                                        logger(`${index} - ${key}`);
                                        return true;
                                    });
                            })
                    } catch (err) {
                        logger(`${index} - err(${err.message})`, true);
                        return false;
                    }
                })
            );
            rows = rows + dataLength;
            await sleep(5000);
        }

        ////////////////////////////////////////////////////
        // Make sponsor.logo query
        query = {
            'logo.url': {$exists: true, $regex: `^${config.aws.S3.buckets.pictureCatalog.alias}`},
            'logo.thumb': {$exists: false}
        };

        // Get all sponsor.logo with wrong data
        while (true) {
            const data = await SponsorModel
                .find(query, 'logo.url')
                .sort({createdAt: -1})
                .limit(limit);

            // Check limit
            const dataLength = data.length;
            if (dataLength === 0) {
                logger(`ROW PROCESSED = ${rows}`);
                logger('#### FINISH PROCCESS ####');
                return Promise.resolve();
            }
            await Promise.all(
                data.map((item, i) => {
                    const index = rows + i + 1;
                    try {

                        // Make params
                        const {id, logo: {url}} = item;
                        const key = url.replace(config.aws.S3.buckets.pictureCatalog.alias, '');
                        const params = {
                            FunctionName: 'createThumbPicture',
                            Payload: ""
                        };
                        const p = S3_PUT_SIMULATION_PARAMS;
                        p.Records[0].s3.object.key = key.startsWith('/') ? key.substr(1) : key;
                        params.Payload = JSON.stringify(p, null, 2);

                        // Call lambda
                        return lambda.invoke(params)
                            .promise()
                            .then(() => {

                                // Save item data
                                return SponsorModel.findByIdAndUpdate(id, {'logo.thumb': url.replace('/sponsor/', '/sponsor-thumb/')})
                                    .then(() => {
                                        logger(`${index} - ${key}`);
                                        return true;
                                    });
                            })
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
