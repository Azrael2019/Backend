import mongoose from "mongoose";
import Model from "./_model";

const SettingSchema = new Model({
    key: {type: String, required: true},
    value: {type: String, required: true},
});

SettingSchema.index({key: 1}, {name: 'keyIdx', unique: true, partialFilterExpression: { deleted: false }});

export default mongoose.model('settings', SettingSchema);
