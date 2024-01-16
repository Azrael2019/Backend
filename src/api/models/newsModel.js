import mongoose from "mongoose";
import Model from "./_model";
import PictureModel from "./subModels/pictureModel";
import constants from "../../helpers/constants";

const NewsSchema = new Model({
    title: {type: String, required: true},
    subtitle: {type: String, required: true},
    detail: {type: String},
    picture: {type: PictureModel, required: true},
    size: {type: Number, enum: [1, 2], required: true, default: 1},
    type: {type: String, enum: Object.values(constants.application.news.type), required: true, default: constants.application.news.type.GLOBAL},
});

NewsSchema.index({title: 1}, {name: 'titleIdx', unique: true, partialFilterExpression: {deleted: false}});
NewsSchema.index({title: 'text', subTitle: 'text'}, {name: 'text', default_language: 'spanish'});

export default mongoose.model('news', NewsSchema);
