import utilsLog from "../../../helpers/logger";
import ProfileModel from "../../models/profileModel";
import config from "../../../configs/config";
import Service from "../_service";
import authService from "../auth/authService";
import {rejectPromise} from "../../../helpers/response";
import constants from "../../../helpers/constants";
import {shortHash} from "../../../helpers/functions";
import catalogService from "../catalog/catalogService";

const logger = utilsLog(__filename);

class ProfileService extends Service {

    constructor() {
        super('Profile', ProfileModel, {attachments: [{bucket: config.aws.S3.buckets.pictureProfile}]});
    }

    create(itemSave, user) {
        logger.debug(`create - args: itemSave(${JSON.stringify(itemSave)})`);

        // Check required fields
        let validations = [];
        if (!itemSave.password) validations.push('password');
        if (!itemSave.email) validations.push('email');
        if (validations.length > 0) return rejectPromise.validation(this.modelName, validations);

        // Make user object
        const userSave = {
            username: itemSave.email,
            password: itemSave.password,
            role: itemSave.role || constants.users.type.USER,
            status: itemSave.status || constants.users.status.PENDING,
            providers: itemSave.providers,
            recoveryToken: shortHash(),
        };
        delete itemSave.providers;

        // Validate profile model
        itemSave.user = '000000000000000000000000';
        delete itemSave.createdAt;
        delete itemSave.deleted;
        let itemSaveTmp = new this.model(itemSave);

        // Check required fields
        const error = itemSaveTmp.validateSync();
        if (error) {
            return rejectPromise.validationMongoose(this.modelName, error)
        }

        // Create user
        return authService.createUser(userSave)
            .then(userNew => {
                itemSave.user = userNew.id;
                return super.create(itemSave, user)
            })
    }

    updateByQuery(query, itemSave) {
        return super.updateByQuery(query, itemSave)
            .then(async res => {
                if (itemSave.deleted !== undefined && itemSave.deleted === false) {
                    const profiles = await this.model.find(query, 'user');
                    profiles.map(({user}) => {
                        authService.updateUser(user, {deleted: false});
                    })
                }
                return res;
            })
    }

    updateById(id, itemSave, user) {
        logger.debug(`updateById - args: id(${id}), itemSave(${JSON.stringify(itemSave)})`);

        const {user: {status, role, password} = {}} = itemSave;
        if (role) itemSave.role = role;
        delete itemSave.user; // Prevent update this field
        if (!itemSave.picture || !itemSave.picture.url) delete itemSave.picture;

        return super.updateById(id, itemSave, user)
            .then(profile => {
                if (profile.user && (status !== undefined || role !== undefined || (password !== undefined && user.role === constants.users.type.ADMIN))) {
                    const data = {};
                    if (status !== undefined) data.status = status;
                    if (role !== undefined) data.role = role;
                    if (password !== undefined && user.role === constants.users.type.ADMIN) data.password = password;
                    authService.updateUser(profile.user, data);
                }
                return profile;
            })
    }

    deleteAccount(user) {
        return this.model.findByIdAndUpdate(user.profileId, {deleted: true}, {new: true, runValidators: true})
            .then(profile => {
                return authService.updateUser(user.id, {deleted: true})
                    .then(() => {
                        if (user.role === constants.users.type.MANAGER) {
                            catalogService.updateByQuery({manager: user.profileId}, {deleted: true}).exec();
                        }
                        return profile.id;
                    });
            });
    }
}

export default new ProfileService()
