import SubModel from "../_subModel";
import constants from "../../../helpers/constants";

const LocationSchema = new SubModel({
    formattedAddress: {type: String, required: true, trim: true},
    address: {type: String, trim: true},
    country: {type: String, trim: true},
    community: {type: String, trim: true},
    state: {type: String, trim: true},
    city: {type: String, trim: true},
    zipCode: {type: String, trim: true, match: [constants.regex.zipCode, "Please fill a valid zip code"]},
    detail: {type: String, trim: true},
    geo: {
        type: {type: String, default: 'Point'},
        coordinates: {type: [Number], required: true} //[long, lat] https://docs.mongodb.com/manual/reference/geojson/#point
    },
});

LocationSchema.index({geo: '2dsphere'}, {name: 'geoIdx'});

export default LocationSchema;
