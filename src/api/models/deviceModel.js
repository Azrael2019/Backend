import mongoose from "mongoose";
import constants from "../../helpers/constants";
import Model from "./_model";

const DeviceSchema = new Model({
    awsARN: {type: String, required: true},
    type: {type: String, enum: Object.values(constants.devices.type)},
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'profiles', required: true},
    isClient: {type: Boolean, default: false},
    token: {type: String, required: true},
});

DeviceSchema.index({name: 1}, {name: 'nameIdx'});
DeviceSchema.index({name: 'text', lastName: 'text'}, {name: 'text', default_language: 'spanish'});

export default mongoose.model('devices', DeviceSchema);
