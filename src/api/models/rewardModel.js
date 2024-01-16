import mongoose from "mongoose";
import Model from "./_model";
import PictureModel from "./subModels/pictureModel";

const RewardSchema = new Model({
    name: {type: String, required: true},
    description: String,
    picture: PictureModel,
    amount: {type: Number, required: true},
    points: {type: Number, required: true},
    reward: {type: Number, required: true},
});

RewardSchema.index({name: 1}, {name: 'nameIdx', unique: true, partialFilterExpression: {deleted: false}});
RewardSchema.index({name: 'text'}, {name: 'text', default_language: 'spanish'});

export default mongoose.model('rewards', RewardSchema);
