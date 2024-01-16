import config from "../configs/config";
import AWS from "aws-sdk";
import utilsLog from "./logger";
import FailedEmailModel from "../api/models/failedEmailModel";

const logger = utilsLog(__filename);

const options = {
    accessKeyId: config.aws.SES.accessKeyId,
    secretAccessKey: config.aws.SES.secretAccessKey,
    region: config.aws.SES.region,
    apiVersion: config.aws.SES.apiVersion
};

const ses = new AWS.SES(options);

const sendEmail = (toEmail, subject, bodyHtml, bodyText, replyTo, fromEmail = config.aws.SES.fromEmail) => {
    logger.debug(`sendEmail - args: toEmail(${toEmail}) subject(${subject}) bodyHtml bodyText replyTo(${replyTo})`);

    // Create sendEmail params
    const params = {
        Destination: {
            ToAddresses: [toEmail],
        },
        Message: {
            Body: {
                Html: {Charset: "UTF-8", Data: bodyHtml},
                Text: {Charset: "UTF-8", Data: bodyText},
            },
            Subject: {Charset: 'UTF-8', Data: subject},
        },
        Source: fromEmail,
        ReplyToAddresses: replyTo ? [replyTo] : undefined,
    };
    // Create the promise and SES service object
    return ses.sendEmail(params).promise()
        .then(function (data) {
            return {messageId: data.MessageId};
        })
        .catch(function (err) {
            const newFailedEmail = new FailedEmailModel({
                params,
                error: err
            });
            return newFailedEmail.save()
                .then(newFailedEmail => {
                    logger.error("Email not sent " + newFailedEmail.id);
                    return Promise.reject({error: {message: err.message, status: err.statusCode}});
                })
        });
};

const sendRawEmail = (file, destinations) => {
    logger.debug(`sendRawEmail - args: file(${file}) destinations(${destinations})`);

    const params = {
        Destinations: destinations,
        RawMessage: {Data: file},
    };

    return ses.sendRawEmail(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else return data;
    });

};

export default {
    sendEmail,
    sendRawEmail
};
