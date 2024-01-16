import mongoose from "mongoose";
import Model from "./_model";
import PictureModel from "./subModels/pictureModel";

const SponsorSchema = new Model({
    name: {type: String, required: true},
    logo: PictureModel,
});

SponsorSchema.index({name: 1}, {name: 'nameIdx', unique: true, partialFilterExpression: {deleted: false}});
SponsorSchema.index({name: 'text'}, {name: 'text', default_language: 'spanish'});

export default mongoose.model('sponsors', SponsorSchema);
