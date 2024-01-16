import SubModel from "../_subModel";

const PictureSchema = new SubModel({
    url: {type: String, required: true},
    thumb: String,
    name: String,
    type: String,
    size: String,
});

PictureSchema.index({url: 1}, {name: 'urlIdx'});
PictureSchema.index({name: 1}, {name: 'nameIdx'});

export default PictureSchema;
