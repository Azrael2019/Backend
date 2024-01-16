import mongoose from "mongoose";
import bcrypt from "bcrypt";
import constants from "../../helpers/constants";
import Model from "./_model";
import ProviderModel from "./subModels/providerModel";

const validatePassword = (password) => {
    const validations = new mongoose.Error.ValidationError(null);
    if (password.length < 8) validations.addError('minLength', new mongoose.Error.ValidatorError({type: 'validation', message: 'minLength'}));
    if (password.length > 128) validations.addError('maxLength', new mongoose.Error.ValidatorError({type: 'validation', message: 'maxLength'}));
    if (/(.)\1{2,}/.test(password)) validations.addError('forbidRepeating', new mongoose.Error.ValidatorError({type: 'validation', message: 'forbidRepeating'}));
    if (!/[a-z]/.test(password)) validations.addError('oneLowercase', new mongoose.Error.ValidatorError({type: 'validation', message: 'oneLowercase'}));
    if (!/[A-Z]/.test(password)) validations.addError('oneUppercase', new mongoose.Error.ValidatorError({type: 'validation', message: 'oneUppercase'}));
    if (!/[0-9]/.test(password)) validations.addError('oneNumber', new mongoose.Error.ValidatorError({type: 'validation', message: 'oneNumber'}));
    // if (!/[^A-Za-z0-9]/.test(password)) validations.addError('oneSpecialCharacter', new mongoose.Error.ValidatorError({type: 'validation', message: 'oneSpecialCharacter'}));
    if (Object.keys(validations.errors).length > 0) throw validations;
    return true
}

const UserSchema = new Model({
    username: {type: String, required: true, lowercase: true, trim: true, match: [constants.regex.email, "Please fill a valid email address"]},
    password: {type: String, required: true, validate: validatePassword},
    status: {type: String, enum: Object.values(constants.users.status), required: true, default: constants.users.status.PENDING},
    role: {type: String, enum: Object.values(constants.users.type), required: true},
    recoveryToken: String,
    lastLogin: Date,
    lastPasswordChange: Date,
    providers: [ProviderModel],
});

UserSchema.pre('save', function (next) {
    let user = this;

    // only hash the password if it has been modified (or is new)
    if (user.isModified('password')) {
        try {
            const salt = bcrypt.genSaltSync();
            user.password = bcrypt.hashSync(user.password, salt);
            user.lastPasswordChange = new Date();
            next();
        } catch (error) {
            return next(error);
        }
    }
    next();
});
UserSchema.pre('findOneAndUpdate', function (next) {
    const password = this.getUpdate().password;
    if (password) {
        try {
            validatePassword(password);
        } catch (error) {
            const validate = new mongoose.Error.ValidationError(null);
            validate.addError('password', error);
            return next(validate);
        }
        try {
            const salt = bcrypt.genSaltSync();
            this.getUpdate().password = bcrypt.hashSync(password, salt);
            this.getUpdate().lastPasswordChange = new Date();
            next();
        } catch (error) {
            return next(error);
        }
    }
    next();
});

UserSchema.methods.comparePassword = function (password) {
    return bcrypt.compare(password, this.password);
};
UserSchema.options.toJSON = {
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        delete ret.__v;
        delete ret.deleted;
        return ret;
    }
};

UserSchema.index({username: 1}, {name: 'usernameIdx', unique: true, partialFilterExpression: {deleted: false}});
UserSchema.index({recoveryToken: 1}, {name: 'recoveryTokenIdx', sparse: true});

export default mongoose.model('users', UserSchema);
