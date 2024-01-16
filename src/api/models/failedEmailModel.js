import mongoose from "mongoose";
import Model from "./_model";

const FailedEmailSchema = new Model({
    params: {},
    error: {}
});

export default mongoose.model('failed-emails', FailedEmailSchema);
