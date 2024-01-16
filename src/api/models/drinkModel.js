import mongoose from "mongoose";
import Model from "./_model";

const DrinkSchema = new Model({
    name: {type: String, required: true},
    icon: {type: String, required: true},
});

DrinkSchema.index({name: 1}, {name: 'nameIdx', unique: true, partialFilterExpression: {deleted: false}});
DrinkSchema.index({name: 'text'}, {name: 'text', default_language: 'spanish'});

export default mongoose.model('drinks', DrinkSchema);
