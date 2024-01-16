import utilsLog from "./logger";
import constants from "./constants";
import util from "util";

const logger = utilsLog(__filename);

const make = (message, code = 'unknown', success, result, extra) => {
    if (result) {
        return {success, result};
    } else {
        return {success, code, message, extra};
    }
};

const parseValidationMongoose = (entity, error) => {
    let validation = {};
    const parseError = (entity, error) => {
        const errors = error.reason && error.reason.errors ? error.reason.errors : error.errors;
        Object.keys(errors).map(key => {
            const item = errors[key];
            if (item.errors || (item.reason && item.reason.errors)) {
                parseError(`${entity}.${key}`, item);
            } else {
                const normalizeKey = key.split('.');
                const kind = item.kind.toLowerCase();
                switch (kind) {
                    case 'user defined':
                        if (item.message.endsWith('non existing ID')) {
                            validation[`${entity.toLowerCase()}.${normalizeKey[0].toLowerCase()}.${constants.errors.kind.invalid}`] = item.message;
                        } else if (item.message.endsWith('one default value')) {
                            validation[`${entity.toLowerCase()}.${normalizeKey[0].toLowerCase()}.${constants.errors.kind.oneDefault}`] = item.message;
                        } else if (item.message.endsWith('already exists')) {
                            validation[`${entity.toLowerCase()}.${normalizeKey[0].toLowerCase()}.${constants.errors.kind.exist}`] = item.message;
                        } else {
                            validation[`${entity.toLowerCase()}.${normalizeKey[0].toLowerCase()}.${constants.errors.kind.empty}`] = item.message;
                        }
                        break;
                    case 'objectid':
                        validation[`${entity.toLowerCase()}.${normalizeKey.filter(i => !isFinite(i)).join('.').toLowerCase()}.${constants.errors.kind.invalid}`] = item.message;
                        break;
                    default:
                        validation[`${entity.toLowerCase()}.${normalizeKey.filter(i => !isFinite(i)).join('.').toLowerCase()}.${kind}`] = item.message;
                }
            }
        });
    };
    parseError(entity, error);
    return Object.keys(validation);
};

export const rejectPromise = {
    flat: (entity, params, kind = constants.errors.kind.required, message) => Promise.reject({
        message,
        code: constants.messages.validation.code,
        extra: params ? params.map(path => `${entity.toLowerCase()}.${(path.value || path).toLowerCase()}.${path.kind || kind}`) : [`${entity.toLowerCase()}.${kind}`]
    }),
    validation: (entity, params, kind = constants.errors.kind.required) => Promise.reject({
        message: util.format(constants.messages.validation.text, entity),
        code: constants.messages.validation.code,
        extra: params ? params.map(path => `${entity.toLowerCase()}.${(path.value || path).toLowerCase()}.${path.kind || kind}`) : [`${entity.toLowerCase()}.${kind}`]
    }),
    validationMongoose: (entity, error) => Promise.reject({
        message: util.format(constants.messages.validation.text, entity),
        code: constants.messages.validation.code,
        extra: parseValidationMongoose(entity, error)
    }),
};

export default {
    success: (result, code, message) => {
        if (result instanceof Object) {
            return make(message || [], code, true, result);
        } else {
            return make(result, code, true);
        }
    },
    error: (error, user) => {
        logger.error(error.message);
        if ((!user || !user.role || user.role !== constants.users.type.ADMIN) && (!error.code || error.code === 'unknown')) {
            return make('Unknown error :(', error.code, false);
        } else {
            return make(error.message, error.code, false, undefined, error.extra);
        }
    }
};
