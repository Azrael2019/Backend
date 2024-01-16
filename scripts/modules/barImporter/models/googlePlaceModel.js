import mongoose from "mongoose";
import Model from "../../../../src/api/models/_model";

const GooglePlaceSchema = new Model({
    importedId: {type: String, required: true},
    place: Object,
    detail: Object,
    picture: String,
});

GooglePlaceSchema.index({importedId: 1}, {name: 'importedIdIdx', unique: true, partialFilterExpression: {deleted: false}});

export default mongoose.model('imp-google-place', GooglePlaceSchema);
