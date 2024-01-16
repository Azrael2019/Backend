import config from "../configs/config";
import AWS from "aws-sdk";
import utilsLog from "./logger";
import contentDisposition from "content-disposition";
import {uuidv4} from "./functions";
import path from "path";

const logger = utilsLog(__filename);

const options = {
    accessKeyId: config.aws.S3.accessKeyId,
    secretAccessKey: config.aws.S3.secretAccessKey,
    region: config.aws.S3.region,
    apiVersion: config.aws.S3.apiVersion
};

const s3 = new AWS.S3(options);

const uploadFileBase64 = (base64File, {bucket: {name: bucketName, alias: bucketAlias, folder: bucketFolder} = {}, prefix}, fileName) => {
    logger.debug(`uploadFileBase64 - args: prefix(${prefix}) bucketName(${bucketName}) bucketAlias(${bucketAlias}) bucketFolder(${bucketFolder})`);

    // Get header and data from base 64
    let [base64Header, base64Data] = base64File.split(',');
    let contentType;
    if (!base64Data) {
        base64Data = base64Header;
    } else {
        contentType = base64Header.substring(5, base64Header.indexOf(';'));
    }
    const buf = new Buffer(base64Data, 'base64');
    const prefixName = prefix ? prefix + '-' : '';
    const key = makeName(`${bucketFolder}/${prefixName}${uuidv4()}`, fileName);
    return new Promise(function (resolve, reject) {
        s3.putObject({
            Bucket: bucketName,
            Key: key,
            Body: buf,
            ContentEncoding: 'base64',
            ContentType: contentType,
            ContentDisposition: fileName ? contentDisposition(fileName, {fallback: encodeURIComponent(fileName)}) : undefined,
            ACL: 'public-read',
        }, function (err) {
            if (err) {
                // an error occurred
                logger.error(err.message);
                return reject(err);
            }
            const url = buildAWSUrl(bucketAlias, bucketName, key);
            const thumb = (contentType && contentType.indexOf('image') !== -1) ? url.replace(bucketFolder, `${bucketFolder}-thumb`) : undefined;
            return resolve({
                url,
                type: contentType,
                key,
                thumb,
            });
        });
    });
};

const buildAWSUrl = (bucketAlias, bucketName, key) => {
    return bucketAlias ? `${bucketAlias}/${key}` : `https://s3-${config.aws.S3.region}.amazonaws.com/${bucketName}/${key}`;
};

const makeName = (key, fileName) => {
    try {
        return `${key}${path.extname(fileName)}`;
    } catch (ignore) {
        return key;
    }
};

export default {
    uploadFileBase64,
};
