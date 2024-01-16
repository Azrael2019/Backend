import mongoose from "mongoose";
import Model from "./_model";
import constants from "../../helpers/constants";

const BookingSchema = new Model({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'profiles', required: true},
    promotion: {type: mongoose.Schema.Types.ObjectId, ref: 'promotions', required: true},
    catalog: {type: mongoose.Schema.Types.ObjectId, ref: 'catalogs', required: true},
    status: {
        type: String,
        required: true,
        enum: Object.values(constants.application.booking.status),
        default: constants.application.booking.status.PENDING
    },
    lastActionDate: Date,
    timeRange: {
        from: Date,
        to: Date,
    },
    free: {type: Boolean, default: false},
    isPrepaid: {type: Boolean, default: false},
    loyaltyCardRelation: {type: Boolean, default: false},
});

BookingSchema.index({user: 1}, {name: 'userIdx'});
BookingSchema.index({catalog: 1}, {name: 'catalogIdx'});

export default mongoose.model('bookings', BookingSchema);
