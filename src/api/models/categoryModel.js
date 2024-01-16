import mongoose from "mongoose";
import Model from "./_model";

const CategorySchema = new Model({
    name: {type: String, required: true}
});

CategorySchema.index({name: 1}, {name: 'nameIdx', unique: true, partialFilterExpression: {deleted: false}});
CategorySchema.index({name: 'text'}, {name: 'text', default_language: 'spanish'});

export default mongoose.model('categories', CategorySchema);
