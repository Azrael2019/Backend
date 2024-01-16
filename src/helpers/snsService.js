import config from "../configs/config";
import AWS from "aws-sdk";
import utilsLog from "./logger";
import constants from "./constants";
import deviceService from "../api/modules/device/deviceService";

const logger = utilsLog(__filename);

const options = {
    accessKeyId: config.aws.SNS.accessKeyId,
    secretAccessKey: config.aws.SNS.secretAccessKey,
    region: config.aws.SNS.region,
};

const sns = new AWS.SNS(options);

const createPlatformEndpoint = (applicationArn, token, customData) => {
    logger.debug(`createPlatformEndpoint - args: applicationArn(${applicationArn}), token(${token})`);

    const params = {
        PlatformApplicationArn: applicationArn,
        Token: token,
        CustomUserData: customData,
    };

    return sns.createPlatformEndpoint(params).promise()
        .then(data => {
            return data.EndpointArn;
        })
        .catch(err => {
            return Promise.reject({message: err.message, code: 'sns.error', status: err.statusCode || 400});
        });
};

const deleteEndpoint = (awsARN) => {
    logger.debug(`deleteEndpoint - args: awsARN(${awsARN})`);

    const params = {
        EndpointArn: awsARN
    };

    return sns.deleteEndpoint(params).promise()
        .then(data => {
            return data.RequestId;
        })
        .catch(err => {
            return Promise.reject({message: err.message, code: 'sns.error', status: err.statusCode || 400});
        });
};

const getEndpointAttributes = (awsARN) => {
    logger.debug(`getEndpointAttributes - args: awsARN(${awsARN})`);

    const params = {
        EndpointArn: awsARN
    };
    return sns.getEndpointAttributes(params).promise()
        .then(data => {
            return data.Attributes;
        })
        .catch(err => {
            return Promise.reject({message: err.message, code: 'sns.error', status: err.statusCode || 400});
        });
};

const setEndpointAttributes = (awsARN, token, enabled, customData) => {
    logger.debug(`setEndpointAttributes - args: awsARN(${awsARN}), token(${token}), enabled(${enabled}), customData(${JSON.stringify(customData)})`);

    const params = {
        EndpointArn: awsARN,
        Attributes: {
            Token: token,
            Enabled: enabled,
            CustomUserData: customData,
        },
    };
    return sns.setEndpointAttributes(params).promise()
        .then(data => {
            return data.RequestId;
        })
        .catch(err => {
            return Promise.reject({message: err.message, code: 'sns.error', status: err.statusCode || 400});
        });
};

const publish = (awsARN, title, message, payload = {event: 'notification'}, deviceId) => {
    if (!awsARN || !message) {
        return Promise.reject({message: 'Must supply a TargetArn and Message to publish to a topic', code: 'sns.error', status: 400});
    }
    message = {
        default: message,
        APNS: JSON.stringify(Object.assign({}, {
            aps: {
                alert: {
                    title: title || constants.application.name,
                    body: message,
                },
                sound: 'default',
            },
        }, payload)),
        APNS_SANDBOX: JSON.stringify(Object.assign({}, {
            aps: {
                alert: {
                    title: title || constants.application.name,
                    body: message,
                },
                sound: 'default',
            },
        }, payload)),
        GCM: JSON.stringify({
            notification: {
                title: title || constants.application.name,
                body: message
            },
            data: payload
        }),
    };

    const params = {
        TargetArn: awsARN,
        Message: JSON.stringify(message),
        MessageStructure: 'json'
    };
    return sns.publish(params).promise()
        .then(data => {
            return data.MessageId;
        })
        .catch(err => {
            if (err.code && err.code === 'EndpointDisabled') deviceService.deleteById(deviceId, {role: constants.users.type.ADMIN}).then();
            return Promise.reject({message: err.message, code: 'sns.error', status: err.statusCode || 400});
        });
};

export default {
    createPlatformEndpoint,
    getEndpointAttributes,
    setEndpointAttributes,
    deleteEndpoint,
    publish,
};
