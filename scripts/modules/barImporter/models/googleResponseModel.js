import mongoose from "mongoose";
import configMe from "../config";
import Model from "../../../../src/api/models/_model";

const GoogleResponseSchema = new Model({
    url: {type: String, required: true},
    statusCode: String,
    nextPageToken: String,
    errorMessage: String,
    results: [Object],
    status: {type: String, enum: Object.values(configMe.googleResponse.status), required: true, default: configMe.googleResponse.status.PENDING},
});

export default mongoose.model('imp-google-response', GoogleResponseSchema);
