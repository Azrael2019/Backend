import mongoose from "mongoose";
import Model from "./_model";
import constants from "../../helpers/constants";

const BookingRewardSchema = new Model({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'profiles', required: true},
    catalog: {type: mongoose.Schema.Types.ObjectId, ref: 'catalogs'},
    reward: {type: mongoose.Schema.Types.ObjectId, ref: 'rewards', required: true},
    status: {
        type: String,
        required: true,
        enum: Object.values(constants.application.booking.status),
        default: constants.application.booking.status.PENDING
    },
    lastActionDate: Date,
});

BookingRewardSchema.index({user: 1}, {name: 'userIdx'});
BookingRewardSchema.index({catalog: 1}, {name: 'catalogIdx'});

export default mongoose.model('booking-rewards', BookingRewardSchema);
