import mongoose from "mongoose";
import Model from "./_model";
import SubModel from "./_subModel";
import constants from "../../helpers/constants";

const PermissionSchema = new SubModel({
    feature: {type: String, required: true, enum: Object.values(constants.access.features)},
    accessType: {type: String, required: true, enum: Object.keys(constants.access.type)},
});

const RoleSchema = new Model({
    code: {type: String, required: true},
    name: {type: String, required: true},
    permissions: [{type: PermissionSchema, required: true}]
});

RoleSchema.index({code: 1}, {name: 'codeIdx', unique: true, partialFilterExpression: { deleted: false }});
RoleSchema.index({name: 1}, {name: 'nameIdx'});
RoleSchema.index({code: 'text', name: 'text'}, {name: 'text', default_language: 'spanish'});

export default mongoose.model('roles', RoleSchema);
