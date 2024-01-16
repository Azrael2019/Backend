import mongoose from "mongoose";
import constants from "../../helpers/constants";
import Model from "./_model";
import PictureModel from "./subModels/pictureModel";
import BillingModel from "./subModels/billingModel";

const ProfileSchema = new Model({
    name: {type: String, required: true, trim: true, match: [constants.regex.name, "Please fill a valid name"]},
    lastName: {type: String, trim: true, match: [constants.regex.name, "Please fill a valid lastname"]},
    picture: PictureModel,
    email: {type: String, required: true, lowercase: true, match: [constants.regex.email, "Please fill a valid email address"]},
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true},
    birthdate: Date,
    zipCode: {type: String, trim: true, match: [constants.regex.zipCode, "Please fill a valid zip code"]},
    phoneNumber: {type: String, trim: true, match: [constants.regex.phone, "Please fill a valid phone number"]},
    gender: {type: String, enum: Object.values(constants.users.gender)},
    role: {type: String, enum: Object.values(constants.users.type), required: true},
    language: {type: String, enum: Object.values(constants.users.language), default: constants.users.language.es},
    billing: BillingModel,
    extra: Object
});

ProfileSchema.index({name: 1}, {name: 'nameIdx'});
ProfileSchema.index({name: 'text', lastName: 'text'}, {name: 'text', default_language: 'spanish'});

export default mongoose.model('profiles', ProfileSchema);
