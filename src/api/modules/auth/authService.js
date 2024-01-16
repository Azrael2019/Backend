import utilsLog from "../../../helpers/logger";
import constants from "../../../helpers/constants";
import {rejectPromise} from "../../../helpers/response";
import {shortHash, uuidv4} from "../../../helpers/functions";
import UserModel from "../../models/userModel";
import profileService from "../profile/profileService";
import emailService from "../email/emailService";
import auth from "../../../configs/auth";
import mongoose from "mongoose";
import pushNotificationService from "../pushNotification/pushNotificationService";
import checkCaptcha from "../../../helpers/captcha";

const logger = utilsLog(__filename);

/*****************************************************************************
 ************** PUBLIC FUNCTIONS *********************************************
 *****************************************************************************/
const getUserById = id => {
    logger.debug(`getUserById - args: id(${id})`);
    return UserModel.findById(id);
};

const loginUser = userParam => {
    logger.debug(`loginUser - args: userParam(${JSON.stringify(userParam)})`);

    // Check required fields
    let validations = [];
    if (!userParam.username) validations.push('username');
    if (!userParam.password) validations.push('password');
    if (validations.length > 0) return rejectPromise.validation('User', validations);

    // Set variables
    const {username, password} = userParam;
    // TODO: ver que hago si el usuario esta mas de X dias en estado pendiente
    return UserModel.findOne({username: username, deleted: false, status: {$in: [constants.users.status.ACTIVE, constants.users.status.PENDING]}})
        .then(user => {
            if (user === null) {
                return rejectPromise.validation('User', null, constants.errors.kind.notFound);
            } else {
                // test a matching password
                return user.comparePassword(password)
                    .then(isMatch => {
                        if (isMatch) {

                            // Update last login
                            UserModel.findByIdAndUpdate(mongoose.Types.ObjectId(user.id), {lastLogin: new Date()}).exec();
                            return user;
                        } else {
                            return rejectPromise.validation('User', ['password'], constants.errors.kind.notMatch);
                        }
                    });
            }
        });
};

const loginOAuth2 = (profile, providerName) => {
    logger.debug(`loginOAuth2 - args: profile(${JSON.stringify(profile)}) providerName(${providerName})`);
    return UserModel.findOne({$or: [{username: profile.emails[0].value}, {providers: {name: providerName, id: profile.id}}]})
        .then(user => {

            // No user was found, lets create a new one
            if (!user) {
                const itemSave = {
                    name: `${profile.name.givenName}${profile.name.middleName ? ` ${profile.name.middleName}` : ''}`,
                    lastName: profile.name.familyName,
                    username: profile.emails[0].value,
                    password: `X${shortHash().toUpperCase()}${uuidv4()}123`.replace(/(.)\1{2,}/g, c => c[0]),
                    status: constants.users.status.ACTIVE,
                    role: constants.users.type.USER,
                    providers: [{
                        name: providerName,
                        id: profile.id,
                    }],
                };
                if (Array.isArray(profile.photos)) {
                    itemSave.picture = {url: profile.photos[0].value};
                }
                return signUp(itemSave, true).then(({user} = {}) => user);
            } else {

                // Update last login
                UserModel.findByIdAndUpdate(mongoose.Types.ObjectId(user.id), {lastLogin: new Date(), $addToSet: {providers: {name: providerName, id: profile.id}}}).exec();
                return user;
            }
        });
};

const signUp = async (itemSave, force) => {
    logger.debug(`signUp - args: itemSave(${JSON.stringify(itemSave)})`);

    // Check required fields
    let validations = [];
    if (!itemSave.username) validations.push('username');
    if (!itemSave.password) validations.push('password');
    if (!itemSave.name) validations.push('name');
    // TODO: RETROCOMPATIBILITY
    // if (!force && (!itemSave.recaptcha || !(await checkCaptcha(itemSave.recaptcha)))) validations.push('recaptcha');
    if (!force && (itemSave.recaptcha && !(await checkCaptcha(itemSave.recaptcha)))) validations.push('recaptcha');
    if (validations.length > 0) return rejectPromise.validation('User', validations);
    itemSave.email = itemSave.username;
    delete itemSave.recaptcha;

    // Create profile
    return profileService.create(itemSave)
        .then(profile => {
            profile = profile.toJSON();
            return getUserById(profile.user).then(user => {

                // Send email
                emailService[user.role === constants.users.type.MANAGER ? 'managerSignUp' : 'userSignUp'](
                    profile.name,
                    itemSave.link ? itemSave.link.replace(':hash', user.recoveryToken) : undefined,
                    itemSave.username,
                    profile.language
                ).then();
                return {user, profile}
            });
        })
        .catch(error => {
            if (11000 === error.code || 11001 === error.code) {
                return rejectPromise.validation('User', null, constants.errors.kind.exist);
            }
            throw error;
        });
};

const generateRecoveryUserByUsername = async userParam => {
    logger.debug(`generateRecoveryUserByUsername - args: userParam(${JSON.stringify(userParam)})`);

    // Check required fields
    let validations = [];
    if (!userParam.username) validations.push('username');
    // TODO: RETROCOMPATIBILITY
    // if (!userParam.recaptcha || !(await checkCaptcha(userParam.recaptcha))) validations.push('recaptcha');
    if (userParam.recaptcha && !(await checkCaptcha(userParam.recaptcha))) validations.push('recaptcha');
    if (!userParam.link) validations.push('link');
    if (validations.length > 0) return rejectPromise.validation('RecoveryUser', validations);
    delete userParam.recaptcha;

    // Check if user exists
    return UserModel.findOneAndUpdate({username: userParam.username, deleted: false, status: {$in: [constants.users.status.ACTIVE, constants.users.status.PENDING]}}, {recoveryToken: shortHash()}, {new: true})
        .then(user => {
            if (user) {
                return profileService.getOneByQuery({user: user.id, deleted: false})
                    .then(profile => {
                        if (profile) {
                            emailService.recoveryPassword(
                                profile.name,
                                userParam.link.replace(':hash', user.recoveryToken),
                                user.username,
                                profile.language,
                                user.role === constants.users.type.MANAGER
                            ).then();
                            return user;
                        }
                        return rejectPromise.validation('User', null, constants.errors.kind.notFound);
                    });
            }
            return rejectPromise.validation('User', null, constants.errors.kind.notFound);
        })
};

const changeUserPasswordByToken = data => {
    logger.debug(`changeUserPasswordByToken - args: token(${JSON.stringify(data)})`);

    // Check required fields
    let validations = [];
    if (!data.token) validations.push('token');
    if (!data.password) validations.push('password');
    if (validations.length > 0) return rejectPromise.validation('User', validations);

    // Check if user exists
    return UserModel.findOneAndUpdate({recoveryToken: data.token, deleted: false, status: {$in: [constants.users.status.ACTIVE, constants.users.status.PENDING]}}, {password: data.password, recoveryToken: null}, {new: true})
        .then(user => {
            if (!user) return rejectPromise.validation('User', ['token'], constants.errors.kind.invalid);
            emailService.passwordChanged(
                user.username,
                null,
                user.role === constants.users.type.MANAGER
            ).then();
            return user;
        })
};

const activate = token => {
    logger.debug(`activate - args: token(${token})`);

    // Check required fields
    let validations = [];
    if (!token) validations.push('token');
    if (validations.length > 0) return rejectPromise.validation('User', validations);

    // Check if user exists
    return UserModel.findOneAndUpdate({recoveryToken: token, status: constants.users.status.PENDING}, {status: constants.users.status.ACTIVE, recoveryToken: null}, {new: true})
        .then(user => {
            if (!user) return rejectPromise.validation('User', ['token'], constants.errors.kind.invalid);
            return profileService.getOneByQuery({user: user.id})
                .then(profile => {

                    // Send email
                    emailService.activateAccount(
                        profile.name,
                        user.username,
                        profile.language,
                        user.role === constants.users.type.MANAGER
                    ).then();

                    // Send notification
                    pushNotificationService.publish(profile.id, '¡Usuario Activado!', '¡Felicitaciones tu usuario ha sido activado!', {event: 'user.activated', data: {profileId: profile.id}});
                    return user;
                });
        })
};

const createUser = (user) => {

    const userIns = new UserModel(user);

    // Check required fields
    const error = userIns.validateSync();
    if (error) {
        return rejectPromise.validationMongoose('User', error)
    }

    // Create user
    return userIns.save({new: true})
        .catch(error => {
            if (11000 === error.code || 11001 === error.code) {
                return rejectPromise.validation('User', null, constants.errors.kind.exist);
            }
            throw error;
        });
};

const updateUser = (id, user) => {
    return UserModel.findByIdAndUpdate(id, user, {new: true, runValidators: true})
        .then(async user => {
            if (user.deleted || user.status === constants.users.status.BLOCKED) await auth.logout(user);
            return user;
        })
        .catch(error => rejectPromise.validationMongoose('User', error));
};

export default {
    loginUser,
    loginOAuth2,
    signUp,
    generateRecoveryUserByUsername,
    changeUserPasswordByToken,
    activate,
    getUserById,
    createUser,
    updateUser,
};
