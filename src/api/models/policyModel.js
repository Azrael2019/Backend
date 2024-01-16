import mongoose from "mongoose";
import Model from "./_model";

const PolicySchema = new Model({
    title: {type: String, required: true},
    code: {type: String, lowercase: true, required: true},
    content: {type: String, required: true},
});

PolicySchema.index({code: 1}, {name: 'codeIdx', unique: true, partialFilterExpression: {deleted: false}});

export default mongoose.model('policies', PolicySchema);
