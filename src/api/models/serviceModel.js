import mongoose from "mongoose";
import Model from "./_model";

const ServiceSchema = new Model({
    name: {type: String, required: true},
    icon: {type: String, required: true},
});

ServiceSchema.index({name: 1}, {name: 'nameIdx', unique: true, partialFilterExpression: {deleted: false}});
ServiceSchema.index({name: 'text'}, {name: 'text', default_language: 'spanish'});

export default mongoose.model('services', ServiceSchema);
